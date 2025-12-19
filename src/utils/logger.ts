import ora, { Ora } from 'ora';
import chalk from 'chalk';

class Logger {
  spinner: Ora | null = null;

  /**
   * 普通信息（蓝色）
   */
  info(message: string, hiddenIcon?: boolean): void {
    console.log(chalk.blue(`${hiddenIcon ? '' : 'ℹ '}${message}`));
  }

  /**
   * 成功信息（绿色）
   */
  success(message: string): void {
    console.log(chalk.green('✔', message));
  }

  /**
   * 警告信息（黄色）
   */
  warning(message: string): void {
    console.log(chalk.yellow('⚠', message));
  }

  /**
   * 错误信息（红色）
   */
  error(message: string): void {
    console.log(chalk.red('✖', message));
  }

  /**
   * 开始loading动画
   */
  startSpinner(message: string): void {
    this.spinner = ora(message).start();
  }

  /**
   * 停止loading动画
   */
  stopSpinner(success: boolean, message: string): void {
    if (!this.spinner) {
      return;
    }

    if (success) {
      this.spinner.succeed(message);
    } else {
      this.spinner.fail(message);
    }

    this.spinner = null;
  }

  /**
   * 获取 spinner 状态（用于测试）
   */
  getSpinnerStatus(): boolean {
    return this.spinner !== null;
  }

  /**
   * 清理 spinner（用于测试）
   */
  clearSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
}

export const logger = new Logger();
