CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "Team" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameKey" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "maxMembers" INTEGER NOT NULL DEFAULT 5,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Team_guildId_nameKey_key" ON "Team"("guildId", "nameKey");
CREATE INDEX "Team_guildId_createdAt_idx" ON "Team"("guildId", "createdAt");

CREATE TABLE "TeamMember" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupportTicket_channelId_key" ON "SupportTicket"("channelId");
CREATE INDEX "SupportTicket_guildId_status_createdAt_idx" ON "SupportTicket"("guildId", "status", "createdAt");
CREATE INDEX "SupportTicket_creatorId_status_idx" ON "SupportTicket"("creatorId", "status");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_guildId_createdAt_idx" ON "AuditLog"("guildId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

CREATE TABLE "MatchRecord" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "queueName" TEXT NOT NULL,
  "participants" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "MatchRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MatchRecord_guildId_createdAt_idx" ON "MatchRecord"("guildId", "createdAt");
CREATE INDEX "MatchRecord_guildId_status_idx" ON "MatchRecord"("guildId", "status");
