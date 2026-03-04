import { useState } from 'react';
import { useApp } from '@/components/macros/context/MacroAppContext';
import PageShell from '@/components/layout/PageShell';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function MacroSettingsPage() {
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApp();
  const [draft, setDraft] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setApiKey(draft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClear() {
    clearApiKey();
    setDraft('');
  }

  return (
    <PageShell
      title="Settings"
      description="Configure your Anthropic API key for local development."
    >
      <Card className="max-w-xl">
        <h2 className="text-base font-semibold text-turf mb-1">Anthropic API Key</h2>
        <p className="text-sm text-slate-green mb-4">
          Used for AI analysis of support tickets. In production (Vercel), set{' '}
          <code className="bg-pastel/50 px-1 rounded text-turf/80">ANTHROPIC_API_KEY</code> as
          an environment variable — you don&apos;t need to enter it here. This setting is only
          needed for local development.
        </p>

        <div className="space-y-3">
          <div className="relative">
            <Input
              label="API Key"
              mono
              type={showKey ? 'text' : 'password'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="sk-ant-..."
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-8 text-slate-green hover:text-turf text-xs px-1"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={!draft.trim()}>
              Save Key
            </Button>
            <Button variant="secondary" onClick={handleClear} disabled={!hasApiKey}>
              Clear Key
            </Button>
            {saved && <span className="text-sm text-green">Saved!</span>}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-green' : 'bg-pastel'}`} />
            <span className="text-sm text-slate-green">
              {hasApiKey ? 'API key is set in localStorage' : 'No API key stored locally'}
            </span>
          </div>

          <p className="text-xs text-slate-green/70 mt-2">
            Your key is stored only in your browser&apos;s localStorage and is sent only to
            Anthropic&apos;s API via this app&apos;s backend route.
          </p>
        </div>
      </Card>
    </PageShell>
  );
}
