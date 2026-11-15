import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/infrastructure/database.js';
import { matchmakingService } from '../../../src/modules/matchmaking/matchmaking-service.js';
import { queueService } from '../../../src/modules/queue/queue-service.js';
import { statisticsService } from '../../../src/modules/statistics/statistics-service.js';
import { teamService } from '../../../src/modules/teams/team-service.js';
import { ticketService } from '../../../src/modules/tickets/ticket-service.js';
import { auditService } from '../../../src/modules/audit/audit-service.js';

describe('community modules (PostgreSQL integration)', () => {
  const guildId = 'community-integration-guild';
  beforeEach(async () => {
    await prisma.auditLog.deleteMany({ where: { guildId } });
    await prisma.supportTicket.deleteMany({ where: { guildId } });
    await prisma.matchRecord.deleteMany({ where: { guildId } });
    await prisma.teamMember.deleteMany({ where: { team: { guildId } } });
    await prisma.team.deleteMany({ where: { guildId } });
    await prisma.queuePlayer.deleteMany({ where: { queue: { guildId } } });
    await prisma.queue.deleteMany({ where: { guildId } });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('creates teams, tracks membership and prevents duplicate joins', async () => {
    const team = await teamService.create(guildId, 'Alpha', 'owner', 3);
    expect(team.members).toHaveLength(1);
    const joined = await teamService.join(guildId, 'Alpha', 'player-1');
    expect(joined.members).toHaveLength(2);
    await expect(teamService.join(guildId, 'Alpha', 'player-1')).rejects.toThrow('já está');
    const left = await teamService.leave(guildId, 'Alpha', 'player-1');
    expect(left.members).toHaveLength(1);
  });

  it('opens, closes and audits a support ticket', async () => {
    const ticket = await ticketService.create({ guildId, channelId: 'ticket-channel-1', creatorId: 'player-1', subject: 'Ajuda com fila' });
    expect(ticket.status).toBe('OPEN');
    const closed = await ticketService.close(guildId, ticket.channelId, 'staff-1');
    expect(closed.status).toBe('CLOSED');
    const entries = await auditService.recent(guildId);
    expect(entries.map((entry) => entry.action)).toEqual(expect.arrayContaining(['TICKET_OPENED', 'TICKET_CLOSED']));
  });

  it('generates balanced matchmaking teams and statistics', async () => {
    await queueService.create({ guildId, name: 'Ranked', ownerId: 'owner', maxPlayers: 4 });
    for (const userId of ['p1', 'p2', 'p3', 'p4']) {
      await queueService.join(guildId, 'Ranked', { userId, username: userId });
    }
    await queueService.start(guildId, 'Ranked');
    const match = await matchmakingService.generate(guildId, 'Ranked', 'admin');
    expect(match.teamA).toHaveLength(2);
    expect(match.teamB).toHaveLength(2);
    expect([...match.teamA, ...match.teamB].sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
    const stats = await statisticsService.getGuildStatistics(guildId);
    expect(stats.queuesRunning).toBe(1);
    expect(stats.matches).toBe(1);
    expect(stats.registeredPlayers).toBe(4);
  });
});
