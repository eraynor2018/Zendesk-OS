import { useState } from 'react';
import { AnalysisResult } from '@/types';
import { generatePlainTextReport } from '@/lib/reportGenerator';
import Button from '@/components/ui/Button';

interface CopyReportButtonProps {
  results: AnalysisResult[];
  editedTrendNotes: Record<string, string>;
}

export default function CopyReportButton({ results, editedTrendNotes }: CopyReportButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = generatePlainTextReport(results, editedTrendNotes);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant={copied ? 'secondary' : 'primary'}
      onClick={handleCopy}
      className={copied ? 'text-green' : ''}
    >
      {copied ? '✓ Copied!' : 'Copy Report'}
    </Button>
  );
}
