import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    application: env.APP_NAME,
    environment: env.NODE_ENV,
  },
  redact: {
    paths: [
      'DISCORD_TOKEN',
      'token',
      'authorization',
      'password',
      '*.token',
      '*.password',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
