import * as p from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, unlinkSync } from 'fs';
import { LEARN_AGENT_PATH } from './utils.js';

/**
 * Uninstall the Learn agent
 * @param {object} options - CLI options
 */
export async function uninstall(options) {
  p.intro(pc.bgCyan(pc.black(' opencode-learn ')));

  // Check if Learn agent exists
  if (!existsSync(LEARN_AGENT_PATH)) {
    p.log.warning('Learn agent is not installed.');
    p.outro('Nothing to uninstall.');
    process.exit(0);
  }

  // Confirm uninstallation
  if (!options.force) {
    const confirm = await p.confirm({
      message: 'Are you sure you want to remove the Learn agent?',
      initialValue: false,
    });

    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Uninstallation cancelled.');
      process.exit(0);
    }
  }

  const s = p.spinner();
  s.start('Removing Learn agent...');

  try {
    unlinkSync(LEARN_AGENT_PATH);
    s.stop('Learn agent removed successfully!');
    p.outro(pc.green('The Learn agent has been uninstalled.'));
  } catch (error) {
    s.stop('Uninstallation failed');
    p.log.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
