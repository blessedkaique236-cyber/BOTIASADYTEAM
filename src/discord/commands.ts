import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import { queueService, QueueError, type Queue } from '../modules/queue/queue-service.js';

export const commandDefinitions = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica se o BOOM QUEUE SYSTEM está respondendo.'),
  new SlashCommandBuilder()
    .setName('fila-criar')
    .setDescription('Cria uma nova fila neste servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option.setName('nome').setDescription('Nome da fila').setRequired(true).setMaxLength(40),
    )
    .addIntegerOption((option) =>
      option
        .setName('limite')
        .setDescription('Máximo de participantes (2 a 100)')
        .setMinValue(2)
        .setMaxValue(100),
    ),
  new SlashCommandBuilder()
    .setName('fila-entrar')
    .setDescription('Entra em uma fila aberta.')
    .addStringOption((option) =>
      option.setName('nome').setDescription('Nome da fila').setRequired(true).setMaxLength(40),
    ),
  new SlashCommandBuilder()
    .setName('fila-sair')
    .setDescription('Sai de uma fila que ainda não começou.')
    .addStringOption((option) =>
      option.setName('nome').setDescription('Nome da fila').setRequired(true).setMaxLength(40),
    ),
  new SlashCommandBuilder()
    .setName('fila-listar')
    .setDescription('Mostra as filas deste servidor.'),
  new SlashCommandBuilder()
    .setName('fila-iniciar')
    .setDescription('Inicia uma fila (requer Gerenciar servidor).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option.setName('nome').setDescription('Nome da fila').setRequired(true).setMaxLength(40),
    ),
  new SlashCommandBuilder()
    .setName('fila-encerrar')
    .setDescription('Encerra uma fila (requer Gerenciar servidor).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option.setName('nome').setDescription('Nome da fila').setRequired(true).setMaxLength(40),
    ),
].map((command) => command.toJSON()) satisfies RESTPostAPIChatInputApplicationCommandsJSONBody[];

function formatQueue(queue: Queue): string {
  const players =
    queue.players.length > 0
      ? queue.players.map((player, index) => `**${index + 1}.** <@${player.userId}>`).join('\n')
      : '_Nenhum participante ainda._';
  return [
    `**${queue.name}** — ${queue.status === 'waiting' ? 'Aguardando' : queue.status === 'running' ? 'Em andamento' : 'Encerrada'}`,
    `Participantes: ${queue.players.length}/${queue.maxPlayers}`,
    players,
  ].join('\n');
}

export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'Este comando só pode ser usado dentro de um servidor.', ephemeral: true });
    return;
  }

  if (interaction.commandName === 'ping') {
    await interaction.reply({ content: `Pong! Latência: ${interaction.client.ws.ping} ms.`, ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const guildId = interaction.guildId;
    const name = interaction.options.getString('nome');
    let message: string;

    switch (interaction.commandName) {
      case 'fila-criar': {
        const queue = queueService.create({
          guildId,
          name: interaction.options.getString('nome', true),
          ownerId: interaction.user.id,
          maxPlayers: interaction.options.getInteger('limite') ?? 10,
        });
        message = `Fila criada!\n${formatQueue(queue)}`;
        break;
      }
      case 'fila-entrar': {
        const queue = queueService.join(guildId, name ?? '', {
          userId: interaction.user.id,
          username: interaction.user.username,
        });
        message = `Você entrou na fila!\n${formatQueue(queue)}`;
        break;
      }
      case 'fila-sair': {
        const queue = queueService.leave(guildId, name ?? '', interaction.user.id);
        message = `Você saiu da fila.\n${formatQueue(queue)}`;
        break;
      }
      case 'fila-listar': {
        const queues = queueService.list(guildId);
        message = queues.length
          ? queues.map(formatQueue).join('\n\n')
          : 'Ainda não há filas neste servidor.';
        break;
      }
      case 'fila-iniciar': {
        const queue = queueService.start(guildId, name ?? '');
        message = `Fila iniciada!\n${formatQueue(queue)}`;
        break;
      }
      case 'fila-encerrar': {
        const queue = queueService.finish(guildId, name ?? '');
        message = `Fila encerrada.\n${formatQueue(queue)}`;
        break;
      }
      default:
        message = 'Comando não reconhecido.';
    }

    await interaction.editReply({ content: message });
  } catch (error: unknown) {
    const message = error instanceof QueueError ? error.message : 'Ocorreu um erro inesperado ao processar a fila.';
    await interaction.editReply({ content: message });
  }
}
