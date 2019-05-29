import chalk from 'chalk';

export function panic(err: Error, exitCode = 1) {
  console.error(chalk.redBright(`[Fatal] ${err.message}`));
  console.error(err.stack);
  process.exitCode = exitCode;
}
