import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';
import { OnboardingUploadScreen } from '../documents/OnboardingUploadScreen';
import { Bot, Download, Trash2, Cpu, ShieldCheck, FileText, Plus, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
}

export const ChatWindow: React.FC<Props> = ({ onSend, onStop }) => {
  const { sessions, activeSessionId, isStreaming, setMessages, documents, setUploadDialogOpen } = useAppStore();
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleUploadSuccess = () => {
    setShowSuccessBanner(true);
    setTimeout(() => setShowSuccessBanner(false), 5000);
  };

  const handleExportMarkdown = () => {
    if (messages.length === 0) {
      toast.error('No messages to export.');
      return;
    }
    const mdContent = messages
      .map((m) => `### ${m.role.toUpperCase()} (${m.timestamp})\n\n${m.content}\n\n`)
      .join('---\n\n');
    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(mdContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `conversation-${activeSessionId}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Conversation exported to Markdown!');
  };

  const handleClearChat = () => {
    if (activeSession) {
      setMessages(activeSession.id, []);
      toast.success('Chat history cleared.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/40 relative">
      {/* Header Bar */}
      <div className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between glass-panel z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md shadow-sky-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white truncate max-w-md">
              {activeSession ? activeSession.title : 'New Conversation'}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-emerald-400" /> LLaMA-3.3-70B • Pinecone Vector DB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {documents.length > 0 && (
            <button
              onClick={() => setUploadDialogOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload More Documents</span>
            </button>
          )}

          {messages.length > 0 && (
            <>
              <button
                onClick={handleExportMarkdown}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-1.5 text-xs"
                title="Export as Markdown"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={handleClearChat}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Clear messages"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Documents Header Bar (Visible when documents exist) */}
      {documents.length > 0 && (
        <div className="px-6 py-2 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
            <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-semibold text-slate-400 shrink-0">
              Uploaded Documents ({documents.length}):
            </span>
            <div className="flex items-center gap-2">
              {documents.map((doc) => (
                <span
                  key={doc.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-200 text-[11px] font-mono shrink-0"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="truncate max-w-[180px]">{doc.filename}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {showSuccessBanner && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>✓ Document indexed successfully. You can now ask questions.</span>
        </div>
      )}

      {/* Main Area: Onboarding Upload Screen OR Active Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {documents.length === 0 ? (
          <OnboardingUploadScreen onSuccess={handleUploadSuccess} />
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-xl shadow-sky-500/5">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Enterprise RAG Intelligence</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Knowledge base active with <strong className="text-sky-400">{documents.length} document(s)</strong>. Ask questions below to query your uploaded files with strict zero-hallucination source attribution.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && (
              <div className="flex gap-3 max-w-4xl mx-auto items-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
                <TypingIndicator />
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar Footer */}
      <div className="border-t border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <ChatInput onSend={onSend} onStop={onStop} />
      </div>
    </div>
  );
};
