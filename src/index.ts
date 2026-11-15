import { Client, Events, GatewayIntentBits } from 'discord.js';
import { env } from './config/env.js';
import { logger } from './core/logger.js';
import { handleCommand } from './discord/commands.js';
import { connectDatabase, disconnectDatabase } from './infrastructure/database.js';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.once(Events.ClientReady, (ready) => {
    logger.info({ user: ready.user.tag, guilds: ready.guilds.cache.size }, 'BOOM QUEUE SYSTEM conectado ao Discord');
  });
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await handleCommand(interaction);
    } catch (error: unknown) {
      logger.error({ err: error, command: interaction.commandName }, 'Falha ao processar interação');
      if (interaction.isRepliable()) {
        const payload = { content: 'Erro interno. Tente novamente mais tarde.', ephemeral: true };
        const reply = interaction.deferred || interaction.replied
          ? interaction.followUp(payload)
          : interaction.reply(payload);
        await reply.catch((replyError: unknown) => logger.warn({ err: replyError }, 'Falha ao responder interação'));
      }
    }
  });
  client.on(Events.Error, (error) => logger.error({ err: error }, 'Erro no cliente Discord'));
  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Encerrando BOOM QUEUE SYSTEM');
    client.destroy();
    await disconnectDatabase();
  };
  process.once('SIGINT', () => { void shutdown('SIGINT').finally(() => process.exit(0)); });
  process.once('SIGTERM', () => { void shutdown('SIGTERM').finally(() => process.exit(0)); });
  await client.login(env.DISCORD_TOKEN);
}
bootstrap().catch(async (error: unknown) => {
  logger.fatal({ err: error }, 'Falha fatal durante inicialização');
  await disconnectDatabase().catch(() => undefined);
  process.exitCode = 1;
});
