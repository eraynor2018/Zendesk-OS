import { useState, FormEvent } from 'react';
import { useApp } from '@/components/macros/context/MacroAppContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function AddMacroForm() {
  const { macros, addMacro } = useApp();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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

    addMacro(title.trim(), body.trim());
    setTitle('');
    setBody('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  }

  return (
    <Card className="mb-6">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between text-base font-semibold text-turf hover:text-turf transition-colors"
      >
        <span>Add Macro Manually</span>
        <span className="text-slate-green text-lg">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <Input
            label="Macro Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Auto-send: No Swap ID"
          />
          <div>
            <label className="block text-sm font-medium text-turf/80 mb-1.5">
              Body / Comment
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste the macro body here..."
              rows={4}
              className="w-full bg-white border border-pastel rounded-md px-3 py-2 text-turf placeholder-slate-green/70 focus:outline-none focus:border-green transition-colors resize-y"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">Macro added successfully.</p>}
          <div className="flex gap-2">
            <Button type="submit">Add Macro</Button>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
