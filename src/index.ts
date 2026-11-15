import { logger } from './core/logger.js';

async function bootstrap(): Promise<void> {
  logger.info('Iniciando BOOM QUEUE SYSTEM');
  logger.info('Fundação carregada. Integração com Discord será ativada nos próximos passos.');
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Falha fatal durante a inicialização');
  process.exitCode = 1;
});
