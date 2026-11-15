import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../core/logger.js';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  logger.info('Conexão com PostgreSQL estabelecida');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Conexão com PostgreSQL encerrada');
}
