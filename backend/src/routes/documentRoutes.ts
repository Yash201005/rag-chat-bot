import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';

export function createDocumentRouter(controller: DocumentController): Router {
  const router = Router();
  router.get('/documents', controller.getDocuments);
  router.delete('/documents/:id', controller.deleteDocument);
  return router;
}
