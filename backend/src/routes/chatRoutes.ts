import { Router } from 'express';
import { ChatController } from '../controllers/ChatController';

export function createChatRouter(controller: ChatController): Router {
  const router = Router();
  router.post('/chat', controller.handleChat);
  return router;
}
