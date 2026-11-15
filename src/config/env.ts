import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().min(1).default('BOOM QUEUE SYSTEM'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN é obrigatório'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID é obrigatório'),
  DISCORD_GUILD_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`Configuração de ambiente inválida:\n${details}`);
}

export const env = Object.freeze(parsed.data);
export type Environment = typeof env;
