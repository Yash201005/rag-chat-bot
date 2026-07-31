import { Router } from 'express';
import { SessionController } from '../controllers/SessionController';

export function createSessionRouter(controller: SessionController): Router {
  const router = Router();
  router.get('/sessions', controller.getSessions);
  router.get('/sessions/:id', controller.getSessionById);
  router.post('/sessions', controller.createSession);
  router.delete('/sessions/:id', controller.deleteSession);
  return router;
}
