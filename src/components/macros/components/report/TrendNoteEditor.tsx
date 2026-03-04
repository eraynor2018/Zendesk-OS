import { useState } from 'react';
import Button from '@/components/ui/Button';

interface TrendNoteEditorProps {
  macroTitle: string;
  value: string;
  onSave: (text: string) => void;
}

export default function TrendNoteEditor({ value, onSave }: TrendNoteEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function handleSave() {
    onSave(draft);
    setIsEditing(false);
  }

  function handleCancel() {
    setDraft(value);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="bg-green/5 border border-green/30 rounded-lg p-3 mt-2">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full bg-green/10 border border-green/40 rounded px-2 py-1.5 text-turf text-sm focus:outline-none focus:border-green resize-y"
        />
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={handleSave}>Save</Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green/5 border border-green/20 rounded-lg p-3 mt-2 flex items-start gap-2">
      <p className="text-turf/80 text-sm flex-1 italic">{value}</p>
      <button
        onClick={() => { setDraft(value); setIsEditing(true); }}
        className="text-green hover:text-green/80 transition-colors flex-shrink-0 mt-0.5"
        title="Edit trend note"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      </button>
    </div>
  );
}
