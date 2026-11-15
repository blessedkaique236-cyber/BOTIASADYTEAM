import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../../src/config/env.js';

const validEnvironment = {
  NODE_ENV: 'test',
  APP_NAME: 'BOOM QUEUE SYSTEM',
  LOG_LEVEL: 'silent',
  DISCORD_TOKEN: 'test-token',
  DISCORD_CLIENT_ID: '123456789012345678',
};

describe('parseEnvironment', () => {
  it('parses valid configuration and applies defaults', () => {
    const parsed = parseEnvironment({
      DISCORD_TOKEN: validEnvironment.DISCORD_TOKEN,
      DISCORD_CLIENT_ID: validEnvironment.DISCORD_CLIENT_ID,
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    });

    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.APP_NAME).toBe('BOOM QUEUE SYSTEM');
    expect(parsed.LOG_LEVEL).toBe('silent');
    expect(Object.isFrozen(parsed)).toBe(true);
  });

  it('rejects missing required Discord credentials', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'test' })).toThrow(
      /DISCORD_TOKEN.*obrigatório/,
    );
  });

  it('rejects unsupported log levels', () => {
    expect(() =>
      parseEnvironment({
        DISCORD_TOKEN: validEnvironment.DISCORD_TOKEN,
        DISCORD_CLIENT_ID: validEnvironment.DISCORD_CLIENT_ID,
        LOG_LEVEL: 'verbose',
      }),
    ).toThrow(/LOG_LEVEL/);
  });
});
