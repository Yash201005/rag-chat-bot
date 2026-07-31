import React from 'react';
import { motion } from 'framer-motion';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 rounded-xl border border-slate-700/40 w-fit">
      <span className="text-xs text-slate-400 font-medium mr-1">Analyzing context</span>
      {[0, 1, 2].map((idx) => (
        <motion.span
          key={idx}
          className="w-1.5 h-1.5 bg-sky-400 rounded-full"
          animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, delay: idx * 0.2 }}
        />
      ))}
    </div>
  );
};
