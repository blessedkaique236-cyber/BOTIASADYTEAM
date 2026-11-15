import { beforeEach, describe, expect, it } from 'vitest';
import { QueueError, QueueService } from '../../../src/modules/queue/queue-service.js';

describe('QueueService', () => {
  let service: QueueService;

  beforeEach(() => {
    service = new QueueService();
  });

  it('creates a queue and enforces a unique name per guild', () => {
    const queue = service.create({ guildId: 'guild-1', name: 'Ranked', ownerId: 'owner' });
    expect(queue.name).toBe('Ranked');
    expect(queue.maxPlayers).toBe(10);
    expect(() => service.create({ guildId: 'guild-1', name: 'ranked', ownerId: 'other' })).toThrow(QueueError);
    expect(() => service.create({ guildId: 'guild-2', name: 'ranked', ownerId: 'other' })).not.toThrow();
  });

  it('allows joining and leaving while waiting', () => {
    service.create({ guildId: 'guild-1', name: 'Duo', ownerId: 'owner', maxPlayers: 2 });
    service.join('guild-1', 'Duo', { userId: 'a', username: 'Alpha' });
    expect(service.get('guild-1', 'Duo')?.players).toHaveLength(1);
    service.leave('guild-1', 'Duo', 'a');
    expect(service.get('guild-1', 'Duo')?.players).toHaveLength(0);
  });

  it('rejects duplicate participants and full queues', () => {
    service.create({ guildId: 'guild-1', name: 'Duo', ownerId: 'owner', maxPlayers: 2 });
    service.join('guild-1', 'Duo', { userId: 'a', username: 'Alpha' });
    expect(() => service.join('guild-1', 'Duo', { userId: 'a', username: 'Alpha' })).toThrow(QueueError);
    service.join('guild-1', 'Duo', { userId: 'b', username: 'Beta' });
    expect(() => service.join('guild-1', 'Duo', { userId: 'c', username: 'Gamma' })).toThrow(QueueError);
  });

  it('requires at least two participants to start and can finish', () => {
    service.create({ guildId: 'guild-1', name: 'Duo', ownerId: 'owner' });
    expect(() => service.start('guild-1', 'Duo')).toThrow(QueueError);
    service.join('guild-1', 'Duo', { userId: 'a', username: 'Alpha' });
    service.join('guild-1', 'Duo', { userId: 'b', username: 'Beta' });
    expect(service.start('guild-1', 'Duo').status).toBe('running');
    expect(service.finish('guild-1', 'Duo').status).toBe('finished');
  });
});
