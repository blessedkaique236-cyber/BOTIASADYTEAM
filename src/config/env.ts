import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().min(1).default('BOOM QUEUE SYSTEM'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DISCORD_TOKEN: z.string({ error: 'DISCORD_TOKEN é obrigatório' }).min(1, 'DISCORD_TOKEN é obrigatório'),
  DISCORD_CLIENT_ID: z.string({ error: 'DISCORD_CLIENT_ID é obrigatório' }).min(1, 'DISCORD_CLIENT_ID é obrigatório'),
  DISCORD_GUILD_ID: z.string().optional(),
  DATABASE_URL: z.string({ error: 'DATABASE_URL é obrigatório' }).min(1, 'DATABASE_URL é obrigatório'),
});
export type Environment = z.infer<typeof envSchema>;
export function parseEnvironment(source: NodeJS.ProcessEnv): Environment {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${details}`);
  }
  return Object.freeze(parsed.data);
}
export const env = parseEnvironment(process.env);
