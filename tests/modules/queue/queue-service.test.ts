import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/infrastructure/database.js';
import { QueueError, QueueService } from '../../../src/modules/queue/queue-service.js';

describe('QueueService (PostgreSQL integration)', () => {
  const service = new QueueService();
  const guildId = 'integration-guild';
  beforeEach(async () => {
    await prisma.queuePlayer.deleteMany({ where: { queue: { guildId: { in: [guildId, 'another-guild', 'other-guild'] } } } });
    await prisma.queue.deleteMany({ where: { guildId: { in: [guildId, 'another-guild', 'other-guild'] } } });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('creates a queue and enforces unique names per guild', async () => {
    const queue = await service.create({ guildId, name: 'Ranked', ownerId: 'owner' });
    expect(queue.maxPlayers).toBe(10);
    await expect(service.create({ guildId, name: 'ranked', ownerId: 'other' })).rejects.toThrow(QueueError);
    await expect(service.create({ guildId: 'another-guild', name: 'ranked', ownerId: 'other' })).resolves.toBeDefined();
  });
  it('persists joins and leaves, including after a fresh service instance', async () => {
    await service.create({ guildId, name: 'Duo', ownerId: 'owner', maxPlayers: 2 });
    await service.join(guildId, 'Duo', { userId: 'a', username: 'Alpha' });
    const restartedService = new QueueService();
    expect((await restartedService.list(guildId))[0]?.players).toHaveLength(1);
    await restartedService.leave(guildId, 'Duo', 'a');
    expect((await service.list(guildId))[0]?.players).toHaveLength(0);
  });
  it('rejects duplicate participants and full queues', async () => {
    await service.create({ guildId, name: 'Duo', ownerId: 'owner', maxPlayers: 2 });
    await service.join(guildId, 'Duo', { userId: 'a', username: 'Alpha' });
    await expect(service.join(guildId, 'Duo', { userId: 'a', username: 'Alpha' })).rejects.toThrow(QueueError);
    await service.join(guildId, 'Duo', { userId: 'b', username: 'Beta' });
    await expect(service.join(guildId, 'Duo', { userId: 'c', username: 'Gamma' })).rejects.toThrow(QueueError);
  });
  it('requires two players to start and can finish', async () => {
    await service.create({ guildId, name: 'Duo', ownerId: 'owner' });
    await expect(service.start(guildId, 'Duo')).rejects.toThrow(QueueError);
    await service.join(guildId, 'Duo', { userId: 'a', username: 'Alpha' });
    await service.join(guildId, 'Duo', { userId: 'b', username: 'Beta' });
    expect((await service.start(guildId, 'Duo')).status).toBe('running');
    expect((await service.finish(guildId, 'Duo')).status).toBe('finished');
  });
  it('isolates listing by Discord server', async () => {
    await service.create({ guildId, name: 'Guild one', ownerId: 'owner' });
    await service.create({ guildId: 'other-guild', name: 'Guild two', ownerId: 'owner' });
    expect((await service.list(guildId)).map((queue) => queue.name)).toContain('Guild one');
    expect((await service.list(guildId)).map((queue) => queue.name)).not.toContain('Guild two');
  });
});
