import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database.js';
import { auditService } from '../audit/audit-service.js';

export interface TeamView {
  id: string;
  name: string;
  ownerId: string;
  maxMembers: number;
  members: Array<{ userId: string; role: string }>;
}

export class TeamError extends Error {
  public constructor(message: string) { super(message); this.name = 'TeamError'; }
}

const includeMembers = { members: { orderBy: { joinedAt: 'asc' as const } } };
type TeamRecord = Prisma.TeamGetPayload<{ include: typeof includeMembers }>;
const toTeam = (team: TeamRecord): TeamView => ({
  id: team.id,
  name: team.name,
  ownerId: team.ownerId,
  maxMembers: team.maxMembers,
  members: team.members.map((member) => ({ userId: member.userId, role: member.role })),
});

export class TeamService {
  public async create(guildId: string, name: string, ownerId: string, maxMembers = 5): Promise<TeamView> {
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 32) throw new TeamError('O nome da equipe deve ter entre 2 e 32 caracteres.');
    if (!Number.isInteger(maxMembers) || maxMembers < 2 || maxMembers > 20) throw new TeamError('O limite da equipe deve ficar entre 2 e 20 membros.');
    try {
      const team = await prisma.$transaction(async (tx) => {
        const created = await tx.team.create({
          data: {
            guildId, name: clean, nameKey: clean.toLocaleLowerCase('pt-BR'),
            ownerId, maxMembers,
            members: { create: { userId: ownerId, role: 'OWNER' } },
          },
          include: includeMembers,
        });
        await tx.auditLog.create({ data: {
          guildId, actorId: ownerId, action: 'TEAM_CREATED',
          entityType: 'team', entityId: created.id, metadata: { name: clean },
        } });
        return created;
      });
      return toTeam(team);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new TeamError('Você já possui uma equipe com esse nome.');
      throw error;
    }
  }

  public async join(guildId: string, name: string, userId: string): Promise<TeamView> {
    const nameKey = name.trim().toLocaleLowerCase('pt-BR');
    return prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { guildId_nameKey: { guildId, nameKey } }, include: includeMembers });
      if (!team) throw new TeamError('Equipe não encontrada.');
      if (team.members.some((member) => member.userId === userId)) throw new TeamError('Você já está nessa equipe.');
      if (team.members.length >= team.maxMembers) throw new TeamError('Essa equipe está cheia.');
      await tx.teamMember.create({ data: { teamId: team.id, userId } });
      await tx.auditLog.create({ data: {
        guildId, actorId: userId, action: 'TEAM_MEMBER_JOINED',
        entityType: 'team', entityId: team.id,
      } });
      return toTeam(await tx.team.findUniqueOrThrow({ where: { id: team.id }, include: includeMembers }));
    });
  }

  public async leave(guildId: string, name: string, userId: string): Promise<TeamView | null> {
    const nameKey = name.trim().toLocaleLowerCase('pt-BR');
    return prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { guildId_nameKey: { guildId, nameKey } }, include: includeMembers });
      if (!team) throw new TeamError('Equipe não encontrada.');
      if (team.ownerId === userId) throw new TeamError('O dono não pode sair da equipe. Transfira a liderança ou exclua a equipe pelo painel administrativo.');
      const member = team.members.find((entry) => entry.userId === userId);
      if (!member) throw new TeamError('Você não participa dessa equipe.');
      await tx.teamMember.delete({ where: { teamId_userId: { teamId: team.id, userId } } });
      await tx.auditLog.create({ data: {
        guildId, actorId: userId, action: 'TEAM_MEMBER_LEFT',
        entityType: 'team', entityId: team.id,
      } });
      return toTeam(await tx.team.findUniqueOrThrow({ where: { id: team.id }, include: includeMembers }));
    });
  }

  public async list(guildId: string): Promise<TeamView[]> {
    const teams = await prisma.team.findMany({ where: { guildId }, include: includeMembers, orderBy: { createdAt: 'asc' } });
    return teams.map(toTeam);
  }
}

export const teamService = new TeamService();
