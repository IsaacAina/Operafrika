#!/usr/bin/env node
/* Regenerate the raster favicon/logos from public/icon.svg.
   Requires @resvg/resvg-js (devDependency).
   Usage: node scripts/regenerate-favicons.mjs */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = (...p) => join(ROOT, 'public', ...p);

const BG_SVG = readFileSync(pub('icon.svg'), 'utf8');

const TRANSPARENT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <path d="M 352 247
           L 432 247
           A 176 176 0 1 0 247 432
           L 247 352
           A 96 96 0 1 1 352 247
           Z" fill="#FFFFFF"/>
  <path d="M 247 432
           A 185 185 0 0 0 432 247
           L 404 152
           L 377 247
           A 130 130 0 0 1 247 377
           L 247 432
           Z" fill="#38A0FF"/>
</svg>
`;

function rasterize(svg, size) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  return resvg.render().asPng();
}

function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4); // image count
  const dirs = [];
  let offset = 6 + entries.length * 16;
  for (const e of entries) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(e.size < 256 ? e.size : 0, 0);
    dir.writeUInt8(e.size < 256 ? e.size : 0, 1);
    dir.writeUInt8(0, 2);
    dir.writeUInt8(0, 3);
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(e.data.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += e.data.length;
    dirs.push(dir);
  }
  return Buffer.concat([
    header,
    Buffer.concat(dirs),
    ...entries.map((e) => e.data),
  ]);
}

const jobs = [];
const add = (path, size, source = BG_SVG) =>
  jobs.push({ path, size, source });

add(pub('favicon.ico'), 0); // special-cased below

// Colored (blue rounded-square) downloads from icon.svg
add(pub('icon.png'), 512);
add(pub('apple-icon.png'), 180);
add(pub('logo/operafrika_logo_16x16.png'), 16);
add(pub('logo/operafrika_logo_32x32.png'), 32);
add(pub('logo/operafrika_logo_192x192.png'), 192);
add(pub('logo/operafrika_logo_512x512.png'), 512);
add(pub('logo/operafrika-logo-blue-bg-512x512.png'), 512);

// Transparent-mark downloads from the transparent source
add(pub('logo/operafrika_logo_16x16_transparent.png'), 16, TRANSPARENT_SVG);
add(pub('logo/operafrika_logo_32x32_transparent.png'), 32, TRANSPARENT_SVG);
add(pub('logo/operafrika_logo_192x192_transparent.png'), 192, TRANSPARENT_SVG);
add(pub('logo/operafrika_logo_512x512_transparent.png'), 512, TRANSPARENT_SVG);

for (const job of jobs) {
  if (job.path.endsWith('favicon.ico')) continue;
  writeFileSync(job.path, rasterize(job.source, job.size));
  console.log(`wrote ${job.path} (${job.size}x${job.size})`);
}

const ico = buildIco([
  { size: 16, data: rasterize(BG_SVG, 16) },
  { size: 32, data: rasterize(BG_SVG, 32) },
]);
writeFileSync(pub('favicon.ico'), ico);
console.log('wrote public/favicon.ico (16 + 32 PNG payloads)');