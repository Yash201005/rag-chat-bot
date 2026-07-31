import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/DocumentService';
import { z } from 'zod';

const uploadQuerySchema = z.object({
  namespace: z.string().optional(),
  chunkSize: z.coerce.number().min(100).max(5000).optional(),
  chunkOverlap: z.coerce.number().min(0).max(1000).optional(),
});

export class UploadController {
  constructor(private documentService: DocumentService) {}

  public uploadDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      const singleFile = req.file;

      const fileList = files || (singleFile ? [singleFile] : []);

      if (fileList.length === 0) {
        res.status(400).json({ error: 'No files uploaded.' });
        return;
      }

      const bodyOptions = uploadQuerySchema.parse(req.body);

      const results = [];
      for (const file of fileList) {
        const docRecord = await this.documentService.processAndIngestDocument({
          filePath: file.path,
          originalName: file.originalname,
          fileSize: file.size,
          namespace: bodyOptions.namespace,
          chunkSize: bodyOptions.chunkSize,
          chunkOverlap: bodyOptions.chunkOverlap,
        });
        results.push(docRecord);
      }

      res.status(200).json({
        message: `Successfully processed ${results.length} document(s).`,
        documents: results,
      });
    } catch (error) {
      next(error);
    }
  };
}
