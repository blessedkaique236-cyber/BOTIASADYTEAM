import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import { queueService, QueueError, type Queue } from '../modules/queue/queue-service.js';

const queueName = () => (option: import('discord.js').SlashCommandStringOption) =>
  option.setName('nome').setDescription('Nome da fila').setRequired(true).setMaxLength(40);
const admin = PermissionFlagsBits.ManageGuild;
export const commandDefinitions = [
  new SlashCommandBuilder().setName('ping').setDescription('Verifica se o BOOM QUEUE SYSTEM está respondendo.'),
  new SlashCommandBuilder().setName('fila-criar').setDescription('Cria uma nova fila neste servidor.')
    .setDefaultMemberPermissions(admin).addStringOption(queueName())
    .addIntegerOption((o) => o.setName('limite').setDescription('Máximo de participantes (2 a 100)').setMinValue(2).setMaxValue(100)),
  new SlashCommandBuilder().setName('fila-entrar').setDescription('Entra em uma fila aberta.').addStringOption(queueName()),
  new SlashCommandBuilder().setName('fila-sair').setDescription('Sai de uma fila que ainda não começou.').addStringOption(queueName()),
  new SlashCommandBuilder().setName('fila-listar').setDescription('Mostra as filas abertas e em andamento.'),
  new SlashCommandBuilder().setName('fila-iniciar').setDescription('Inicia uma fila (requer Gerenciar servidor).')
    .setDefaultMemberPermissions(admin).addStringOption(queueName()),
  new SlashCommandBuilder().setName('fila-encerrar').setDescription('Encerra uma fila (requer Gerenciar servidor).')
    .setDefaultMemberPermissions(admin).addStringOption(queueName()),
].map((command) => command.toJSON()) satisfies RESTPostAPIChatInputApplicationCommandsJSONBody[];

function formatQueue(queue: Queue): string {
  const players = queue.players.length
    ? queue.players.map((p, i) => `**${i + 1}.** <@${p.userId}>`).join('\n')
    : '_Nenhum participante ainda._';
  const status = queue.status === 'waiting' ? 'Aguardando' : queue.status === 'running' ? 'Em andamento' : 'Encerrada';
  return [`**${queue.name}** — ${status}`, `Participantes: ${queue.players.length}/${queue.maxPlayers}`, players].join('\n');
}
function requireAdmin(interaction: ChatInputCommandInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
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
  if (['fila-criar', 'fila-iniciar', 'fila-encerrar'].includes(interaction.commandName) && !requireAdmin(interaction)) {
    await interaction.reply({ content: 'Você precisa da permissão Gerenciar servidor para isso.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    const guildId = interaction.guildId;
    const name = interaction.options.getString('nome') ?? '';
    let message: string;
    switch (interaction.commandName) {
      case 'fila-criar': {
        const q = await queueService.create({ guildId, name, ownerId: interaction.user.id, maxPlayers: interaction.options.getInteger('limite') ?? 10 });
        message = `Fila criada!\n${formatQueue(q)}`; break;
      }
      case 'fila-entrar': {
        const q = await queueService.join(guildId, name, { userId: interaction.user.id, username: interaction.user.username });
        message = `Você entrou na fila!\n${formatQueue(q)}`; break;
      }
      case 'fila-sair': {
        const q = await queueService.leave(guildId, name, interaction.user.id);
        message = `Você saiu da fila.\n${formatQueue(q)}`; break;
      }
      case 'fila-listar': {
        const queues = await queueService.list(guildId);
        message = queues.length ? queues.map(formatQueue).join('\n\n') : 'Ainda não há filas neste servidor.';
        break;
      }
      case 'fila-iniciar': {
        const q = await queueService.start(guildId, name);
        message = `Fila iniciada!\n${formatQueue(q)}`; break;
      }
      case 'fila-encerrar': {
        const q = await queueService.finish(guildId, name);
        message = `Fila encerrada.\n${formatQueue(q)}`; break;
      }
      default: message = 'Comando não reconhecido.';
    }
    await interaction.editReply({ content: message });
  } catch (error: unknown) {
    const message = error instanceof QueueError ? error.message : 'Erro inesperado ao processar a fila.';
    if (error instanceof QueueError) {
      await interaction.editReply({ content: message });
    } else {
      throw error;
    }
  }
}
