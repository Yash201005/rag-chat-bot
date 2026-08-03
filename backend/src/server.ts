import { createApp } from './app';
import { env } from './config/environment';
import { logger } from './config/logger';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Enterprise RAG Platform Backend Server running on port ${env.PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Pinecone Index Target: ${env.PINECONE_INDEX}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${env.PORT} is already in use. Clean up the process on port ${env.PORT} or set PORT in .env.`);
    process.exit(1);
  } else {
    logger.error('Server error:', err);
  }
});

process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
