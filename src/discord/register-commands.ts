import { REST, Routes } from 'discord.js';
import { env } from '../config/env.js';
import { logger } from '../core/logger.js';
import { commandDefinitions } from './commands.js';

async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  const route = env.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID)
    : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

  await rest.put(route, { body: commandDefinitions });
  logger.info(
    { scope: env.DISCORD_GUILD_ID ? 'guild' : 'global', commands: commandDefinitions.length },
    'Comandos de aplicação registrados',
  );
}

registerCommands().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Não foi possível registrar os comandos do Discord');
  process.exitCode = 1;
});
