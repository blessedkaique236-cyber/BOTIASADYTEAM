import { Client, Events, GatewayIntentBits } from 'discord.js';
import { env } from './config/env.js';
import { logger } from './core/logger.js';
import { handleCommand } from './discord/commands.js';

async function bootstrap(): Promise<void> {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info(
      { user: readyClient.user.tag, guilds: readyClient.guilds.cache.size },
      'BOOM QUEUE SYSTEM conectado ao Discord',
    );
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
      await handleCommand(interaction);
    } catch (error: unknown) {
      logger.error({ err: error, command: interaction.commandName }, 'Falha ao processar interação');
      if (interaction.isRepliable()) {
        const response = { content: 'Ocorreu um erro interno. Tente novamente mais tarde.', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(response).catch((replyError: unknown) => {
            logger.warn({ err: replyError }, 'Não foi possível enviar a resposta de erro');
          });
        } else {
          await interaction.reply(response).catch((replyError: unknown) => {
            logger.warn({ err: replyError }, 'Não foi possível enviar a resposta de erro');
          });
        }
      }
    }
  });

  client.on(Events.Error, (error) => {
    logger.error({ err: error }, 'Erro no cliente Discord');
  });

  process.once('SIGINT', () => {
    logger.info('Encerrando por SIGINT');
    client.destroy();
  });
  process.once('SIGTERM', () => {
    logger.info('Encerrando por SIGTERM');
    client.destroy();
  });

  await client.login(env.DISCORD_TOKEN);
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Falha fatal durante a inicialização');
  process.exitCode = 1;
});
