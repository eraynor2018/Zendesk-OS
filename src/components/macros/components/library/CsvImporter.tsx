import { useState, useRef, DragEvent } from 'react';
import { useApp } from '@/components/macros/context/MacroAppContext';
import { parseMacroCsv } from '@/lib/csvParser';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function CsvImporter() {
  const { macros, addMacros } = useApp();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setStatus('error');
      setMessage('Please upload a .csv file.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const parsed = await parseMacroCsv(file);
      const existingTitles = new Set(macros.map((m) => m.title.trim().toLowerCase()));
      const skipped = parsed.filter((p) =>
        existingTitles.has(p.title.trim().toLowerCase())
      ).length;
      const imported = parsed.length - skipped;

      addMacros(parsed);

      setStatus('success');
      setMessage(
        `Imported ${imported} macro${imported !== 1 ? 's' : ''}${
          skipped > 0 ? ` (${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped)` : ''
        }.`
      );
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to parse CSV.');
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="mb-6">
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-green bg-green/5'
            : 'border-pastel/80 hover:border-green/40 hover:bg-green/[0.02]'
        }`}
      >
        <div className="text-pastel mb-2">
          <svg className="mx-auto w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-turf text-sm font-medium">
          Import macros from CSV
        </p>
        <p className="text-slate-green text-xs mt-1">
          Drag & drop or <span className="text-green cursor-pointer">browse files</span>
        </p>
        <p className="text-slate-green/50 text-[11px] mt-2">
          Columns: <code className="bg-pastel/30 px-1 rounded">Macro Title</code> and <code className="bg-pastel/30 px-1 rounded">Body/Comment</code>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {status === 'loading' && (
        <p className="mt-2 text-sm text-slate-green">Parsing CSV...</p>
      )}
      {status === 'success' && (
        <p className="mt-2 text-sm text-green-700">{message}</p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-sm text-red-600">{message}</p>
      )}
    </div>
  );
}
