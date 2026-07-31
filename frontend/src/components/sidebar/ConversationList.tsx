import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { MessageSquare, Trash2, Search } from 'lucide-react';

export const ConversationList: React.FC = () => {
  const { sessions, activeSessionId, setActiveSessionId, deleteSession } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-2">
      {/* Search Input */}
      <div className="relative px-3 pt-2">
        <Search className="w-3.5 h-3.5 absolute left-5 top-4 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search history..."
          className="w-full pl-8 pr-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/60"
        />
      </div>

      {/* Sessions Scroll List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        {filteredSessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                isActive
                  ? 'bg-sky-600/20 text-sky-200 border border-sky-500/30 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate pr-2">
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                <span className="truncate">{session.title}</span>
              </div>

              {sessions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                  title="Delete session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
