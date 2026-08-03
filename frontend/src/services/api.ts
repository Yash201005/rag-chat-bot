import axios from 'axios';
import { DocumentRecord, ChatSession, SystemMetrics, CitationSource, RAGMetrics } from '../types/frontend';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://rag-chat-bot-749k.onrender.com/api' : '/api');

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface StreamCallbacks {
  onChunk: (token: string) => void;
  onComplete: (sources: CitationSource[], metrics: RAGMetrics) => void;
  onError: (error: Error) => void;
}

export const apiService = {
  // Documents API
  async uploadFiles(files: File[], options: { namespace?: string; chunkSize?: number; chunkOverlap?: number }) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (options.namespace) formData.append('namespace', options.namespace);
    if (options.chunkSize) formData.append('chunkSize', options.chunkSize.toString());
    if (options.chunkOverlap) formData.append('chunkOverlap', options.chunkOverlap.toString());

    const response = await apiClient.post<{ message: string; documents: DocumentRecord[] }>(
      '/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  async fetchDocuments() {
    const response = await apiClient.get<{ documents: DocumentRecord[] }>('/documents');
    return response.data.documents;
  },

  async deleteDocument(id: string) {
    const response = await apiClient.delete<{ message: string }>(`/documents/${id}`);
    return response.data;
  },

  // Sessions API
  async fetchSessions() {
    const response = await apiClient.get<{ sessions: ChatSession[] }>('/sessions');
    return response.data.sessions;
  },

  async createSession(title?: string, namespace?: string) {
    const response = await apiClient.post<{ session: ChatSession }>('/sessions', { title, namespace });
    return response.data.session;
  },

  async deleteSession(id: string) {
    const response = await apiClient.delete<{ message: string }>(`/sessions/${id}`);
    return response.data;
  },

  // Metrics & Health
  async fetchMetrics() {
    const response = await apiClient.get<{ metrics: SystemMetrics; vectorStoreStats: Record<string, unknown> }>('/metrics');
    return response.data;
  },

  // Streaming Chat API
  async streamChat(
    payload: {
      question: string;
      sessionId: string;
      namespace?: string;
      topK?: number;
      similarityThreshold?: number;
      searchType?: string;
      temperature?: number;
      maxTokens?: number;
    },
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ) {
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, stream: true }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) throw new Error('Response body is unreadable');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '{}') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.token) {
                callbacks.onChunk(parsed.token);
              }
              if (parsed.isComplete) {
                callbacks.onComplete(parsed.sources || [], parsed.metrics || {});
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name !== 'AbortError') {
          callbacks.onError(err);
        }
      } else {
        callbacks.onError(new Error(String(err)));
      }
    }
  },
};
