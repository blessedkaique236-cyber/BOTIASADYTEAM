import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Environment } from '../../src/config/env.js';

let parseEnvironment: (source: NodeJS.ProcessEnv) => Environment;
beforeAll(async () => {
  vi.stubEnv('DISCORD_TOKEN', 'test-token');
  vi.stubEnv('DISCORD_CLIENT_ID', '123456789012345678');
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('LOG_LEVEL', 'silent');
  ({ parseEnvironment } = await import('../../src/config/env.js'));
});
describe('parseEnvironment', () => {
  it('parses valid configuration and applies defaults', () => {
    const parsed = parseEnvironment({
      DISCORD_TOKEN: 'test-token',
      DISCORD_CLIENT_ID: '123456789012345678',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    });
    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.APP_NAME).toBe('BOOM QUEUE SYSTEM');
    expect(parsed.LOG_LEVEL).toBe('silent');
    expect(Object.isFrozen(parsed)).toBe(true);
  });
  it('rejects missing required credentials and database URL', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'test' })).toThrow(/DISCORD_TOKEN.*obrigatório/);
    expect(() => parseEnvironment({ DISCORD_TOKEN: 'x', DISCORD_CLIENT_ID: 'id' })).toThrow(/DATABASE_URL/);
  });
  it('rejects unsupported log levels', () => {
    expect(() => parseEnvironment({
      DISCORD_TOKEN: 'test-token',
      DISCORD_CLIENT_ID: '123456789012345678',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      LOG_LEVEL: 'verbose',
    })).toThrow(/LOG_LEVEL/);
  });
});
