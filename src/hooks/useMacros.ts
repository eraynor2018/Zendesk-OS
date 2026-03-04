import { useCallback, useEffect, useRef } from 'react';
import { Macro } from '@/types';
import useLocalStorage from './useLocalStorage';
import { generateTagFromTitle } from '@/lib/matching';

function useMacros() {
  const [macros, setMacros] = useLocalStorage<Macro[]>('mrv2_macros', []);
  const migrated = useRef(false);

  // Migrate existing macros that lack a tag field
  useEffect(() => {
    if (migrated.current || macros.length === 0) return;
    const needsMigration = macros.some((m) => !m.tag);
    if (needsMigration) {
      setMacros(
        macros.map((m) => (m.tag ? m : { ...m, tag: generateTagFromTitle(m.title) }))
      );
    }
    migrated.current = true;
  }, [macros, setMacros]);

  const addMacro = useCallback(
    (title: string, body: string, tag?: string) => {
      const id = crypto.randomUUID();
      const resolvedTag = tag || generateTagFromTitle(title);
      setMacros((prev) => [...prev, { id, title, body, tag: resolvedTag }]);
    },
    [setMacros]
  );

  const addMacros = useCallback(
    (incoming: Array<{ title: string; body: string; tag?: string }>) => {
      setMacros((prev) => {
        const existingTitles = new Set(prev.map((m) => m.title.trim().toLowerCase()));
        const newMacros: Macro[] = [];
        for (const { title, body, tag } of incoming) {
          if (!existingTitles.has(title.trim().toLowerCase())) {
            newMacros.push({
              id: crypto.randomUUID(),
              title,
              body,
              tag: tag || generateTagFromTitle(title),
            });
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
          m.title.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          (m.tag || '').toLowerCase().includes(q)
      );
    },
    [macros]
  );

  return { macros, addMacro, addMacros, deleteMacro, searchMacros };
}

export default useMacros;
