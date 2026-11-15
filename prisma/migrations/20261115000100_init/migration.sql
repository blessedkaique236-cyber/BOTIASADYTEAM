CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'RUNNING', 'FINISHED');

CREATE TABLE "Queue" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "maxPlayers" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QueuePlayer" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QueuePlayer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Queue_guildId_nameKey_key" ON "Queue"("guildId", "nameKey");
CREATE INDEX "Queue_guildId_status_createdAt_idx" ON "Queue"("guildId", "status", "createdAt");
CREATE UNIQUE INDEX "QueuePlayer_queueId_userId_key" ON "QueuePlayer"("queueId", "userId");
CREATE INDEX "QueuePlayer_queueId_joinedAt_idx" ON "QueuePlayer"("queueId", "joinedAt");

ALTER TABLE "QueuePlayer"
ADD CONSTRAINT "QueuePlayer_queueId_fkey"
FOREIGN KEY ("queueId") REFERENCES "Queue"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
