import { Router } from 'express';
import { UploadController } from '../controllers/UploadController';
import { uploadMiddleware } from '../middleware/uploadMiddleware';

export function createUploadRouter(controller: UploadController): Router {
  const router = Router();
  router.post('/upload', uploadMiddleware.array('files', 10), controller.uploadDocuments);
  return router;
}
