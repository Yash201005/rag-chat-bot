import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DocumentLoaderFactory } from '../loaders/DocumentLoaderFactory';
import { EmbeddingService } from '../embeddings/EmbeddingService';
import { PineconeService } from '../vectorstore/PineconeService';
import { DocumentRepository } from '../repositories/DocumentRepository';
import { MetricsRepository } from '../repositories/MetricsRepository';
import { MetadataGenerator } from '../utils/metadataGenerator';
import { DocumentRecord, SupportedFileType, ChunkMetadata } from '../types/index';
import { env } from '../config/environment';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

export interface IngestionOptions {
  filePath: string;
  originalName: string;
  fileSize: number;
  namespace?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

export class DocumentService {
  private docRepo: DocumentRepository;
  private metricsRepo: MetricsRepository;

  constructor(
    private embeddingService: EmbeddingService,
    private pineconeService: PineconeService
  ) {
    this.docRepo = DocumentRepository.getInstance();
    this.metricsRepo = MetricsRepository.getInstance();
  }

  public async processAndIngestDocument(options: IngestionOptions): Promise<DocumentRecord> {
    const {
      filePath,
      originalName,
      fileSize,
      namespace = env.PINECONE_NAMESPACE,
      chunkSize = env.CHUNK_SIZE,
      chunkOverlap = env.CHUNK_OVERLAP,
    } = options;

    const documentId = uuidv4();
    const fileType: SupportedFileType = DocumentLoaderFactory.getFileType(originalName);

    const docRecord: DocumentRecord = {
      id: documentId,
      filename: originalName,
      fileType,
      size: fileSize,
      chunkCount: 0,
      namespace,
      uploadedAt: new Date().toISOString(),
      status: 'processing',
    };

    this.docRepo.saveDocument(docRecord);

    try {
      // 1. Load document
      const loader = DocumentLoaderFactory.getLoader(fileType);
      const loadedPages = await loader.load(filePath, originalName);

      // 2. Configure RecursiveCharacterTextSplitter
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
        separators: ['\n\n', '\n', ' ', ''],
      });

      const chunkRecords: { id: string; text: string; metadata: ChunkMetadata }[] = [];
      let totalChunkCounter = 1;

      // 3. Clean & Split loaded document pages
      for (const pageDoc of loadedPages) {
        const splitTexts = await splitter.splitText(pageDoc.pageContent);

        for (const text of splitTexts) {
          if (!text || text.trim().length === 0) continue;

          const metadata = MetadataGenerator.createChunkMetadata({
            documentId,
            filename: originalName,
            page: pageDoc.metadata.page,
            source: pageDoc.metadata.source,
            fileType,
            section: pageDoc.metadata.section,
            chunkNumber: totalChunkCounter++,
          });

          chunkRecords.push({
            id: metadata.chunkId,
            text,
            metadata,
          });
        }
      }

      // 4. Generate Embeddings in batch
      const textsToEmbed = chunkRecords.map((c) => c.text);
      const embeddings = await this.embeddingService.embedDocuments(textsToEmbed);

      // 5. Store Vectors in Pinecone with metadata
      const vectorsToUpsert = chunkRecords.map((chunk, index) => ({
        id: chunk.id,
        values: embeddings[index],
        metadata: {
          ...chunk.metadata,
          text: chunk.text, // Store text in Pinecone metadata for retrieval
        },
      }));

      await this.pineconeService.upsertVectors(vectorsToUpsert, namespace);

      // 6. Update document record status & metrics
      docRecord.chunkCount = chunkRecords.length;
      docRecord.status = 'indexed';
      this.docRepo.saveDocument(docRecord);
      this.metricsRepo.incrementDocumentStats(chunkRecords.length);

      logger.info(`Successfully ingested document '${originalName}' (${chunkRecords.length} chunks).`);

      // 7. Cleanup temp uploaded file
      await fs.unlink(filePath).catch(() => {});

      return docRecord;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error ingesting document '${originalName}': ${errorMessage}`);
      this.docRepo.updateStatus(documentId, 'error', errorMessage);
      await fs.unlink(filePath).catch(() => {});
      throw error;
    }
  }

  public getAllDocuments(): DocumentRecord[] {
    return this.docRepo.getAllDocuments();
  }

  public async deleteDocument(id: string): Promise<boolean> {
    const doc = this.docRepo.getDocument(id);
    if (!doc) return false;

    await this.pineconeService.deleteVectorsByDocumentId(id, doc.namespace);
    this.metricsRepo.decrementDocumentStats(doc.chunkCount);
    return this.docRepo.deleteDocument(id);
  }
}
