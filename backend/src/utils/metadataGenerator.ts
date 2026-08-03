import { ChunkMetadata, SupportedFileType } from '../types/index';
import { v4 as uuidv4 } from 'uuid';

export class MetadataGenerator {
  public static createChunkMetadata(params: {
    documentId: string;
    filename: string;
    page: number;
    source: string;
    fileType: SupportedFileType;
    section?: string;
    chunkNumber: number;
    embeddingModel?: string;
  }): ChunkMetadata {
    return {
      documentId: params.documentId,
      chunkId: `${params.documentId}-chunk-${params.chunkNumber}-${uuidv4().substring(0, 8)}`,
      filename: params.filename,
      page: params.page || 1,
      source: params.source || params.filename,
      timestamp: new Date().toISOString(),
      fileType: params.fileType,
      section: params.section || 'General',
      chunkNumber: params.chunkNumber,
      embeddingModel: params.embeddingModel || 'BAAI/bge-small-en-v1.5',
    };
  }
}
