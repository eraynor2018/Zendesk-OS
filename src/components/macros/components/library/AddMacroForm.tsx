import { useState, useEffect, FormEvent } from 'react';
import { useApp } from '@/components/macros/context/MacroAppContext';
import { generateTagFromTitle } from '@/lib/matching';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function AddMacroForm() {
  const { macros, addMacro } = useApp();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('');
  const [tagTouched, setTagTouched] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Auto-fill tag from title unless user has manually edited it
  useEffect(() => {
    if (!tagTouched) {
      setTag(generateTagFromTitle(title));
    }
  }, [title, tagTouched]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Title is required.'); return; }
    if (!body.trim()) { setError('Body is required.'); return; }

    const duplicate = macros.find(
      (m) => m.title.trim().toLowerCase() === title.trim().toLowerCase()
    );
    if (duplicate) {
      setError(`A macro with the title "${title.trim()}" already exists.`);
      return;
    }

    addMacro(title.trim(), body.trim(), tag.trim() || undefined);
    setTitle('');
    setBody('');
    setTag('');
    setTagTouched(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  }

  if (!isOpen) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setIsOpen(true)}
          className="text-sm text-green hover:text-green/80 font-medium transition-colors"
        >
          + Add macro manually
        </button>
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <h3 className="text-sm font-semibold text-turf mb-3">Add Macro Manually</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Macro Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Auto-send: No Swap ID"
        />
        <Input
          label="Zendesk Tag"
          value={tag}
          onChange={(e) => { setTag(e.target.value); setTagTouched(true); }}
          placeholder="e.g. auto_send_no_swap_id"
        />
        <div>
          <label className="block text-sm font-medium text-turf/80 mb-1.5">
            Body / Comment
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Paste the macro body here..."
            rows={3}
            className="w-full bg-white border border-pastel/80 rounded-lg px-3 py-2 text-turf text-sm placeholder-slate-green/40 shadow-sm focus:outline-none focus:border-green focus:ring-1 focus:ring-green/20 transition-colors resize-y"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">Macro added successfully.</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm">Add Macro</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
