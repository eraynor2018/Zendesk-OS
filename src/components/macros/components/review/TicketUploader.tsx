import { useState, useRef, DragEvent } from 'react';
import { useApp } from '@/components/macros/context/MacroAppContext';
import { parseTicketFile } from '@/lib/ticketParser';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface TicketUploaderProps {
  onNext: () => void;
}

export default function TicketUploader({ onNext }: TicketUploaderProps) {
  const { tickets, setTickets } = useApp();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus('loading');
    setMessage('');
    try {
      const parsed = await parseTicketFile(file);
      setTickets(parsed);
      setStatus('success');
      setMessage(
        `Loaded ${parsed.length} ticket${parsed.length !== 1 ? 's' : ''} from ${file.name}`
      );
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to parse ticket file.');
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-sm font-semibold text-turf/80 mb-1">Supported formats</h3>
        <ul className="text-xs text-slate-green space-y-0.5">
          <li>• NDJSON — one ticket JSON object per line</li>
          <li>• JSON array — <code className="bg-pastel/50 px-1 rounded">[&#123;...&#125;, &#123;...&#125;]</code></li>
          <li>• Wrapped JSON — <code className="bg-pastel/50 px-1 rounded">&#123;&quot;tickets&quot;: [...]&#125;</code></li>
        </ul>
      </Card>

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-green bg-green/5 shadow-inner'
            : 'border-pastel hover:border-green/40 hover:bg-green/[0.02]'
        }`}
      >
        <div className="text-slate-green/50 mb-3">
          <svg className="mx-auto w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-turf/70 font-medium mb-1">Upload ticket export file</p>
        <p className="text-slate-green/60 text-sm">
          Drag & drop or <span className="text-green underline">click to browse</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".json,.ndjson,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {status === 'loading' && <p className="text-sm text-slate-green">Parsing file...</p>}
      {status === 'success' && (
        <Card variant="green">
          <p className="text-green-700 text-sm font-medium">{message}</p>
        </Card>
      )}
      {status === 'error' && (
        <Card variant="red">
          <p className="text-red-700 text-sm font-medium">{message}</p>
          <p className="text-red-500 text-xs mt-1">
            Check the file format and try again.
          </p>
        </Card>
      )}

      {tickets.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={onNext}>
            Continue with {tickets.length} tickets →
          </Button>
        </div>
      )}
    </div>
  );
}
