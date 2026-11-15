import { TicketStatus } from '@prisma/client';
import { prisma } from '../../infrastructure/database.js';
import { auditService } from '../audit/audit-service.js';

export class TicketError extends Error {
  public constructor(message: string) { super(message); this.name = 'TicketError'; }
}

export class TicketService {
  public async create(input: { guildId: string; channelId: string; creatorId: string; subject: string }) {
    const subject = input.subject.trim().slice(0, 100);
    if (subject.length < 3) throw new TicketError('O assunto precisa ter pelo menos 3 caracteres.');
    const existing = await prisma.supportTicket.findFirst({
      where: { guildId: input.guildId, creatorId: input.creatorId, status: TicketStatus.OPEN },
    });
    if (existing) throw new TicketError('Você já possui um ticket aberto neste servidor.');
    const ticket = await prisma.supportTicket.create({ data: { ...input, subject } });
    await auditService.record({
      guildId: input.guildId, actorId: input.creatorId, action: 'TICKET_OPENED',
      entityType: 'ticket', entityId: ticket.id, metadata: { channelId: input.channelId },
    });
    return ticket;
  }

  public async findOpenByChannel(guildId: string, channelId: string) {
    return prisma.supportTicket.findFirst({ where: { guildId, channelId, status: TicketStatus.OPEN } });
  }

  public async close(guildId: string, channelId: string, actorId: string) {
    const ticket = await prisma.supportTicket.findFirst({ where: { guildId, channelId, status: TicketStatus.OPEN } });
    if (!ticket) throw new TicketError('Este canal não possui um ticket aberto.');
    const closed = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: TicketStatus.CLOSED, closedAt: new Date() },
    });
    await auditService.record({
      guildId, actorId, action: 'TICKET_CLOSED',
      entityType: 'ticket', entityId: ticket.id, metadata: { channelId },
    });
    return closed;
  }
}

export const ticketService = new TicketService();
