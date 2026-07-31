import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '../../store/useAppStore.js';
import { apiService } from '../../services/api.js';
import { DocumentList } from './DocumentList.js';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const UploadDialog: React.FC = () => {
  const { isUploadDialogOpen, setUploadDialogOpen, addDocument, settings } = useAppStore();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [customChunkSize, setCustomChunkSize] = useState(settings.chunkSize);
  const [customChunkOverlap, setCustomChunkOverlap] = useState(settings.chunkOverlap);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/csv': ['.csv'],
      'text/html': ['.html'],
    },
    onDrop: (acceptedFiles) => {
      setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
    },
  });

  if (!isUploadDialogOpen) return null;

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    try {
      const res = await apiService.uploadFiles(selectedFiles, {
        namespace: settings.namespace,
        chunkSize: customChunkSize,
        chunkOverlap: customChunkOverlap,
      });

      res.documents.forEach((doc) => addDocument(doc));
      toast.success(`Successfully ingested ${res.documents.length} document(s)!`);
      setSelectedFiles([]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to process document upload.');
    } finally {
      setUploading(false);
    }
  };

  const removeSelected = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Document Management Hub</h3>
          </div>
          <button
            onClick={() => setUploadDialogOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Dropzone Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-sky-500 bg-sky-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
            }`}
          >
            <input {...getInputProps()} />
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-200">
              Drag & drop files here, or <span className="text-sky-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supported Formats: PDF, DOCX, TXT, MD, CSV, HTML (Max 10MB per file)
            </p>
          </div>

          {/* Configuration Overrides */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Chunk Size ({customChunkSize} chars)
              </label>
              <input
                type="range"
                min={200}
                max={3000}
                step={100}
                value={customChunkSize}
                onChange={(e) => setCustomChunkSize(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Chunk Overlap ({customChunkOverlap} chars)
              </label>
              <input
                type="range"
                min={0}
                max={500}
                step={50}
                value={customChunkOverlap}
                onChange={(e) => setCustomChunkOverlap(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>
          </div>

          {/* Pending Upload Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Files Ready for Ingestion ({selectedFiles.length})
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-slate-200 truncate">{file.name}</span>
                      <span className="text-slate-500 font-mono">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeSelected(idx)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-600/20 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Parsing & Embedding Documents...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ingest Documents to Pinecone</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Uploaded Document Library */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ingested Knowledge Base
            </h4>
            <DocumentList />
          </div>
        </div>
      </div>
    </div>
  );
};
