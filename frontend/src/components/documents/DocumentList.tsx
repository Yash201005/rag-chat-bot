import React from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { apiService } from '../../services/api.js';
import { formatBytes } from '../../lib/utils.js';
import { FileText, Trash2, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

export const DocumentList: React.FC = () => {
  const { documents, removeDocument } = useAppStore();

  const handleDelete = async (id: string, filename: string) => {
    try {
      await apiService.deleteDocument(id);
      removeDocument(id);
      toast.success(`Deleted '${filename}' and associated vectors.`);
    } catch (err: any) {
      toast.error('Failed to delete document.');
    }
  };

  if (documents.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/60">
        No documents uploaded yet. Drag & drop files above to populate your vector database.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs transition-colors hover:border-slate-700"
        >
          <div className="flex items-center gap-3 truncate">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h5 className="font-medium text-slate-200 truncate">{doc.filename}</h5>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <span>{formatBytes(doc.size)}</span>
                <span>•</span>
                <span className="uppercase text-sky-400 font-semibold">{doc.fileType}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {doc.chunkCount} chunks
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {doc.status === 'indexed' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                <CheckCircle2 className="w-3 h-3" /> Indexed
              </span>
            )}
            {doc.status === 'error' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold">
                <AlertTriangle className="w-3 h-3" /> Error
              </span>
            )}

            <button
              onClick={() => handleDelete(doc.id, doc.filename)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
