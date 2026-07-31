import { Request, Response, NextFunction } from 'express';
import { SessionRepository } from '../repositories/SessionRepository';
import { z } from 'zod';

const createSessionSchema = z.object({
  title: z.string().optional(),
  namespace: z.string().optional(),
});

export class SessionController {
  private repo = SessionRepository.getInstance();

  public getSessions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessions = this.repo.getAllSessions();
      res.status(200).json({ sessions });
    } catch (error) {
      next(error);
    }
  };

  public getSessionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const session = this.repo.getSession(id);
      if (!session) {
        res.status(404).json({ error: `Session '${id}' not found.` });
        return;
      }
      res.status(200).json({ session });
    } catch (error) {
      next(error);
    }
  };

  public createSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, namespace } = createSessionSchema.parse(req.body);
      const session = this.repo.createSession(title, namespace);
      res.status(201).json({ session });
    } catch (error) {
      next(error);
    }
  };

  public deleteSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const success = this.repo.deleteSession(id);
      if (!success) {
        res.status(404).json({ error: `Session '${id}' not found.` });
        return;
      }
      res.status(200).json({ message: `Session '${id}' deleted successfully.` });
    } catch (error) {
      next(error);
    }
  };
}
