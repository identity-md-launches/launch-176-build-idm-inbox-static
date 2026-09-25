import { readdir, readFile } from 'node:fs/promises';
import { gzipSize } from 'gzip-size';
const files=(await readdir('dist/assets')).filter(f=>!f.endsWith('.map'));let total=0;for(const file of files)total+=await gzipSize(await readFile(`dist/assets/${file}`));console.log(`dist/assets gzip total: ${(total/1024).toFixed(2)} KB`);

