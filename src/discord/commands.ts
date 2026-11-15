import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import { env } from '../config/env.js';
import { auditService } from '../modules/audit/audit-service.js';
import { matchmakingService, MatchmakingError } from '../modules/matchmaking/matchmaking-service.js';
import { queueService, QueueError, type Queue } from '../modules/queue/queue-service.js';
import { statisticsService } from '../modules/statistics/statistics-service.js';
import { teamService, TeamError, type TeamView } from '../modules/teams/team-service.js';
import { ticketService, TicketError } from '../modules/tickets/ticket-service.js';

const queueName = () => (option: import('discord.js').SlashCommandStringOption) =>
  option.setName('nome').setDescription('Nome da fila').setRequired(true).setMaxLength(40);
const teamName = () => (option: import('discord.js').SlashCommandStringOption) =>
  option.setName('nome').setDescription('Nome da equipe').setRequired(true).setMaxLength(32);
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
  new SlashCommandBuilder().setName('fila-stats').setDescription('Mostra estatísticas deste servidor.'),
  new SlashCommandBuilder().setName('equipe-criar').setDescription('Cria uma equipe e define você como líder.')
    .addStringOption(teamName()).addIntegerOption((o) => o.setName('limite').setDescription('Máximo de membros (2 a 20)').setMinValue(2).setMaxValue(20)),
  new SlashCommandBuilder().setName('equipe-entrar').setDescription('Entra em uma equipe existente.').addStringOption(teamName()),
  new SlashCommandBuilder().setName('equipe-sair').setDescription('Sai de uma equipe.').addStringOption(teamName()),
  new SlashCommandBuilder().setName('equipe-listar').setDescription('Lista as equipes deste servidor.'),
  new SlashCommandBuilder().setName('match-gerar').setDescription('Sorteia duas equipes equilibradas a partir de uma fila iniciada.')
    .setDefaultMemberPermissions(admin).addStringOption((o) => o.setName('fila').setDescription('Nome da fila iniciada').setRequired(true).setMaxLength(40)),
  new SlashCommandBuilder().setName('ticket-abrir').setDescription('Abre um ticket privado com a equipe de suporte.')
    .addStringOption((o) => o.setName('assunto').setDescription('Descreva brevemente o motivo').setRequired(true).setMaxLength(100)),
  new SlashCommandBuilder().setName('ticket-fechar').setDescription('Fecha o ticket no canal atual.'),
  new SlashCommandBuilder().setName('audit-recentes').setDescription('Mostra os últimos registros administrativos.')
    .setDefaultMemberPermissions(admin),
].map((command) => command.toJSON()) satisfies RESTPostAPIChatInputApplicationCommandsJSONBody[];

function formatQueue(queue: Queue): string {
  const players = queue.players.length
    ? queue.players.slice(0, 25).map((p, i) => `**${i + 1}.** <@${p.userId}>`).join('\n')
    : '_Nenhum participante ainda._';
  const status = queue.status === 'waiting' ? 'Aguardando' : queue.status === 'running' ? 'Em andamento' : 'Encerrada';
  const suffix = queue.players.length > 25 ? `\n… e mais ${queue.players.length - 25} participantes.` : '';
  return [`**${queue.name}** — ${status}`, `Participantes: ${queue.players.length}/${queue.maxPlayers}`, players + suffix].join('\n');
}
function formatTeam(team: TeamView): string {
  return `**${team.name}** — ${team.members.length}/${team.maxMembers}\nLíder: <@${team.ownerId}>\n` +
    (team.members.length ? team.members.map((member) => `• <@${member.userId}>`).join('\n') : 'Sem membros');
}
function requireAdmin(interaction: ChatInputCommandInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}
async function sendConfiguredChannel(interaction: ChatInputCommandInteraction, channelId: string | undefined, content: string): Promise<void> {
  if (!channelId || !interaction.guild) return;
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (channel?.type === ChannelType.GuildText) await channel.send({ content }).catch(() => undefined);
}

export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({ content: 'Este comando só pode ser usado dentro de um servidor.', ephemeral: true });
    return;
  }
  if (interaction.commandName === 'ping') {
    await interaction.reply({ content: `Pong! Latência: ${interaction.client.ws.ping} ms.`, ephemeral: true });
    return;
  }
  const adminCommands = ['fila-criar', 'fila-iniciar', 'fila-encerrar', 'match-gerar', 'audit-recentes'];
  if (adminCommands.includes(interaction.commandName) && !requireAdmin(interaction)) {
    await interaction.reply({ content: 'Você precisa da permissão Gerenciar servidor para isso.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    const guildId = interaction.guildId;
    const name = interaction.options.getString('nome') ?? '';
    let message = 'Comando não reconhecido.';
    switch (interaction.commandName) {
      case 'fila-criar': {
        const q = await queueService.create({ guildId, name, ownerId: interaction.user.id, maxPlayers: interaction.options.getInteger('limite') ?? 10 });
        message = `Fila criada!\n${formatQueue(q)}`;
        await sendConfiguredChannel(interaction, env.ANNOUNCEMENT_CHANNEL_ID, `📋 Nova fila **${q.name}** criada. Use /fila-entrar para participar.`);
        break;
      }
      case 'fila-entrar': {
        const q = await queueService.join(guildId, name, { userId: interaction.user.id, username: interaction.user.username });
        message = `Você entrou na fila!\n${formatQueue(q)}`;
        break;
      }
      case 'fila-sair': {
        const q = await queueService.leave(guildId, name, interaction.user.id);
        message = `Você saiu da fila.\n${formatQueue(q)}`;
        break;
      }
      case 'fila-listar': {
        const queues = await queueService.list(guildId);
        message = queues.length ? queues.slice(0, 5).map(formatQueue).join('\n\n').slice(0, 1900) : 'Ainda não há filas neste servidor.';
        if (queues.length > 5) message += `\n\n… e mais ${queues.length - 5} filas.`;
        break;
      }
      case 'fila-iniciar': {
        const q = await queueService.start(guildId, name);
        message = `Fila iniciada!\n${formatQueue(q)}`;
        await sendConfiguredChannel(interaction, env.ANNOUNCEMENT_CHANNEL_ID, `🚀 A fila **${q.name}** foi iniciada.`);
        break;
      }
      case 'fila-encerrar': {
        const q = await queueService.finish(guildId, name);
        message = `Fila encerrada.\n${formatQueue(q)}`;
        await sendConfiguredChannel(interaction, env.ANNOUNCEMENT_CHANNEL_ID, `🏁 A fila **${q.name}** foi encerrada.`);
        break;
      }
      case 'fila-stats': {
        const stats = await statisticsService.getGuildStatistics(guildId);
        message = [
          '**Estatísticas do servidor**',
          `Filas aguardando: **${stats.queuesWaiting}**`,
          `Filas em andamento: **${stats.queuesRunning}**`,
          `Equipes: **${stats.teams}**`,
          `Tickets abertos: **${stats.openTickets}**`,
          `Partidas registradas: **${stats.matches}**`,
          `Jogadores únicos em filas: **${stats.registeredPlayers}**`,
        ].join('\n');
        break;
      }
      case 'equipe-criar': {
        const team = await teamService.create(guildId, name, interaction.user.id, interaction.options.getInteger('limite') ?? 5);
        message = `Equipe criada!\n${formatTeam(team)}`;
        break;
      }
      case 'equipe-entrar': {
        const team = await teamService.join(guildId, name, interaction.user.id);
        message = `Você entrou na equipe!\n${formatTeam(team)}`;
        break;
      }
      case 'equipe-sair': {
        const team = await teamService.leave(guildId, name, interaction.user.id);
        message = `Você saiu da equipe.\n${formatTeam(team)}`;
        break;
      }
      case 'equipe-listar': {
        const teams = await teamService.list(guildId);
        message = teams.length ? teams.slice(0, 8).map(formatTeam).join('\n\n').slice(0, 1900) : 'Ainda não existem equipes neste servidor.';
        break;
      }
      case 'match-gerar': {
        const queueNameValue = interaction.options.getString('fila', true);
        const match = await matchmakingService.generate(guildId, queueNameValue, interaction.user.id);
        message = `**Equipe A**\n${match.teamA.map((id) => `• <@${id}>`).join('\n')}\n\n**Equipe B**\n${match.teamB.map((id) => `• <@${id}>`).join('\n')}`;
        break;
      }
      case 'ticket-abrir': {
        const subject = interaction.options.getString('assunto', true);
        const slug = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 18) || 'usuario';
        const botUserId = interaction.client.user?.id;
        if (!botUserId) throw new TicketError('O bot ainda não está pronto para abrir tickets.');
        const overwrites = [
          { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: botUserId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
        ];
        if (env.STAFF_ROLE_ID) overwrites.push({ id: env.STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
        const channel = await interaction.guild.channels.create({
          name: `ticket-${slug}-${Date.now().toString().slice(-5)}`,
          type: ChannelType.GuildText,
          ...(env.TICKET_CATEGORY_ID ? { parent: env.TICKET_CATEGORY_ID } : {}),
          permissionOverwrites: overwrites,
          reason: `Ticket aberto por ${interaction.user.tag}`,
        });
        try {
          const ticket = await ticketService.create({ guildId, channelId: channel.id, creatorId: interaction.user.id, subject });
          await channel.send({ content: `Olá <@${interaction.user.id}>! Seu ticket foi aberto.\n**Assunto:** ${ticket.subject}\nDescreva seu problema; a equipe responderá aqui. Use /ticket-fechar quando terminar.` });
          await sendConfiguredChannel(interaction, env.AUDIT_LOG_CHANNEL_ID, `🎫 Ticket aberto por <@${interaction.user.id}> em <#${channel.id}>: ${subject}`);
          message = `Ticket criado: <#${channel.id}>.`;
        } catch (error) {
          await channel.delete('Falha ao registrar ticket no banco de dados').catch(() => undefined);
          throw error;
        }
        break;
      }
      case 'ticket-fechar': {
        const openTicket = await ticketService.findOpenByChannel(guildId, interaction.channelId);
        if (!openTicket) throw new TicketError('Use este comando dentro de um ticket aberto.');
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const isSupportStaff = Boolean(env.STAFF_ROLE_ID && member.roles.cache.has(env.STAFF_ROLE_ID));
        if (openTicket.creatorId !== interaction.user.id && !requireAdmin(interaction) && !isSupportStaff) {
          throw new TicketError('Somente quem abriu o ticket, a equipe de suporte ou um administrador pode fechá-lo.');
        }
        const closed = await ticketService.close(guildId, interaction.channelId, interaction.user.id);
        const channel = await interaction.guild.channels.fetch(interaction.channelId);
        if (channel?.type === ChannelType.GuildText) {
          await channel.setName(`fechado-${channel.name}`.slice(0, 100)).catch(() => undefined);
          await channel.permissionOverwrites.edit(closed.creatorId, { SendMessages: false }).catch(() => undefined);
          await channel.send('🔒 Ticket fechado. O histórico foi mantido.').catch(() => undefined);
        }
        await sendConfiguredChannel(interaction, env.AUDIT_LOG_CHANNEL_ID, `🔒 Ticket fechado por <@${interaction.user.id}>: <#${interaction.channelId}>`);
        message = 'Ticket fechado. O histórico foi preservado.';
        break;
      }
      case 'audit-recentes': {
        const entries = await auditService.recent(guildId, 10);
        message = entries.length ? entries.map((entry) => `• <t:${Math.floor(entry.createdAt.getTime() / 1000)}:R> **${entry.action}** — <@${entry.actorId}> (${entry.entityType})`).join('\n').slice(0, 1900) : 'Ainda não há registros de auditoria.';
        break;
      }
      default:
        break;
    }
    await interaction.editReply({ content: message });
  } catch (error: unknown) {
    const knownError = error instanceof QueueError || error instanceof TeamError || error instanceof TicketError || error instanceof MatchmakingError;
    if (knownError) {
      await interaction.editReply({ content: error.message });
    } else {
      throw error;
    }
  }
}
