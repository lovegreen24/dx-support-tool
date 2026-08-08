import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './logger.js';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info('backend listening', { port: config.port, nodeEnv: config.nodeEnv });
});

/**
 * SIGTERM受信時に新規接続を止めつつ、既存処理の完了を待つ。
 * 8秒でタイムアウトした場合は強制終了する(要件定義 5.セキュリティ要件のグレースフルシャットダウン仕様)。
 */
function gracefulShutdown(signal: string): void {
  logger.info('received shutdown signal', { signal });

  const forceExitTimer = setTimeout(() => {
    logger.error('graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, config.shutdownTimeoutMs);

  server.close((err) => {
    clearTimeout(forceExitTimer);
    if (err) {
      logger.error('error during shutdown', { error: err.message });
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
