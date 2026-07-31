import { create } from 'zustand';
import { ChatSession, ChatMessage, DocumentRecord, SystemMetrics, AppSettings } from '../types/frontend.js';

interface AppState {
  sessions: ChatSession[];
  activeSessionId: string;
  documents: DocumentRecord[];
  systemMetrics: SystemMetrics;
  settings: AppSettings;
  isStreaming: boolean;
  isUploadDialogOpen: boolean;
  isSettingsOpen: boolean;
  isMetricsOpen: boolean;

  // Actions
  setSessions: (sessions: ChatSession[]) => void;
  setActiveSessionId: (id: string) => void;
  addSession: (session: ChatSession) => void;
  deleteSession: (id: string) => void;
  
  setMessages: (sessionId: string, messages: ChatMessage[]) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateLastMessage: (sessionId: string, textChunk: string, sources?: any[], metrics?: any) => void;
  
  setDocuments: (documents: DocumentRecord[]) => void;
  addDocument: (doc: DocumentRecord) => void;
  removeDocument: (id: string) => void;

  setSystemMetrics: (metrics: SystemMetrics) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  toggleTheme: () => void;

  setIsStreaming: (isStreaming: boolean) => void;
  setUploadDialogOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setMetricsOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  sessions: [
    {
      id: 'default-session',
      title: 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      namespace: 'default',
    },
  ],
  activeSessionId: 'default-session',
  documents: [],
  systemMetrics: {
    totalQueries: 0,
    totalDocuments: 0,
    totalChunksIndexed: 0,
    avgResponseTimeMs: 0,
    avgRetrievalTimeMs: 0,
    avgEmbeddingTimeMs: 0,
    totalTokensProcessed: 0,
  },
  settings: {
    topK: 4,
    similarityThreshold: 0.3,
    searchType: 'similarity',
    chunkSize: 1000,
    chunkOverlap: 200,
    temperature: 0.2,
    maxTokens: 2048,
    namespace: 'default',
    theme: 'dark',
  },
  isStreaming: false,
  isUploadDialogOpen: false,
  isSettingsOpen: false,
  isMetricsOpen: false,

  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: session.id,
    })),
  deleteSession: (id) =>
    set((state) => {
      const filtered = state.sessions.filter((s) => s.id !== id);
      const newActive =
        state.activeSessionId === id
          ? filtered[0]?.id || 'default-session'
          : state.activeSessionId;
      return { sessions: filtered, activeSessionId: newActive };
    }),

  setMessages: (sessionId, messages) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, messages } : s
      ),
    })),

  addMessage: (sessionId, message) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id === sessionId) {
          const updatedTitle =
            s.title === 'New Conversation' && message.role === 'user'
              ? message.content.slice(0, 35) + (message.content.length > 35 ? '...' : '')
              : s.title;
          return {
            ...s,
            title: updatedTitle,
            messages: [...s.messages, message],
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      }),
    })),

  updateLastMessage: (sessionId, textChunk, sources, metrics) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id === sessionId) {
          const msgs = [...s.messages];
          if (msgs.length === 0) return s;
          const lastMsg = { ...msgs[msgs.length - 1] };
          if (lastMsg.role === 'assistant') {
            lastMsg.content += textChunk;
            if (sources) lastMsg.sources = sources;
            if (metrics) lastMsg.metrics = metrics;
            lastMsg.isStreaming = !sources && !metrics;
            msgs[msgs.length - 1] = lastMsg;
          }
          return { ...s, messages: msgs };
        }
        return s;
      }),
    })),

  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) => set((state) => ({ documents: [doc, ...state.documents] })),
  removeDocument: (id) =>
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),

  setSystemMetrics: (systemMetrics) => set({ systemMetrics }),
  updateSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { settings: { ...state.settings, theme: nextTheme } };
    }),

  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setUploadDialogOpen: (isUploadDialogOpen) => set({ isUploadDialogOpen }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setMetricsOpen: (isMetricsOpen) => set({ isMetricsOpen }),
}));
