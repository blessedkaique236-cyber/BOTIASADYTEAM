export type QueueStatus = 'waiting' | 'running' | 'finished';

export interface QueuePlayer {
  userId: string;
  username: string;
  joinedAt: string;
}

export interface Queue {
  id: string;
  guildId: string;
  name: string;
  ownerId: string;
  status: QueueStatus;
  maxPlayers: number;
  players: QueuePlayer[];
  createdAt: string;
}

export class QueueError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'QueueError';
  }
}

/**
 * Temporary in-memory queue store for the first Discord MVP.
 * Data is lost when the process restarts; replace with the database repository
 * before using this service for a production community.
 */
export class QueueService {
  private readonly queues = new Map<string, Queue>();

  public create(input: {
    guildId: string;
    name: string;
    ownerId: string;
    maxPlayers?: number;
  }): Queue {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 40) {
      throw new QueueError('O nome da fila precisa ter entre 2 e 40 caracteres.');
    }

    const maxPlayers = input.maxPlayers ?? 10;
    if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 100) {
      throw new QueueError('O limite precisa estar entre 2 e 100 participantes.');
    }

    const key = this.key(input.guildId, name);
    if (this.queues.has(key)) {
      throw new QueueError('Já existe uma fila com esse nome neste servidor.');
    }

    const queue: Queue = {
      id: crypto.randomUUID(),
      guildId: input.guildId,
      name,
      ownerId: input.ownerId,
      status: 'waiting',
      maxPlayers,
      players: [],
      createdAt: new Date().toISOString(),
    };
    this.queues.set(key, queue);
    return queue;
  }

  public join(guildId: string, name: string, player: Omit<QueuePlayer, 'joinedAt'>): Queue {
    const queue = this.getOrThrow(guildId, name);
    if (queue.status !== 'waiting') {
      throw new QueueError('Essa fila não está aceitando participantes.');
    }
    if (queue.players.some((entry) => entry.userId === player.userId)) {
      throw new QueueError('Você já está nessa fila.');
    }
    if (queue.players.length >= queue.maxPlayers) {
      throw new QueueError('Essa fila já está cheia.');
    }

    queue.players.push({ ...player, joinedAt: new Date().toISOString() });
    return queue;
  }

  public leave(guildId: string, name: string, userId: string): Queue {
    const queue = this.getOrThrow(guildId, name);
    if (queue.status !== 'waiting') {
      throw new QueueError('Não é possível sair: essa fila já foi iniciada.');
    }
    const index = queue.players.findIndex((entry) => entry.userId === userId);
    if (index === -1) {
      throw new QueueError('Você não está nessa fila.');
    }
    queue.players.splice(index, 1);
    return queue;
  }

  public start(guildId: string, name: string): Queue {
    const queue = this.getOrThrow(guildId, name);
    if (queue.status !== 'waiting') {
      throw new QueueError('Essa fila não está aguardando participantes.');
    }
    if (queue.players.length < 2) {
      throw new QueueError('São necessários pelo menos 2 participantes para iniciar.');
    }
    queue.status = 'running';
    return queue;
  }

  public finish(guildId: string, name: string): Queue {
    const queue = this.getOrThrow(guildId, name);
    if (queue.status === 'finished') {
      throw new QueueError('Essa fila já foi encerrada.');
    }
    queue.status = 'finished';
    return queue;
  }

  public list(guildId: string): Queue[] {
    return [...this.queues.values()].filter((queue) => queue.guildId === guildId);
  }

  public get(guildId: string, name: string): Queue | undefined {
    return this.queues.get(this.key(guildId, name));
  }

  private getOrThrow(guildId: string, name: string): Queue {
    const queue = this.get(guildId, name);
    if (!queue) {
      throw new QueueError('Não encontrei uma fila com esse nome.');
    }
    return queue;
  }

  private key(guildId: string, name: string): string {
    return `${guildId}:${name.trim().toLocaleLowerCase('pt-BR')}`;
  }
}

export const queueService = new QueueService();
