import { useEffect, useRef } from 'react';
import { useApp } from '@/components/macros/context/MacroAppContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

interface AnalysisRunnerProps {
  onNext: () => void;
  onBack: () => void;
}

export default function AnalysisRunner({ onNext, onBack }: AnalysisRunnerProps) {
  const {
    runAnalysis,
    isAnalyzing,
    analysisProgress,
    analysisErrors,
    analysisResults,
  } = useApp();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      runAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDone = !isAnalyzing && analysisResults.length > 0;
  const progressPct =
    analysisProgress.total > 0
      ? Math.round((analysisProgress.current / analysisProgress.total) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {isAnalyzing && (
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <Spinner size="md" />
            <div>
              <p className="text-turf text-sm font-medium">
                Analyzing macro {analysisProgress.current} of {analysisProgress.total}
              </p>
              {analysisProgress.currentMacroTitle && (
                <p className="text-slate-green text-xs mt-0.5">
                  &ldquo;{analysisProgress.currentMacroTitle}&rdquo;
                </p>
              )}
            </div>
          </div>
          <div className="w-full bg-pastel/50 rounded-full h-2">
            <div
              className="bg-green h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-green/70 mt-1 text-right">{progressPct}%</p>
        </Card>
      )}

      {isDone && (
        <Card variant="green">
          <p className="text-green-700 text-sm font-medium">
            Analysis complete —{' '}
            {analysisResults.length} macro{analysisResults.length !== 1 ? 's' : ''} analyzed.
          </p>
        </Card>
      )}

      {analysisErrors.length > 0 && (
        <Card variant="red">
          <p className="text-red-700 text-sm font-medium mb-2">
            {analysisErrors.length} macro{analysisErrors.length !== 1 ? 's' : ''} failed:
          </p>
          <ul className="space-y-1">
            {analysisErrors.map((e) => (
              <li key={e.macroTitle} className="text-xs text-red-500">
                <strong>{e.macroTitle}:</strong> {e.error}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={isAnalyzing}>
          ← Back
        </Button>
        <div className="flex gap-2">
          {!isAnalyzing && analysisErrors.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                hasRun.current = false;
                runAnalysis();
              }}
            >
              Retry
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={isAnalyzing || analysisResults.length === 0}
          >
            View Report →
          </Button>
        </div>
      </div>
    </div>
  );
}
