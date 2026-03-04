import { useState } from 'react';
import { useApp } from '@/components/macros/context/MacroAppContext';
import PageShell from '@/components/layout/PageShell';
import TicketUploader from '@/components/macros/components/review/TicketUploader';
import MacroSelector from '@/components/macros/components/review/MacroSelector';
import MatchingSummary from '@/components/macros/components/review/MatchingSummary';
import AnalysisRunner from '@/components/macros/components/review/AnalysisRunner';
import ReportView from '@/components/macros/components/report/ReportView';
import Button from '@/components/ui/Button';

const STEPS = [
  'Upload Tickets',
  'Select Macros',
  'Match Tickets',
  'AI Analysis',
];

export default function MacroReviewPage() {
  const { resetSession, reportState } = useApp();
  const [step, setStep] = useState(0);

  function handleReset() {
    resetSession();
    setStep(0);
  }

  const isReport = step === 4;

  return (
    <PageShell
      title="Review Session"
      description="Upload tickets, select macros, and generate an AI-powered usage report."
    >
      {reportState && step === 0 && (
        <div className="mb-6 flex items-center justify-between bg-green/5 border border-green/20 rounded-lg px-4 py-3">
          <p className="text-sm text-turf/80">You have a report from this session.</p>
          <Button size="sm" variant="secondary" onClick={() => setStep(4)}>
            View Report
          </Button>
        </div>
      )}

      {!isReport && (
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border-2 transition-colors ${
                  i < step
                    ? 'bg-green border-green text-white'
                    : i === step
                    ? 'border-green text-green'
                    : 'border-pastel text-pastel'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  i === step ? 'text-turf' : 'text-slate-green'
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-pastel mx-1" />}
            </div>
          ))}
        </div>
      )}

      {step === 0 && <TicketUploader onNext={() => setStep(1)} />}
      {step === 1 && <MacroSelector onNext={() => setStep(2)} onBack={() => setStep(0)} />}
      {step === 2 && <MatchingSummary onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <AnalysisRunner onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <ReportView onReset={handleReset} />}
    </PageShell>
  );
}
