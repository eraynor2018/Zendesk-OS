import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  Macro,
  Ticket,
  MatchResult,
  AnalysisResult,
  ReportState,
} from '@/types';
import useMacros from '@/hooks/useMacros';
import useApiKey from '@/hooks/useApiKey';
import { matchMacrosToTickets } from '@/lib/matching';
import { authFetch } from '@/lib/api';

interface AnalysisProgress {
  current: number;
  total: number;
  currentMacroTitle: string;
}

interface AppContextValue {
  macros: Macro[];
  addMacro: (title: string, body: string, tag?: string) => void;
  addMacros: (incoming: Array<{ title: string; body: string; tag?: string }>) => void;
  deleteMacro: (id: string) => void;
  searchMacros: (query: string) => Macro[];

  apiKey: string;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  hasApiKey: boolean;

  tickets: Ticket[];
  setTickets: (tickets: Ticket[]) => void;

  selectedMacroIds: Set<string>;
  toggleMacroSelection: (id: string) => void;
  selectAllMacros: () => void;
  clearMacroSelection: () => void;

  matchResult: MatchResult | null;
  runMatching: () => void;

  analysisResults: AnalysisResult[];
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgress;
  analysisErrors: Array<{ macroTitle: string; error: string }>;
  runAnalysis: () => Promise<void>;

  reportState: ReportState | null;
  updateTrendNote: (macroTitle: string, note: string) => void;

  resetSession: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function MacroAppProvider({ children }: { children: ReactNode }) {
  const { macros, addMacro, addMacros, deleteMacro, searchMacros } = useMacros();
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApiKey();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedMacroIds, setSelectedMacroIds] = useState<Set<string>>(
    new Set()
  );
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    current: 0,
    total: 0,
    currentMacroTitle: '',
  });
  const [analysisErrors, setAnalysisErrors] = useState<
    Array<{ macroTitle: string; error: string }>
  >([]);
  const [reportState, setReportState] = useState<ReportState | null>(null);

  const toggleMacroSelection = useCallback((id: string) => {
    setSelectedMacroIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllMacros = useCallback(() => {
    setSelectedMacroIds(new Set(macros.map((m) => m.id)));
  }, [macros]);

  const clearMacroSelection = useCallback(() => {
    setSelectedMacroIds(new Set());
  }, []);

  const runMatching = useCallback(() => {
    const selectedMacros = macros.filter((m) => selectedMacroIds.has(m.id));
    const result = matchMacrosToTickets(selectedMacros, tickets);
    setMatchResult(result);
    setAnalysisResults([]);
    setReportState(null);
    setAnalysisErrors([]);
  }, [macros, selectedMacroIds, tickets]);

  const runAnalysis = useCallback(async () => {
    if (!matchResult || matchResult.matched.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisResults([]);
    setAnalysisErrors([]);
    setReportState(null);

    const matched = matchResult.matched;
    const results: AnalysisResult[] = [];
    const errors: Array<{ macroTitle: string; error: string }> = [];

    setAnalysisProgress({ current: 0, total: matched.length, currentMacroTitle: '' });

    for (let i = 0; i < matched.length; i++) {
      const { macro, matchedTickets } = matched[i];
      setAnalysisProgress({
        current: i + 1,
        total: matched.length,
        currentMacroTitle: macro.title,
      });

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (apiKey) headers['X-Api-Key'] = apiKey;

        const res = await authFetch('/api/analyze', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            macroTitle: macro.title,
            macroBody: macro.body,
            tickets: matchedTickets,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          errors.push({
            macroTitle: macro.title,
            error: data.error || `HTTP ${res.status}`,
          });
        } else {
          results.push(data as AnalysisResult);
        }
      } catch (err) {
        errors.push({
          macroTitle: macro.title,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    setAnalysisResults(results);
    setAnalysisErrors(errors);
    setReportState({ results, editedTrendNotes: {} });
    setIsAnalyzing(false);
  }, [matchResult, apiKey]);

  const updateTrendNote = useCallback((macroTitle: string, note: string) => {
    setReportState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        editedTrendNotes: { ...prev.editedTrendNotes, [macroTitle]: note },
      };
    });
  }, []);

  const resetSession = useCallback(() => {
    setTickets([]);
    setSelectedMacroIds(new Set());
    setMatchResult(null);
    setAnalysisResults([]);
    setAnalysisErrors([]);
    setReportState(null);
    setAnalysisProgress({ current: 0, total: 0, currentMacroTitle: '' });
  }, []);

  const value: AppContextValue = {
    macros,
    addMacro,
    addMacros,
    deleteMacro,
    searchMacros,
    apiKey,
    setApiKey,
    clearApiKey,
    hasApiKey,
    tickets,
    setTickets,
    selectedMacroIds,
    toggleMacroSelection,
    selectAllMacros,
    clearMacroSelection,
    matchResult,
    runMatching,
    analysisResults,
    isAnalyzing,
    analysisProgress,
    analysisErrors,
    runAnalysis,
    reportState,
    updateTrendNote,
    resetSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within MacroAppProvider');
  return ctx;
}
