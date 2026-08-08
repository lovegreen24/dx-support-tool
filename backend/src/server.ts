import { createApp } from './app.js';
import { config } from './config/index.js';

const app = createApp();

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on port ${config.port} (${config.nodeEnv})`);
});

/**
 * SIGTERM受信時に新規接続を止めつつ、既存処理の完了を待つ。
 * 8秒でタイムアウトした場合は強制終了する(要件定義 5.セキュリティ要件のグレースフルシャットダウン仕様)。
 */
function gracefulShutdown(signal: string): void {
  // eslint-disable-next-line no-console
  console.log(`[backend] received ${signal}, shutting down gracefully...`);

  const forceExitTimer = setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error('[backend] graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, config.shutdownTimeoutMs);

  server.close((err) => {
    clearTimeout(forceExitTimer);
    if (err) {
      // eslint-disable-next-line no-console
      console.error('[backend] error during shutdown', err);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
