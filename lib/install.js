import * as p from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  OPENCODE_CONFIG_DIR,
  AGENTS_DIR,
  LEARN_AGENT_PATH,
  DEFAULT_COLOR,
  COLOR_OPTIONS,
  MODEL_OPTIONS,
  isValidHexColor,
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
 * Install the Learn agent
 * @param {object} options - CLI options
 */
export async function install(options) {
  const isInteractive = options.tui !== false;

  p.intro(pc.bgCyan(pc.black(' opencode-learn ')));

  // Check if OpenCode config directory exists
  if (!existsSync(OPENCODE_CONFIG_DIR)) {
    p.log.warning(`OpenCode config directory not found at ${OPENCODE_CONFIG_DIR}`);
    p.log.info('Creating directory...');
    mkdirSync(OPENCODE_CONFIG_DIR, { recursive: true });
  }

  // Create agents directory if it doesn't exist
  if (!existsSync(AGENTS_DIR)) {
    mkdirSync(AGENTS_DIR, { recursive: true });
  }

  // Check if Learn agent already exists
  if (existsSync(LEARN_AGENT_PATH)) {
    if (isInteractive) {
      const overwrite = await p.confirm({
        message: 'Learn agent already exists. Do you want to overwrite it?',
        initialValue: false,
      });

      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel('Installation cancelled.');
        process.exit(0);
      }
    } else {
      p.log.warning('Learn agent already exists. Overwriting...');
    }
  }

  let selectedModel = options.model || '';
  let selectedColor = options.color || DEFAULT_COLOR;

  if (isInteractive) {
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
      initialValue: '',
    });

    if (p.isCancel(modelChoice)) {
      p.cancel('Installation cancelled.');
      process.exit(0);
    }

    if (modelChoice === '__custom__') {
      const customModel = await p.text({
        message: 'Enter the model identifier (e.g., anthropic/claude-sonnet-4)',
        placeholder: 'provider/model-name',
        validate: (value) => {
          if (!value) return 'Model identifier is required';
          if (!value.includes('/')) return 'Model should be in format: provider/model-name';
          return undefined;
        },
      });

      if (p.isCancel(customModel)) {
        p.cancel('Installation cancelled.');
        process.exit(0);
      }

      selectedModel = customModel;
    } else {
      selectedModel = modelChoice;
    }

    // Color selection
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
      initialValue: DEFAULT_COLOR,
    });

    if (p.isCancel(colorChoice)) {
      p.cancel('Installation cancelled.');
      process.exit(0);
    }

    if (colorChoice === '__custom__') {
      const customColor = await p.text({
        message: 'Enter the hex color (e.g., #14B8A6)',
        placeholder: '#14B8A6',
        validate: (value) => {
          if (!value) return 'Color is required';
          if (!isValidHexColor(value)) return 'Invalid hex color format. Use #RRGGBB';
          return undefined;
        },
      });

      if (p.isCancel(customColor)) {
        p.cancel('Installation cancelled.');
        process.exit(0);
      }

      selectedColor = customColor;
    } else {
      selectedColor = colorChoice;
    }
  } else {
    // Validate CLI-provided color
    if (options.color && !isValidHexColor(options.color)) {
      p.log.error(`Invalid hex color: ${options.color}. Use format #RRGGBB`);
      process.exit(1);
    }
  }

  // Read the template
  const templatePath = getTemplatePath();
  if (!existsSync(templatePath)) {
    p.log.error(`Template not found at ${templatePath}`);
    process.exit(1);
  }

  const s = p.spinner();
  s.start('Installing Learn agent...');

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

    // Write the agent file
    writeFileSync(LEARN_AGENT_PATH, content, 'utf-8');

    s.stop('Learn agent installed successfully!');

    p.note(
      `${pc.dim('Location:')} ${LEARN_AGENT_PATH}\n` +
      `${pc.dim('Color:')} ${selectedColor}\n` +
      (selectedModel ? `${pc.dim('Model:')} ${selectedModel}` : `${pc.dim('Model:')} OpenCode default`),
      'Configuration'
    );

    p.outro(pc.green('Start OpenCode and press Tab to select the "Learn" agent.'));
  } catch (error) {
    s.stop('Installation failed');
    p.log.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
