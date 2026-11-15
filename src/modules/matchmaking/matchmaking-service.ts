import { QueueStatus } from '@prisma/client';
import { prisma } from '../../infrastructure/database.js';
import { auditService } from '../audit/audit-service.js';

export class MatchmakingError extends Error {
  public constructor(message: string) { super(message); this.name = 'MatchmakingError'; }
}
export interface MatchTeam { teamA: string[]; teamB: string[] }
export class MatchmakingService {
  public async generate(guildId: string, queueName: string, actorId: string): Promise<MatchTeam> {
    const key = queueName.trim().toLocaleLowerCase('pt-BR');
    const queue = await prisma.queue.findUnique({
      where: { guildId_nameKey: { guildId, nameKey: key } },
      include: { players: { orderBy: { joinedAt: 'asc' } } },
    });
    if (!queue) throw new MatchmakingError('Fila não encontrada.');
    if (queue.status !== QueueStatus.RUNNING) throw new MatchmakingError('Inicie a fila antes de gerar as equipes.');
    if (queue.players.length < 4) throw new MatchmakingError('São necessários pelo menos 4 jogadores para dividir em duas equipes.');
    if (queue.players.length % 2 !== 0) throw new MatchmakingError('A quantidade de jogadores precisa ser par.');
    const shuffled = [...queue.players];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    const teamA: string[] = [];
    const teamB: string[] = [];
    shuffled.forEach((player, index) => (index % 2 === 0 ? teamA : teamB).push(player.userId));
    const result = { teamA, teamB };
    const match = await prisma.matchRecord.create({ data: { guildId, queueName: queue.name, participants: result } });
    await auditService.record({
      guildId, actorId, action: 'MATCH_GENERATED', entityType: 'match',
      entityId: match.id, metadata: { queueName: queue.name, players: queue.players.length },
    });
    return result;
  }
}
export const matchmakingService = new MatchmakingService();
