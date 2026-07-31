import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, SlidersHorizontal, Sparkles, UploadCloud } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import toast from 'react-hot-toast';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
}

export const ChatInput: React.FC<Props> = ({ onSend, onStop }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming, settings, updateSettings, setUploadDialogOpen, documents } = useAppStore();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isStreaming) return;

    if (documents.length === 0) {
      toast('Please upload your documents first!', { icon: '📄' });
      setUploadDialogOpen(true);
      return;
    }

    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const prevDocCount = useRef(documents.length);

  useEffect(() => {
    if (prevDocCount.current === 0 && documents.length > 0) {
      textareaRef.current?.focus();
    }
    prevDocCount.current = documents.length;
  }, [documents.length]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-3">
      {/* Search Mode Toggle & Upload Quick Trigger */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              updateSettings({
                searchType: settings.searchType === 'similarity' ? 'mmr' : 'similarity',
              })
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
            title="Toggle between Cosine Similarity and Maximum Marginal Relevance search"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span>Search: <strong className="text-white capitalize">{settings.searchType}</strong></span>
          </button>

          <span className="text-slate-600">|</span>

          <span className="text-slate-500">Top-K: {settings.topK}</span>
        </div>

        <button
          onClick={() => setUploadDialogOpen(true)}
          className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors font-medium"
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span>Upload Files</span>
        </button>
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-center rounded-2xl bg-slate-900/90 border border-slate-800 transition-all shadow-xl shadow-slate-950/50 backdrop-blur-md ${
          documents.length === 0
            ? 'opacity-60 cursor-not-allowed border-slate-800/50'
            : 'focus-within:border-sky-500/80 focus-within:ring-1 focus-within:ring-sky-500/50'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={text}
          disabled={documents.length === 0 || isStreaming}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            documents.length === 0
              ? 'Upload a document to start chatting...'
              : 'Ask a question based on your uploaded documents...'
          }
          rows={1}
          className="w-full pl-4 pr-14 py-3.5 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none custom-scrollbar disabled:cursor-not-allowed"
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors"
              title="Stop generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!text.trim() || documents.length === 0}
              className="p-2.5 rounded-xl bg-sky-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky-500 transition-colors shadow-lg shadow-sky-600/20"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export const SuggestedPrompts: React.FC<{ onSelect: (text: string) => void }> = ({ onSelect }) => {
  const prompts = [
    'Summarize key findings from the uploaded document.',
    'List all critical technical specifications mentioned.',
    'Extract safety guidelines and page references.',
    'What are the deployment steps described in the text?',
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl mx-auto my-6">
      {prompts.map((p, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(p)}
          className="p-3 text-left rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-sky-500/50 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
        >
          <span>{p}</span>
          <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0 ml-2" />
        </button>
      ))}
    </div>
  );
};
