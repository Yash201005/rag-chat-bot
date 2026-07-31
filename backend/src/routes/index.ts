import { Router } from 'express';
import { EmbeddingService } from '../embeddings/EmbeddingService';
import { PineconeService } from '../vectorstore/PineconeService';
import { GroqService } from '../services/GroqService';
import { DocumentService } from '../services/DocumentService';
import { RetrieverService } from '../rag/RetrieverService';
import { RAGPipeline } from '../rag/RAGPipeline';

import { UploadController } from '../controllers/UploadController';
import { ChatController } from '../controllers/ChatController';
import { DocumentController } from '../controllers/DocumentController';
import { SessionController } from '../controllers/SessionController';
import { MetricsController } from '../controllers/MetricsController';

import { createUploadRouter } from './uploadRoutes';
import { createChatRouter } from './chatRoutes';
import { createDocumentRouter } from './documentRoutes';
import { createSessionRouter } from './sessionRoutes';
import { createMetricsRouter } from './metricsRoutes';

export function createApiRouter(): Router {
  const router = Router();

  // Instantiate Singletons & Core AI Services
  const embeddingService = new EmbeddingService();
  const pineconeService = new PineconeService();
  const groqService = new GroqService();

  const documentService = new DocumentService(embeddingService, pineconeService);
  const retrieverService = new RetrieverService(embeddingService, pineconeService, groqService);
  const ragPipeline = new RAGPipeline(retrieverService, groqService);

  // Instantiate Controllers
  const uploadController = new UploadController(documentService);
  const chatController = new ChatController(ragPipeline);
  const documentController = new DocumentController(documentService);
  const sessionController = new SessionController();
  const metricsController = new MetricsController(pineconeService);

  // Mount API Endpoint Routers
  router.use('/', createUploadRouter(uploadController));
  router.use('/', createChatRouter(chatController));
  router.use('/', createDocumentRouter(documentController));
  router.use('/', createSessionRouter(sessionController));
  router.use('/', createMetricsRouter(metricsController));

  return router;
}
