import Papa from 'papaparse';
import { generateTagFromTitle } from './matching';

export async function parseMacroCsv(
  file: File
): Promise<Array<{ title: string; body: string; tag: string }>> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        if (rows.length === 0) {
          reject(new Error('CSV file is empty.'));
          return;
        }

        const firstRow = rows[0];
        const keys = Object.keys(firstRow);
        const titleKey = keys.find(
          (k) => k.trim().toLowerCase() === 'macro title'
        );
        const bodyKey = keys.find(
          (k) => k.trim().toLowerCase() === 'body/comment'
        );
        const tagKey = keys.find(
          (k) => k.trim().toLowerCase() === 'tag'
        );

        if (!titleKey || !bodyKey) {
          reject(
            new Error(
              `CSV must have columns "Macro Title" and "Body/Comment". Found: ${keys.join(', ')}`
            )
          );
          return;
        }

        const parsed = rows
          .map((row) => {
            const title = (row[titleKey] || '').trim();
            const body = (row[bodyKey] || '').trim();
            const csvTag = tagKey ? (row[tagKey] || '').trim() : '';
            const tag = csvTag || generateTagFromTitle(title);
            return { title, body, tag };
          })
          .filter((r) => r.title.length > 0 && r.body.length > 0);

        resolve(parsed);
      },
      error: (err: { message: string }) => {
        reject(new Error(`CSV parse error: ${err.message}`));
      },
    });
  });
}
