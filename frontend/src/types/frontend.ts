export type SupportedFileType = 'pdf' | 'txt' | 'docx' | 'md' | 'csv' | 'html';
export type SearchType = 'similarity' | 'mmr';

export interface CitationSource {
  filename: string;
  page: number;
  chunkId: string;
  similarityScore: number;
  textSnippet: string;
  section: string;
}

export interface RAGMetrics {
  totalResponseTimeMs: number;
  embeddingTimeMs: number;
  retrievalTimeMs: number;
  generationTimeMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: CitationSource[];
  metrics?: RAGMetrics;
  timestamp: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  namespace: string;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  fileType: SupportedFileType;
  size: number;
  chunkCount: number;
  namespace: string;
  uploadedAt: string;
  status: 'processing' | 'indexed' | 'error';
  errorMessage?: string;
}

export interface SystemMetrics {
  totalQueries: number;
  totalDocuments: number;
  totalChunksIndexed: number;
  avgResponseTimeMs: number;
  avgRetrievalTimeMs: number;
  avgEmbeddingTimeMs: number;
  totalTokensProcessed: number;
}

export interface AppSettings {
  topK: number;
  similarityThreshold: number;
  searchType: SearchType;
  chunkSize: number;
  chunkOverlap: number;
  temperature: number;
  maxTokens: number;
  namespace: string;
  theme: 'dark' | 'light';
}
