import winston from 'winston';
import { config } from './config/index.js';

/**
 * 構造化ログ(JSON)。本番運用診断(Phase 11)対応。
 * ログレベルはNODE_ENVから決定(development: debug、それ以外: info)。
 * API_KEY・GOOGLE_SERVICE_ACCOUNT_JSON等の機密値はどのログ呼び出しにも渡していないため、
 * 専用のマスキング処理は設けていない(そもそも出力対象に含めない設計)。
 */
export const logger = winston.createLogger({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'dx-support-tool-backend' },
  transports: [new winston.transports.Console()],
});
