import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database.js';

export interface AuditEntry {
  guildId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  public async record(entry: AuditEntry): Promise<void> {
    await prisma.auditLog.create({
      data: {
        guildId: entry.guildId,
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ...(entry.metadata ? { metadata: entry.metadata as unknown as Prisma.InputJsonObject } : {}),
      },
    });
  }

  public async recent(guildId: string, limit = 20) {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    return prisma.auditLog.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });
  }
}

export const auditService = new AuditService();
