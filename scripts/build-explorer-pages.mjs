import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, 'explorer/dist');
const output = resolve(root, 'dist/client');
const collection = JSON.parse(readFileSync(resolve(source, 'collection.json'), 'utf8'));
if (!Array.isArray(collection.records) || collection.records.length !== 0) {
  throw new Error('Public Pages deployment requires an empty collection seed.');
}
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(source, output, { recursive: true });
writeFileSync(resolve(output, '.nojekyll'), '');
console.log('Sillage explorer prepared in dist/client');
