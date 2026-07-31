import React from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { X, Settings, Sliders, Cpu, Database, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export const SettingsPanel: React.FC = () => {
  const { isSettingsOpen, setSettingsOpen, settings, updateSettings } = useAppStore();

  if (!isSettingsOpen) return null;

  const handleSave = () => {
    toast.success('RAG settings saved successfully!');
    setSettingsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">RAG Pipeline Configuration</h3>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-xs text-slate-300">
          {/* Retrieval Settings Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              Retrieval & Vector Search Parameters
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Search Algorithm
                </label>
                <select
                  value={settings.searchType}
                  onChange={(e) => updateSettings({ searchType: e.target.value as any })}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="similarity">Cosine Similarity</option>
                  <option value="mmr">Maximum Marginal Relevance (MMR)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Top-K Retrieved Chunks ({settings.topK})
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={settings.topK}
                  onChange={(e) => updateSettings({ topK: Number(e.target.value) })}
                  className="w-full accent-sky-500 mt-2"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">
                Similarity Threshold ({settings.similarityThreshold})
              </label>
              <input
                type="range"
                min={0.1}
                max={0.95}
                step={0.05}
                value={settings.similarityThreshold}
                onChange={(e) => updateSettings({ similarityThreshold: Number(e.target.value) })}
                className="w-full accent-sky-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Filters out chunks with similarity scores below this threshold.
              </p>
            </div>
          </div>

          {/* LLM Parameters Section */}
          <div className="space-y-4 pt-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Groq LLaMA-3.3-70B Parameters
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Temperature ({settings.temperature})
                </label>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.1}
                  value={settings.temperature}
                  onChange={(e) => updateSettings({ temperature: Number(e.target.value) })}
                  className="w-full accent-sky-500 mt-2"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Max Tokens ({settings.maxTokens})
                </label>
                <input
                  type="range"
                  min={256}
                  max={4096}
                  step={256}
                  value={settings.maxTokens}
                  onChange={(e) => updateSettings({ maxTokens: Number(e.target.value) })}
                  className="w-full accent-sky-500 mt-2"
                />
              </div>
            </div>
          </div>

          {/* Namespace Configuration */}
          <div className="space-y-2 pt-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Database className="w-4 h-4 text-indigo-400" />
              Pinecone Namespace Target
            </h4>
            <input
              type="text"
              value={settings.namespace}
              onChange={(e) => updateSettings({ namespace: e.target.value })}
              placeholder="default"
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-600/20"
          >
            <Save className="w-4 h-4" />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
