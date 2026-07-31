import React, { useState } from 'react';
import { CitationSource } from '../../types/frontend.js';
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface Props {
  source: CitationSource;
  index: number;
}

export const SourceCard: React.FC<Props> = ({ source, index }) => {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (score >= 65) return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden text-xs transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 hover:bg-slate-800/40 text-left transition-colors"
      >
        <div className="flex items-center gap-2 truncate pr-2">
          <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-medium text-slate-300 truncate">
            {source.filename}
          </span>
          <span className="text-slate-500 text-[11px] shrink-0">
            (Page {source.page})
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getScoreColor(
              source.similarityScore
            )}`}
          >
            {source.similarityScore}% Match
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-slate-400 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Section: {source.section}</span>
            <span>ID: {source.chunkId.slice(0, 12)}...</span>
          </div>
          <div className="p-2 rounded bg-slate-900/90 border border-slate-800/60 font-mono text-[11px] text-slate-300 leading-relaxed max-h-36 overflow-y-auto custom-scrollbar">
            {source.textSnippet}
          </div>
        </div>
      )}
    </div>
  );
};
