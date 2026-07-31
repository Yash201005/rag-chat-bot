import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy } from 'lucide-react';

interface Props {
  content: string;
}

export const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');

          if (!inline && match) {
            return <CodeBlock language={match[1]} value={codeString} />;
          }
          return (
            <code
              className="bg-slate-800 text-sky-300 font-mono text-xs px-1.5 py-0.5 rounded border border-slate-700/50"
              {...props}
            >
              {children}
            </code>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3 rounded-lg border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-xs">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return <th className="px-3 py-2 bg-slate-900/80 text-left font-semibold text-slate-300">{children}</th>;
        },
        td({ children }) {
          return <td className="px-3 py-2 border-t border-slate-800 text-slate-300">{children}</td>;
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noreferrer" className="text-sky-400 underline hover:text-sky-300">
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const CodeBlock: React.FC<{ language: string; value: string }> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900/90 text-xs text-slate-400 font-mono border-b border-slate-800">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
};
