import { useCallback } from 'react';
import { Macro } from '@/types';
import useLocalStorage from './useLocalStorage';

function useMacros() {
  const [macros, setMacros] = useLocalStorage<Macro[]>('mrv2_macros', []);

  const addMacro = useCallback(
    (title: string, body: string) => {
      const id = crypto.randomUUID();
      setMacros((prev) => [...prev, { id, title, body }]);
    },
    [setMacros]
  );

  const addMacros = useCallback(
    (incoming: Array<{ title: string; body: string }>) => {
      setMacros((prev) => {
        const existingTitles = new Set(prev.map((m) => m.title.trim().toLowerCase()));
        const newMacros: Macro[] = [];
        for (const { title, body } of incoming) {
          if (!existingTitles.has(title.trim().toLowerCase())) {
            newMacros.push({ id: crypto.randomUUID(), title, body });
            existingTitles.add(title.trim().toLowerCase());
          }
        }
        return [...prev, ...newMacros];
      });
    },
    [setMacros]
  );

  const deleteMacro = useCallback(
    (id: string) => {
      setMacros((prev) => prev.filter((m) => m.id !== id));
    },
    [setMacros]
  );

  const searchMacros = useCallback(
    (query: string): Macro[] => {
      if (!query.trim()) return macros;
      const q = query.toLowerCase();
      return macros.filter(
        (m) =>
          m.title.toLowerCase().includes(q) || m.body.toLowerCase().includes(q)
      );
    },
    [macros]
  );

  return { macros, addMacro, addMacros, deleteMacro, searchMacros };
}

export default useMacros;
