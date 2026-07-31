import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/DocumentService';

export class DocumentController {
  constructor(private documentService: DocumentService) {}

  public getDocuments = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const documents = this.documentService.getAllDocuments();
      res.status(200).json({ documents });
    } catch (error) {
      next(error);
    }
  };

  public deleteDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const success = await this.documentService.deleteDocument(id);
      if (!success) {
        res.status(404).json({ error: `Document with ID '${id}' not found.` });
        return;
      }
      res.status(200).json({ message: `Document '${id}' deleted successfully.` });
    } catch (error) {
      next(error);
    }
  };
}
