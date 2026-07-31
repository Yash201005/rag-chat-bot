import React from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { ConversationList } from './ConversationList.js';
import { ThemeToggle } from '../common/ThemeToggle.js';
import { Plus, FileText, Settings, Activity, Cpu, Layers } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    addSession,
    documents,
    setUploadDialogOpen,
    setSettingsOpen,
    setMetricsOpen,
    systemMetrics,
  } = useAppStore();

  const handleNewChat = () => {
    const newSession = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      namespace: 'default',
    };
    addSession(newSession);
  };

  return (
    <aside className="w-72 h-full glass-panel border-r border-slate-800/80 flex flex-col justify-between shrink-0">
      {/* Top Header & New Chat */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold text-base shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">RAG Enterprise</h2>
              <span className="text-[10px] text-sky-400 font-medium px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                v1.0 Production
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/15 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Sessions Navigation List */}
      <ConversationList />

      {/* Footer Navigation & Status */}
      <div className="p-3 border-t border-slate-800/80 space-y-2 bg-slate-950/40">
        {/* Document Stats Badge */}
        <button
          onClick={() => setUploadDialogOpen(true)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 text-xs text-slate-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Documents ({documents.length})</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {documents.reduce((acc, d) => acc + d.chunkCount, 0)} chunks
          </span>
        </button>

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => setMetricsOpen(true)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Metrics</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
