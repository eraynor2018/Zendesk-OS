import { useState, useRef, DragEvent } from 'react';
import { useApp } from '@/components/macros/context/MacroAppContext';
import { parseMacroCsv } from '@/lib/csvParser';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

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
    <Card className="mb-6">
      <h2 className="text-base font-semibold text-turf mb-3">Import Macros from CSV</h2>
      <p className="text-sm text-slate-green mb-3">
        CSV must have columns:{' '}
        <code className="text-turf/80 bg-pastel/50 px-1 rounded">Macro Title</code> and{' '}
        <code className="text-turf/80 bg-pastel/50 px-1 rounded">Body/Comment</code>.
        Duplicates by title are skipped.
      </p>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-green bg-green/10'
            : 'border-pastel hover:border-slate-green'
        }`}
      >
        <p className="text-slate-green text-sm">
          Drag & drop a CSV file here, or{' '}
          <span className="text-green underline">click to browse</span>
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
        <p className="mt-3 text-sm text-slate-green">Parsing CSV...</p>
      )}
      {status === 'success' && (
        <p className="mt-3 text-sm text-green-400">{message}</p>
      )}
      {status === 'error' && (
        <p className="mt-3 text-sm text-red-400">{message}</p>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="mt-3"
        onClick={() => inputRef.current?.click()}
      >
        + Upload Another CSV
      </Button>
    </Card>
  );
}
