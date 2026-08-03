import React, { useState } from 'react';
import { ChatMessage } from '../../types/frontend';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SourceCard } from './SourceCard';
import { Bot, User, Copy, Check, Clock, Cpu, Layers, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  message: ChatMessage;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 max-w-4xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/10 shrink-0 mt-1">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div className={`space-y-3 max-w-3xl ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Main Content Card */}
        <div
          className={`p-4 rounded-2xl text-sm leading-relaxed border shadow-sm relative group ${
            isUser
              ? 'bg-sky-600 text-white border-sky-500 rounded-tr-none'
              : 'bg-slate-900/80 text-slate-200 border-slate-800 rounded-tl-none backdrop-blur-md'
          }`}
        >
          <MarkdownRenderer content={message.content} />

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
              isUser
                ? 'hover:bg-sky-700 text-sky-100'
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Copy message"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Assistant Metrics & Sources Attribution */}
        {!isUser && (
          <div className="space-y-2 text-xs">
            {/* Live Performance Telemetry Badge */}
            {message.metrics && (
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  {message.metrics.totalResponseTimeMs}ms
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  Retrieval: {message.metrics.retrievalTimeMs}ms
                </span>
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-emerald-400" />
                  {message.metrics.totalTokens} tokens
                </span>
              </div>
            )}

            {/* Citations Section */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 border-t border-slate-800/80 pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Verified Citation Sources ({message.sources.length})
                  </span>
                  <button
                    onClick={() => setShowSources(!showSources)}
                    className="text-[11px] text-sky-400 hover:underline"
                  >
                    {showSources ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showSources && (
                  <div className="grid grid-cols-1 gap-2">
                    {message.sources.map((src, idx) => (
                      <SourceCard key={idx} source={src} index={idx} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700 shrink-0 mt-1">
          <User className="w-4 h-4" />
        </div>
      )}
    </motion.div>
  );
};
