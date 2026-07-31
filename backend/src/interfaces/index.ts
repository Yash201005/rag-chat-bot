import { 
  SupportedFileType, 
  ChunkMetadata, 
  VectorSearchResult, 
  RAGMetrics, 
  CitationSource,
  SearchType 
} from '../types/index.js';

export interface LoadedDocument {
  pageContent: string;
  metadata: {
    page: number;
    section: string;
    source: string;
  };
}

export interface IDocumentLoader {
  load(filePath: string, filename: string): Promise<LoadedDocument[]>;
}

export interface IEmbeddingService {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
  getDimension(): number;
}

export interface IPineconeService {
  upsertVectors(
    vectors: { id: string; values: number[]; metadata: Record<string, any> }[],
    namespace?: string
  ): Promise<void>;
  searchVectors(
    queryVector: number[],
    topK: number,
    filter?: Record<string, any>,
    namespace?: string
  ): Promise<VectorSearchResult[]>;
  deleteVectorsByDocumentId(documentId: string, namespace?: string): Promise<void>;
  getIndexStats(): Promise<{ totalVectorCount: number; namespaces: Record<string, any> }>;
}

export interface IRAGQueryOptions {
  question: string;
  sessionId: string;
  namespace?: string;
  topK?: number;
  similarityThreshold?: number;
  searchType?: SearchType;
  temperature?: number;
  maxTokens?: number;
}

export interface IRAGStreamResponse {
  chunk: string;
  isComplete: boolean;
  sources?: CitationSource[];
  metrics?: RAGMetrics;
}
