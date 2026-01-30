#!/usr/bin/env node

import { program } from 'commander';
import { install } from '../lib/install.js';
import { uninstall } from '../lib/uninstall.js';
import { update } from '../lib/update.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

program
  .name('opencode-learn')
  .description('Learn Agent for OpenCode - AI-powered coding mentor that guides with questions, not answers')
  .version(pkg.version);

program
  .command('install')
  .description('Install the Learn agent')
  .option('--no-tui', 'Non-interactive mode with defaults')
  .option('--model <model>', 'Model to use (e.g., anthropic/claude-sonnet-4)')
  .option('--color <hex>', 'Agent color in hex format (e.g., #14B8A6)')
  .action(install);

program
  .command('uninstall')
  .description('Remove the Learn agent')
  .option('--force', 'Skip confirmation prompt')
  .action(uninstall);

program
  .command('update')
  .description('Update the Learn agent to the latest version')
  .option('--preserve-config', 'Keep existing model and color settings')
  .action(update);

program.parse();
