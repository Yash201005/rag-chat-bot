import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { apiService } from '../services/api.js';
import { CitationSource, RAGMetrics } from '../types/frontend.js';
import { Sidebar } from '../components/sidebar/Sidebar.js';
import { ChatWindow } from '../components/chat/ChatWindow.js';
import { UploadDialog } from '../components/documents/UploadDialog.js';
import { SettingsPanel } from '../components/settings/SettingsPanel.js';
import { MetricsPanel } from '../components/analytics/MetricsPanel.js';
import { ToastProvider } from '../components/common/ToastProvider.js';
import toast from 'react-hot-toast';

export const DashboardPage: React.FC = () => {
  const {
    activeSessionId,
    settings,
    addMessage,
    updateLastMessage,
    setIsStreaming,
    setDocuments,
    setSessions,
    setUploadDialogOpen,
  } = useAppStore();

  const abortControllerRef = useRef<AbortController | null>(null);

  // Initial Data Synchronization
  useEffect(() => {
    const initData = async () => {
      try {
        const [docs, sess] = await Promise.all([
          apiService.fetchDocuments().catch(() => []),
          apiService.fetchSessions().catch(() => []),
        ]);
        if (docs.length > 0) setDocuments(docs);
        if (sess.length > 0) setSessions(sess);
      } catch (err) {
        console.error('Data initialization error:', err);
      }
    };
    initData();
  }, []);

  const handleSendMessage = async (text: string) => {
    const sessionId = activeSessionId;

    // 1. Append User Message
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: text,
      timestamp: new Date().toISOString(),
    };
    addMessage(sessionId, userMsg);

    // 2. Prepare Assistant Streaming Message Placeholder
    const assistantMsg = {
      id: `assistant-${Date.now()}`,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };
    addMessage(sessionId, assistantMsg);
    setIsStreaming(true);

    // 3. Initiate SSE Streaming Chat Request
    abortControllerRef.current = new AbortController();

    await apiService.streamChat(
      {
        question: text,
        sessionId,
        namespace: settings.namespace,
        topK: settings.topK,
        similarityThreshold: settings.similarityThreshold,
        searchType: settings.searchType,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      },
      {
        onChunk: (token: string) => {
          updateLastMessage(sessionId, token);
        },
        onComplete: (sources: CitationSource[], metrics: RAGMetrics) => {
          updateLastMessage(sessionId, '', sources, metrics);
          setIsStreaming(false);
        },
        onError: (err: any) => {
          toast.error(err.message || 'Stream processing error.');
          updateLastMessage(
            sessionId,
            "\n\n*Error: Unable to process response from AI pipeline.*",
            [],
            undefined
          );
          setIsStreaming(false);
        },
      },
      abortControllerRef.current.signal
    );
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      toast('Generation halted by user.', { icon: 'ℹ️' });
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <ToastProvider />
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <ChatWindow onSend={handleSendMessage} onStop={handleStopGeneration} />
      </main>

      {/* Interactive Overlay Modals */}
      <UploadDialog />
      <SettingsPanel />
      <MetricsPanel />
    </div>
  );
};
