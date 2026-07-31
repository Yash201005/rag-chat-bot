import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '../../store/useAppStore.js';
import { apiService } from '../../services/api.js';
import { UploadCloud, FileText, CheckCircle2, Loader2, X, Sliders } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onSuccess: () => void;
}

export const OnboardingUploadScreen: React.FC<Props> = ({ onSuccess }) => {
  const { addDocument, settings } = useAppStore();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      toast.success('✓ Document indexed successfully. You can now ask questions.');
      setSelectedFiles([]);
      onSuccess();
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
    <div className="h-full flex flex-col items-center justify-center p-6 max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Heading & Description */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto shadow-xl shadow-sky-500/10">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Upload Documents</h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Upload one or more documents to begin chatting with your AI assistant.
        </p>
      </div>

      {/* Main Drag-and-Drop Area */}
      <div className="w-full space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-sky-500 bg-sky-500/10'
              : 'border-slate-800 hover:border-sky-500/50 bg-slate-900/60 backdrop-blur-md'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-10 h-10 text-sky-400 mx-auto mb-3 opacity-90" />
          <p className="text-sm font-semibold text-slate-200">
            Drag and drop your files here
          </p>
          <p className="text-xs text-slate-400 mt-1">
            or click to browse from your computer
          </p>

          <button
            type="button"
            className="mt-4 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all"
          >
            Upload Documents
          </button>

          <p className="text-[11px] text-slate-500 mt-4">
            Supported file types: <strong className="text-slate-400">PDF, DOCX, TXT, MD, CSV, HTML</strong> (Max 10MB per file)
          </p>
        </div>

        {/* Selected Files Staging List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span>Ready for Processing ({selectedFiles.length})</span>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-slate-500 hover:text-slate-300 flex items-center gap-1 text-[11px]"
              >
                <Sliders className="w-3 h-3" />
                <span>{showAdvanced ? 'Hide Settings' : 'Chunk Settings'}</span>
              </button>
            </div>

            {/* Collapsible Chunk Settings */}
            {showAdvanced && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px]">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Chunk Size: <strong className="text-white">{customChunkSize}</strong>
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
                    Chunk Overlap: <strong className="text-white">{customChunkOverlap}</strong>
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
            )}

            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-slate-200 truncate">{file.name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => removeSelected(idx)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xl shadow-sky-600/20 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Parsing, Chunking & Vectorizing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ingest & Start Chatting</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
