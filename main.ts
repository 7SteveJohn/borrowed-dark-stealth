// Borrowed Dark — the program the grader runs to hand the game in.
//
// The game itself is plain static files in game/ (game/index.html plus its
// ES modules: no build step, no network request, desktop Chrome opens it and
// plays). This entrypoint just gathers what the judge needs into the output
// directory: the game, the screenshots, and a dossier.json summary built by
// the vendored make.fun library.
//
// Run it anywhere with:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader's container the output directory is /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The folder this file sits in, and the folder the grader reads afterwards.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(source, target) {
  cpSync(join(repoRoot, source), join(outDir, target), { recursive: true });
}

mkdirSync(outDir, { recursive: true });

// The playable game, exactly as it sits in the repository.
copyTree('game', 'game');

// The real renders of the game. The first by name is the cover.
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  copyTree('screenshots', 'screenshots');
}

// The summary the judge reads: source outline, screenshots, and the caps
// the scorer enforces (a screenshot over 256 KiB, more than 4 of them, or a
// game folder over 48 MiB / 993 files would be refused, so the dossier is
// built with those limits in mind).
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
