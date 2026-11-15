import { QueueStatus, TicketStatus } from '@prisma/client';
import { prisma } from '../../infrastructure/database.js';

export interface GuildStatistics {
  queuesWaiting: number;
  queuesRunning: number;
  teams: number;
  openTickets: number;
  matches: number;
  registeredPlayers: number;
}
export class StatisticsService {
  public async getGuildStatistics(guildId: string): Promise<GuildStatistics> {
    const [queuesWaiting, queuesRunning, teams, openTickets, matches, players] = await Promise.all([
      prisma.queue.count({ where: { guildId, status: QueueStatus.WAITING } }),
      prisma.queue.count({ where: { guildId, status: QueueStatus.RUNNING } }),
      prisma.team.count({ where: { guildId } }),
      prisma.supportTicket.count({ where: { guildId, status: TicketStatus.OPEN } }),
      prisma.matchRecord.count({ where: { guildId } }),
      prisma.queuePlayer.findMany({ where: { queue: { guildId } }, select: { userId: true }, distinct: ['userId'] }),
    ]);
    return { queuesWaiting, queuesRunning, teams, openTickets, matches, registeredPlayers: players.length };
  }
}
export const statisticsService = new StatisticsService();
