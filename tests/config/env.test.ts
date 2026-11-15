import { beforeAll, describe, expect, it, vi } from 'vitest';

let parseEnvironment: typeof import('../../src/config/env.js').parseEnvironment;

beforeAll(async () => {
  vi.stubEnv('DISCORD_TOKEN', 'test-token');
  vi.stubEnv('DISCORD_CLIENT_ID', '123456789012345678');
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('LOG_LEVEL', 'silent');
  ({ parseEnvironment } = await import('../../src/config/env.js'));
});

describe('parseEnvironment', () => {
  it('parses valid configuration and applies defaults', () => {
    const parsed = parseEnvironment({
      DISCORD_TOKEN: 'test-token',
      DISCORD_CLIENT_ID: '123456789012345678',
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
        DISCORD_TOKEN: 'test-token',
        DISCORD_CLIENT_ID: '123456789012345678',
        LOG_LEVEL: 'verbose',
      }),
    ).toThrow(/LOG_LEVEL/);
  });
});
