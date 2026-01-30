import * as p from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  OPENCODE_CONFIG_DIR,
  OPENCODE_AGENTS_DIR,
  OPENCODE_LEARN_AGENT_PATH,
  COPILOT_AGENTS_DIR,
  COPILOT_LEARN_AGENT_PATH,
  CLAUDECODE_AGENTS_DIR,
  CLAUDECODE_LEARN_AGENT_PATH,
  DEFAULT_COLOR,
  COLOR_OPTIONS,
  MODEL_OPTIONS,
  PLATFORM_OPTIONS,
  isValidHexColor,
  updateFrontmatter,
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to the OpenCode agent template
 */
function getOpenCodeTemplatePath() {
  return join(__dirname, '..', 'agents', 'learn.md');
}

/**
 * Get the path to the GitHub Copilot agent template
 */
function getCopilotTemplatePath() {
  return join(__dirname, '..', 'agents', 'learn.copilot.md');
}

/**
 * Get the path to the Claude Code agent template
 */
function getClaudeCodeTemplatePath() {
  return join(__dirname, '..', 'agents', 'learn.claude.md');
}

/**
 * Install the Learn agent for OpenCode
 */
async function installOpenCode(options, isInteractive) {
  let selectedModel = options.model || '';
  let selectedColor = options.color || DEFAULT_COLOR;

  // Check if OpenCode config directory exists
  if (!existsSync(OPENCODE_CONFIG_DIR)) {
    p.log.info('Creating OpenCode config directory...');
    mkdirSync(OPENCODE_CONFIG_DIR, { recursive: true });
  }

  // Create agents directory if it doesn't exist
  if (!existsSync(OPENCODE_AGENTS_DIR)) {
    mkdirSync(OPENCODE_AGENTS_DIR, { recursive: true });
  }

  // Check if Learn agent already exists
  if (existsSync(OPENCODE_LEARN_AGENT_PATH)) {
    if (isInteractive) {
      const overwrite = await p.confirm({
        message: 'OpenCode Learn agent already exists. Overwrite?',
        initialValue: false,
      });

      if (p.isCancel(overwrite) || !overwrite) {
        p.log.warning('Skipping OpenCode installation.');
        return false;
      }
    } else {
      p.log.warning('OpenCode Learn agent already exists. Overwriting...');
    }
  }

  if (isInteractive && !options.model) {
    // Model selection
    const modelChoice = await p.select({
      message: 'Select a model for OpenCode (optional)',
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
      return false;
    }

    if (modelChoice === '__custom__') {
      const customModel = await p.text({
        message: 'Enter the model identifier (e.g., anthropic/claude-sonnet-4)',
        placeholder: 'provider/model-name',
        validate: (value) => {
          if (!value) return undefined; // Allow empty
          if (!value.includes('/')) return 'Model should be in format: provider/model-name';
          return undefined;
        },
      });

      if (p.isCancel(customModel)) {
        return false;
      }

      selectedModel = customModel || '';
    } else {
      selectedModel = modelChoice;
    }
  }

  if (isInteractive && !options.color) {
    // Color selection
    const colorChoice = await p.select({
      message: 'Select a color for OpenCode',
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
      return false;
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
        return false;
      }

      selectedColor = customColor;
    } else {
      selectedColor = colorChoice;
    }
  } else if (options.color && !isValidHexColor(options.color)) {
    p.log.error(`Invalid hex color: ${options.color}. Use format #RRGGBB`);
    return false;
  }

  // Read the template
  const templatePath = getOpenCodeTemplatePath();
  if (!existsSync(templatePath)) {
    p.log.error(`OpenCode template not found at ${templatePath}`);
    return false;
  }

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
  writeFileSync(OPENCODE_LEARN_AGENT_PATH, content, 'utf-8');

  return { model: selectedModel, color: selectedColor };
}

/**
 * Install the Learn agent for GitHub Copilot
 */
async function installCopilot(isInteractive) {
  // Create .github/agents directory if it doesn't exist
  if (!existsSync(COPILOT_AGENTS_DIR)) {
    mkdirSync(COPILOT_AGENTS_DIR, { recursive: true });
  }

  // Check if Learn agent already exists
  if (existsSync(COPILOT_LEARN_AGENT_PATH)) {
    if (isInteractive) {
      const overwrite = await p.confirm({
        message: 'GitHub Copilot Learn agent already exists. Overwrite?',
        initialValue: false,
      });

      if (p.isCancel(overwrite) || !overwrite) {
        p.log.warning('Skipping GitHub Copilot installation.');
        return false;
      }
    } else {
      p.log.warning('GitHub Copilot Learn agent already exists. Overwriting...');
    }
  }

  // Read the template
  const templatePath = getCopilotTemplatePath();
  if (!existsSync(templatePath)) {
    p.log.error(`GitHub Copilot template not found at ${templatePath}`);
    return false;
  }

  const content = readFileSync(templatePath, 'utf-8');

  // Write the agent file
  writeFileSync(COPILOT_LEARN_AGENT_PATH, content, 'utf-8');

  return true;
}

/**
 * Install the Learn agent for Claude Code
 */
async function installClaudeCode(isInteractive) {
  // Create ~/.claude/agents directory if it doesn't exist
  if (!existsSync(CLAUDECODE_AGENTS_DIR)) {
    mkdirSync(CLAUDECODE_AGENTS_DIR, { recursive: true });
  }

  // Check if Learn agent already exists
  if (existsSync(CLAUDECODE_LEARN_AGENT_PATH)) {
    if (isInteractive) {
      const overwrite = await p.confirm({
        message: 'Claude Code Learn agent already exists. Overwrite?',
        initialValue: false,
      });

      if (p.isCancel(overwrite) || !overwrite) {
        p.log.warning('Skipping Claude Code installation.');
        return false;
      }
    } else {
      p.log.warning('Claude Code Learn agent already exists. Overwriting...');
    }
  }

  // Read the template
  const templatePath = getClaudeCodeTemplatePath();
  if (!existsSync(templatePath)) {
    p.log.error(`Claude Code template not found at ${templatePath}`);
    return false;
  }

  const content = readFileSync(templatePath, 'utf-8');

  // Write the agent file
  writeFileSync(CLAUDECODE_LEARN_AGENT_PATH, content, 'utf-8');

  return true;
}

/**
 * Install the Learn agent
 * @param {object} options - CLI options
 */
export async function install(options) {
  const isInteractive = options.tui !== false;

  p.intro(pc.bgCyan(pc.black(' nudge ')));

  // Determine which platforms to install
  let platforms = [];

  if (options.all) {
    platforms = ['opencode', 'copilot', 'claudecode'];
  } else if (options.opencode || options.copilot || options.claudecode) {
    // Specific platform flags provided
    if (options.opencode) platforms.push('opencode');
    if (options.copilot) platforms.push('copilot');
    if (options.claudecode) platforms.push('claudecode');
  } else if (isInteractive) {
    // Interactive platform selection
    const platformChoice = await p.select({
      message: 'Which platform(s) do you want to install for?',
      options: PLATFORM_OPTIONS.map(opt => ({
        value: opt.value,
        label: opt.label,
        hint: opt.hint,
      })),
      initialValue: 'all',
    });

    if (p.isCancel(platformChoice)) {
      p.cancel('Installation cancelled.');
      process.exit(0);
    }

    if (platformChoice === 'all') {
      platforms = ['opencode', 'copilot', 'claudecode'];
    } else {
      platforms = [platformChoice];
    }
  } else {
    // Non-interactive without flags defaults to all
    platforms = ['opencode', 'copilot', 'claudecode'];
  }

  const s = p.spinner();
  const results = {
    opencode: null,
    copilot: null,
    claudecode: null,
  };

  // Install for OpenCode
  if (platforms.includes('opencode')) {
    const openCodeResult = await installOpenCode(options, isInteractive);
    if (openCodeResult === false) {
      // User cancelled or error
    } else {
      results.opencode = openCodeResult;
    }
  }

  // Install for GitHub Copilot
  if (platforms.includes('copilot')) {
    s.start('Installing GitHub Copilot agent...');
    const copilotResult = await installCopilot(isInteractive);
    if (copilotResult) {
      results.copilot = true;
      s.stop('GitHub Copilot agent installed.');
    } else {
      s.stop('GitHub Copilot installation skipped.');
    }
  }

  // Install for Claude Code
  if (platforms.includes('claudecode')) {
    s.start('Installing Claude Code agent...');
    const claudeCodeResult = await installClaudeCode(isInteractive);
    if (claudeCodeResult) {
      results.claudecode = true;
      s.stop('Claude Code agent installed.');
    } else {
      s.stop('Claude Code installation skipped.');
    }
  }

  // Show results
  const installed = [];
  if (results.opencode) {
    installed.push(`${pc.dim('OpenCode:')} ${OPENCODE_LEARN_AGENT_PATH}`);
    if (results.opencode.color) {
      installed.push(`  ${pc.dim('Color:')} ${results.opencode.color}`);
    }
    if (results.opencode.model) {
      installed.push(`  ${pc.dim('Model:')} ${results.opencode.model}`);
    } else {
      installed.push(`  ${pc.dim('Model:')} OpenCode default`);
    }
  }
  if (results.copilot) {
    installed.push(`${pc.dim('GitHub Copilot:')} ${COPILOT_LEARN_AGENT_PATH}`);
  }
  if (results.claudecode) {
    installed.push(`${pc.dim('Claude Code:')} ${CLAUDECODE_LEARN_AGENT_PATH}`);
  }

  if (installed.length > 0) {
    p.note(installed.join('\n'), 'Installed');
    p.outro(pc.green('Learn agent installed successfully!'));
  } else {
    p.outro(pc.yellow('No agents were installed.'));
  }
}
