import { Prisma, QueueStatus as DbQueueStatus } from '@prisma/client';
import { prisma } from '../../infrastructure/database.js';

export type QueueStatus = 'waiting' | 'running' | 'finished';
export interface QueuePlayer { userId: string; username: string; joinedAt: string }
export interface Queue {
  id: string; guildId: string; name: string; ownerId: string; status: QueueStatus;
  maxPlayers: number; players: QueuePlayer[]; createdAt: string;
}
export class QueueError extends Error {
  public constructor(message: string) { super(message); this.name = 'QueueError'; }
}
const includePlayers = { players: { orderBy: { joinedAt: 'asc' as const } } };
function toQueue(record: Prisma.QueueGetPayload<{ include: typeof includePlayers }>): Queue {
  return {
    id: record.id, guildId: record.guildId, name: record.name, ownerId: record.ownerId,
    status: record.status.toLowerCase() as QueueStatus, maxPlayers: record.maxPlayers,
    createdAt: record.createdAt.toISOString(),
    players: record.players.map((p) => ({ userId: p.userId, username: p.username, joinedAt: p.joinedAt.toISOString() })),
  };
}
function normalizeName(name: string): { name: string; nameKey: string } {
  const clean = name.trim();
  if (clean.length < 2 || clean.length > 40) throw new QueueError('O nome da fila precisa ter entre 2 e 40 caracteres.');
  return { name: clean, nameKey: clean.toLocaleLowerCase('pt-BR') };
}
function mapDatabaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new QueueError('Já existe uma fila com esse nome ou você já está nessa fila.');
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    throw new QueueError('Não encontrei uma fila com esse nome.');
  }
  throw error;
}
export class QueueService {
  public async create(input: { guildId: string; name: string; ownerId: string; maxPlayers?: number }): Promise<Queue> {
    const { name, nameKey } = normalizeName(input.name);
    const maxPlayers = input.maxPlayers ?? 10;
    if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 100) throw new QueueError('O limite precisa estar entre 2 e 100 participantes.');
    try {
      return toQueue(await prisma.queue.create({
        data: { guildId: input.guildId, name, nameKey, ownerId: input.ownerId, maxPlayers },
        include: includePlayers,
      }));
    } catch (error) { mapDatabaseError(error); }
  }
  public async join(guildId: string, name: string, player: { userId: string; username: string }): Promise<Queue> {
    const { nameKey } = normalizeName(name);
    try {
      return await prisma.$transaction(async (tx) => {
        const queue = await tx.queue.findUnique({ where: { guildId_nameKey: { guildId, nameKey } }, include: includePlayers });
        if (!queue) throw new QueueError('Não encontrei uma fila com esse nome.');
        if (queue.status !== DbQueueStatus.WAITING) throw new QueueError('Essa fila não está aceitando participantes.');
        if (queue.players.some((p) => p.userId === player.userId)) throw new QueueError('Você já está nessa fila.');
        if (queue.players.length >= queue.maxPlayers) throw new QueueError('Essa fila já está cheia.');
        await tx.queuePlayer.create({ data: { queueId: queue.id, ...player } });
        return toQueue(await tx.queue.findUniqueOrThrow({ where: { id: queue.id }, include: includePlayers }));
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) { mapDatabaseError(error); }
  }
  public async leave(guildId: string, name: string, userId: string): Promise<Queue> {
    const { nameKey } = normalizeName(name);
    try {
      return await prisma.$transaction(async (tx) => {
        const queue = await tx.queue.findUnique({ where: { guildId_nameKey: { guildId, nameKey } }, include: includePlayers });
        if (!queue) throw new QueueError('Não encontrei uma fila com esse nome.');
        if (queue.status !== DbQueueStatus.WAITING) throw new QueueError('Não é possível sair: essa fila já foi iniciada.');
        if (!queue.players.some((p) => p.userId === userId)) throw new QueueError('Você não está nessa fila.');
        await tx.queuePlayer.delete({ where: { queueId_userId: { queueId: queue.id, userId } } });
        return toQueue(await tx.queue.findUniqueOrThrow({ where: { id: queue.id }, include: includePlayers }));
      });
    } catch (error) { mapDatabaseError(error); }
  }
  public async start(guildId: string, name: string): Promise<Queue> {
    return this.changeStatus(guildId, name, DbQueueStatus.WAITING, DbQueueStatus.RUNNING, true);
  }
  public async finish(guildId: string, name: string): Promise<Queue> {
    const { nameKey } = normalizeName(name);
    try {
      const queue = await prisma.queue.findUnique({ where: { guildId_nameKey: { guildId, nameKey } }, include: includePlayers });
      if (!queue) throw new QueueError('Não encontrei uma fila com esse nome.');
      if (queue.status === DbQueueStatus.FINISHED) throw new QueueError('Essa fila já foi encerrada.');
      return toQueue(await prisma.queue.update({ where: { id: queue.id }, data: { status: DbQueueStatus.FINISHED }, include: includePlayers }));
    } catch (error) { mapDatabaseError(error); }
  }
  public async list(guildId: string): Promise<Queue[]> {
    const queues = await prisma.queue.findMany({
      where: { guildId, status: { not: DbQueueStatus.FINISHED } },
      include: includePlayers, orderBy: { createdAt: 'asc' },
    });
    return queues.map(toQueue);
  }
  private async changeStatus(guildId: string, name: string, from: DbQueueStatus, to: DbQueueStatus, requireTwoPlayers: boolean): Promise<Queue> {
    const { nameKey } = normalizeName(name);
    try {
      return await prisma.$transaction(async (tx) => {
        const queue = await tx.queue.findUnique({ where: { guildId_nameKey: { guildId, nameKey } }, include: includePlayers });
        if (!queue) throw new QueueError('Não encontrei uma fila com esse nome.');
        if (queue.status !== from) throw new QueueError('Essa fila não está aguardando participantes.');
        if (requireTwoPlayers && queue.players.length < 2) throw new QueueError('São necessários pelo menos 2 participantes para iniciar.');
        return toQueue(await tx.queue.update({ where: { id: queue.id }, data: { status: to }, include: includePlayers }));
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) { mapDatabaseError(error); }
  }
}
export const queueService = new QueueService();
