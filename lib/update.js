import * as p from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  LEARN_AGENT_PATH,
  DEFAULT_COLOR,
  COLOR_OPTIONS,
  MODEL_OPTIONS,
  isValidHexColor,
  parseFrontmatter,
  updateFrontmatter,
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to the agent template
 */
function getTemplatePath() {
  return join(__dirname, '..', 'agents', 'learn.md');
}

/**
 * Update the Learn agent to the latest version
 * @param {object} options - CLI options
 */
export async function update(options) {
  p.intro(pc.bgCyan(pc.black(' opencode-learn ')));

  // Check if Learn agent exists
  if (!existsSync(LEARN_AGENT_PATH)) {
    p.log.warning('Learn agent is not installed.');
    p.log.info('Run `bunx opencode-learn install` to install it first.');
    p.outro('Update cancelled.');
    process.exit(0);
  }

  // Read current configuration
  const currentContent = readFileSync(LEARN_AGENT_PATH, 'utf-8');
  const { frontmatter: currentConfig } = parseFrontmatter(currentContent);

  let selectedModel = '';
  let selectedColor = DEFAULT_COLOR;

  if (options.preserveConfig) {
    // Preserve existing configuration
    selectedModel = currentConfig.model || '';
    selectedColor = currentConfig.color?.replace(/"/g, '') || DEFAULT_COLOR;
    
    p.log.info('Preserving existing configuration:');
    p.log.info(`  Model: ${selectedModel || 'OpenCode default'}`);
    p.log.info(`  Color: ${selectedColor}`);
  } else {
    // Interactive mode - ask for new configuration
    const useExisting = await p.confirm({
      message: 'Do you want to keep your current model and color settings?',
      initialValue: true,
    });

    if (p.isCancel(useExisting)) {
      p.cancel('Update cancelled.');
      process.exit(0);
    }

    if (useExisting) {
      selectedModel = currentConfig.model || '';
      selectedColor = currentConfig.color?.replace(/"/g, '') || DEFAULT_COLOR;
    } else {
      // Model selection
      const modelChoice = await p.select({
        message: 'Select a model for the Learn agent',
        options: [
          ...MODEL_OPTIONS.map(opt => ({
            value: opt.value,
            label: opt.label,
            hint: opt.hint,
          })),
          { value: '__custom__', label: 'Enter custom model' },
        ],
        initialValue: currentConfig.model || '',
      });

      if (p.isCancel(modelChoice)) {
        p.cancel('Update cancelled.');
        process.exit(0);
      }

      if (modelChoice === '__custom__') {
        const customModel = await p.text({
          message: 'Enter the model identifier (e.g., anthropic/claude-sonnet-4)',
          placeholder: 'provider/model-name',
          initialValue: currentConfig.model || '',
          validate: (value) => {
            if (!value) return undefined; // Allow empty for default
            if (!value.includes('/')) return 'Model should be in format: provider/model-name';
            return undefined;
          },
        });

        if (p.isCancel(customModel)) {
          p.cancel('Update cancelled.');
          process.exit(0);
        }

        selectedModel = customModel;
      } else {
        selectedModel = modelChoice;
      }

      // Color selection
      const currentColorValue = currentConfig.color?.replace(/"/g, '') || DEFAULT_COLOR;
      const colorChoice = await p.select({
        message: 'Select a color for the Learn agent',
        options: [
          ...COLOR_OPTIONS.map(opt => ({
            value: opt.value,
            label: opt.label,
            hint: opt.hint,
          })),
          { value: '__custom__', label: 'Enter custom hex color' },
        ],
        initialValue: currentColorValue,
      });

      if (p.isCancel(colorChoice)) {
        p.cancel('Update cancelled.');
        process.exit(0);
      }

      if (colorChoice === '__custom__') {
        const customColor = await p.text({
          message: 'Enter the hex color (e.g., #14B8A6)',
          placeholder: '#14B8A6',
          initialValue: currentColorValue,
          validate: (value) => {
            if (!value) return 'Color is required';
            if (!isValidHexColor(value)) return 'Invalid hex color format. Use #RRGGBB';
            return undefined;
          },
        });

        if (p.isCancel(customColor)) {
          p.cancel('Update cancelled.');
          process.exit(0);
        }

        selectedColor = customColor;
      } else {
        selectedColor = colorChoice;
      }
    }
  }

  // Read the template
  const templatePath = getTemplatePath();
  if (!existsSync(templatePath)) {
    p.log.error(`Template not found at ${templatePath}`);
    process.exit(1);
  }

  const s = p.spinner();
  s.start('Updating Learn agent...');

  try {
    let content = readFileSync(templatePath, 'utf-8');

    // Update frontmatter with selected options
    const updates = {
      color: `"${selectedColor}"`,
    };

    if (selectedModel) {
      updates.model = selectedModel;
    }

    content = updateFrontmatter(content, updates);

    // Write the updated agent file
    writeFileSync(LEARN_AGENT_PATH, content, 'utf-8');

    s.stop('Learn agent updated successfully!');

    p.note(
      `${pc.dim('Location:')} ${LEARN_AGENT_PATH}\n` +
      `${pc.dim('Color:')} ${selectedColor}\n` +
      (selectedModel ? `${pc.dim('Model:')} ${selectedModel}` : `${pc.dim('Model:')} OpenCode default`),
      'Configuration'
    );

    p.outro(pc.green('Learn agent has been updated to the latest version.'));
  } catch (error) {
    s.stop('Update failed');
    p.log.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
