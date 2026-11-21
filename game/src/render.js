// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the margin
// filled with the backdrop colour. All art is drawn in code — ivory greenhouse
// floor, emerald walls, ink palm shadows, amber vision cones, the glowing exit.

import { FIELD, FONT, GUARD, PALETTE, PLAYER, WALL } from './config.js';
import { EXIT, PLANTERS } from './level.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';

const PANEL = { width: 880, top: 150, line: 32, bottom: 76 };
const TILE = 80;

function formatTime(ms) {
  const total = Math.max(0, ms) / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  const tenths = Math.floor((total * 10) % 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, dpr: 1 };
  const fonts = new Map();
  let timeMs = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    view.dpr = ratio;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  function ellipse(x, y, rx, ry) {
    context.beginPath();
    context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }

  // ---- the greenhouse -------------------------------------------------------

  function drawFloor() {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Checker of pale tiles, with faint grout lines.
    for (let ty = 0; ty < FIELD.height / TILE; ty += 1) {
      for (let tx = 0; tx < FIELD.width / TILE; tx += 1) {
        if ((tx + ty) % 2 === 0) {
          context.fillStyle = PALETTE.floorAlt;
          context.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        }
      }
    }
    context.strokeStyle = PALETTE.tileLine;
    context.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += TILE) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, FIELD.height);
      context.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += TILE) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
      context.stroke();
    }
    // Glass-roof mullions: long diagonal light seams across the floor.
    context.strokeStyle = 'rgba(255,255,255,0.35)';
    context.lineWidth = 5;
    for (let i = -6; i < 14; i += 1) {
      context.beginPath();
      context.moveTo(i * 160, 0);
      context.lineTo(i * 160 + 420, FIELD.height);
      context.stroke();
    }
    // Emerald walls.
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, WALL);
    context.fillRect(0, FIELD.height - WALL, FIELD.width, WALL);
    context.fillRect(0, 0, WALL, FIELD.height);
    context.fillRect(FIELD.width - WALL, 0, WALL, FIELD.height);
    context.fillStyle = PALETTE.wallTop;
    context.fillRect(0, WALL - 4, FIELD.width, 4);
    context.fillRect(0, FIELD.height - WALL, FIELD.width, 4);
    context.fillRect(WALL - 4, 0, 4, FIELD.height);
    context.fillRect(FIELD.width - WALL, 0, 4, FIELD.height);
  }

  function drawExit() {
    const cx = EXIT.x + EXIT.w / 2;
    const cy = EXIT.y + EXIT.h / 2;
    // Pulsing glow spilling out of the doorway.
    const pulse = 0.55 + 0.25 * Math.sin(timeMs / 450);
    const glow = context.createRadialGradient(cx, cy, 8, cx, cy, 190);
    glow.addColorStop(0, `rgba(253, 230, 138, ${0.75 * pulse + 0.25})`);
    glow.addColorStop(1, 'rgba(253, 230, 138, 0)');
    context.fillStyle = glow;
    context.fillRect(cx - 200, cy - 200, 400, 400);
    // The doorway itself, cut into the top wall.
    context.fillStyle = PALETTE.exitDoor;
    context.fillRect(EXIT.x, EXIT.y - 14, EXIT.w, EXIT.h + 14);
    context.fillStyle = PALETTE.exitGlow;
    context.fillRect(EXIT.x + 8, EXIT.y - 6, EXIT.w - 16, EXIT.h - 2);
    // Light rays inside the door.
    context.strokeStyle = 'rgba(255,255,255,0.85)';
    context.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const x = EXIT.x + 20 + i * 20;
      context.beginPath();
      context.moveTo(x, EXIT.y + EXIT.h - 6);
      context.lineTo(x + 8, EXIT.y + 4);
      context.stroke();
    }
    text('EXIT', cx, EXIT.y + EXIT.h + 24, 20, PALETTE.gold, 'center');
  }

  function drawShadowBlob(x, y, rx, ry, alpha) {
    context.fillStyle = `rgba(12, 12, 16, ${alpha})`;
    ellipse(x, y, rx, ry);
    context.fill();
    // Ragged edge: a few smaller lobes so it reads as a palm shadow, not a disc.
    context.fillStyle = `rgba(12, 12, 16, ${alpha * 0.9})`;
    ellipse(x - rx * 0.55, y + ry * 0.35, rx * 0.45, ry * 0.5);
    context.fill();
    ellipse(x + rx * 0.5, y - ry * 0.3, rx * 0.4, ry * 0.45);
    context.fill();
  }

  /** The tendrils still tying a stolen shadow to the plant it was taken from. */
  function drawTendrils(plant, sx, sy) {
    const wobble = plant.seed * 40 - 20;
    context.strokeStyle = 'rgba(12, 12, 16, 0.95)';
    context.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      const spread = i * 14;
      const midX = (plant.x + sx) / 2 + wobble + spread;
      const midY = (plant.y + sy) / 2 + spread * 0.6;
      context.lineWidth = 6 - Math.abs(i);
      context.beginPath();
      context.moveTo(plant.x, plant.y);
      context.quadraticCurveTo(midX, midY, sx + spread * 0.5, sy + spread * 0.4);
      context.stroke();
    }
  }

  function drawPlanter(p) {
    context.fillStyle = PALETTE.planterDark;
    context.fillRect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);
    context.fillStyle = PALETTE.planter;
    context.fillRect(p.x, p.y, p.w, p.h);
    context.fillStyle = PALETTE.soil;
    context.fillRect(p.x + 6, p.y + 6, p.w - 12, p.h - 12);
    // Low shrubs in the soil.
    const count = Math.max(2, Math.floor(p.w / 46));
    for (let i = 0; i < count; i += 1) {
      const cx = p.x + ((i + 0.5) / count) * p.w;
      const cy = p.y + p.h / 2;
      context.fillStyle = i % 2 ? PALETTE.shrub : PALETTE.shrubLight;
      context.beginPath();
      context.arc(cx, cy, 13, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.arc(cx - 8, cy + 4, 8, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawPlant(plant) {
    // Seven long fronds fanning out from the trunk, seen from above.
    for (let i = 0; i < 7; i += 1) {
      const angle = plant.lean + (i / 7) * Math.PI * 2;
      const len = 62 + ((i * 37 + plant.seed * 100) % 26);
      const tipX = plant.x + Math.cos(angle) * len;
      const tipY = plant.y + Math.sin(angle) * len * 0.82;
      context.fillStyle = i % 2 ? PALETTE.leaf : PALETTE.leafLight;
      context.beginPath();
      context.ellipse(
        (plant.x + tipX) / 2, (plant.y + tipY) / 2,
        len / 2, 11, angle, 0, Math.PI * 2,
      );
      context.fill();
      // Centre vein.
      context.strokeStyle = PALETTE.leafDark;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(plant.x, plant.y);
      context.lineTo(tipX, tipY);
      context.stroke();
    }
    context.fillStyle = PALETTE.trunk;
    context.beginPath();
    context.arc(plant.x, plant.y, 9, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#8a6a44';
    context.beginPath();
    context.arc(plant.x - 2, plant.y - 2, 4, 0, Math.PI * 2);
    context.fill();
  }

  // ---- guards and the player -------------------------------------------------

  function drawCone(guard) {
    const range = GUARD.viewRange;
    let fill = PALETTE.cone;
    let edge = PALETTE.coneEdge;
    if (guard.mode === 'chase') {
      fill = PALETTE.coneAlert;
      edge = 'rgba(239, 68, 68, 0.8)';
    } else if (guard.suspicion >= GUARD.suspiciousAt) {
      fill = PALETTE.coneSuspicious;
      edge = 'rgba(249, 115, 22, 0.8)';
    }
    context.fillStyle = fill;
    context.beginPath();
    context.moveTo(guard.x, guard.y);
    context.arc(guard.x, guard.y, range, guard.angle - GUARD.halfAngle, guard.angle + GUARD.halfAngle);
    context.closePath();
    context.fill();
    context.strokeStyle = edge;
    context.lineWidth = 2;
    context.stroke();
  }

  function drawGuard(guard) {
    context.fillStyle = PALETTE.guard;
    context.beginPath();
    context.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#3a4358';
    context.beginPath();
    context.arc(guard.x, guard.y, GUARD.radius - 5, 0, Math.PI * 2);
    context.fill();
    // Amber visor, facing the way the guard looks.
    context.fillStyle = PALETTE.guardVisor;
    context.beginPath();
    context.arc(guard.x, guard.y, GUARD.radius - 3,
      guard.angle - 0.55, guard.angle + 0.55);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.guard;
    context.beginPath();
    context.arc(guard.x + Math.cos(guard.angle) * 4, guard.y + Math.sin(guard.angle) * 4, 3, 0, Math.PI * 2);
    context.fill();
    if (guard.mode === 'chase') {
      text('!', guard.x, guard.y - GUARD.radius - 8, 26, PALETTE.danger, 'center');
    } else if (guard.suspicion >= GUARD.suspiciousAt) {
      text('?', guard.x, guard.y - GUARD.radius - 8, 26, PALETTE.gold, 'center');
    }
  }

  function drawPlayer(player) {
    const r = player.sneak ? 11 : PLAYER.radius;
    // A soft ring when hidden inside a shadow, so the cover reads at a glance.
    if (player.hidden) {
      context.strokeStyle = 'rgba(255,255,255,0.75)';
      context.lineWidth = 2;
      context.setLineDash([6, 5]);
      context.beginPath();
      context.arc(player.x, player.y, r + 7, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
    // Cloak and hood of the escaped prisoner.
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(player.x, player.y, r, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.playerHood;
    context.beginPath();
    context.arc(player.x, player.y - 2, r - 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#e8dcc0';
    context.beginPath();
    context.arc(player.x, player.y - 2, 3.5, 0, Math.PI * 2);
    context.fill();
    if (player.sneak) {
      context.strokeStyle = 'rgba(30,77,54,0.9)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(player.x, player.y, r + 3, 0.4, Math.PI - 0.4);
      context.stroke();
    }
  }

  // ---- HUD and panels ---------------------------------------------------------

  function drawHud(state) {
    const player = state.player;
    context.textBaseline = 'top';
    text('OBJECTIVE — Reach the glowing exit, unseen', 40, 40, 19, PALETTE.text, 'left');
    const shadow = state.stolen;
    let shadowText = 'SHADOW — none stolen';
    if (player.carrying) shadowText = `SHADOW — carrying it (${Math.ceil(shadow.timeLeft)}s left)`;
    else if (shadow.active) shadowText = `SHADOW — placed (${Math.ceil(shadow.timeLeft)}s left)`;
    text(shadowText, 40, 66, 17, PALETTE.muted, 'left');

    text(formatTime(state.elapsed * 1000), FIELD.width / 2, 40, 26, PALETTE.text, 'center');

    // The detection eye: it fills amber, then red, as suspicion rises.
    // (Left, under the shadow line — the top-right corner is covered by the DOM buttons.)
    const eyeX = 66;
    const eyeY = 108;
    context.strokeStyle = state.seen ? PALETTE.danger : PALETTE.text;
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(eyeX, eyeY, 26, 14, 0, 0, Math.PI * 2);
    context.stroke();
    const fillR = 3 + (state.suspicion / 100) * 8;
    context.fillStyle = state.suspicion >= 100 ? PALETTE.danger
      : state.suspicion >= 60 ? '#f97316' : PALETTE.gold;
    context.beginPath();
    context.arc(eyeX, eyeY, fillR, 0, Math.PI * 2);
    context.fill();
    const statusText = player.hidden ? 'HIDDEN' : state.seen ? 'SEEN!' : 'UNSEEN';
    const statusColor = player.hidden ? PALETTE.ok : state.seen ? PALETTE.danger : PALETTE.text;
    text(statusText, eyeX + 40, eyeY - 12, 22, statusColor, 'left');
    text('detection', eyeX + 40, eyeY + 14, 15, PALETTE.muted, 'left');

    if (state.message) {
      const w = 720;
      context.fillStyle = 'rgba(28, 43, 33, 0.82)';
      context.fillRect((FIELD.width - w) / 2, FIELD.height - 112, w, 34);
      text(state.message, FIELD.width / 2, FIELD.height - 103, 18, PALETTE.textLight, 'center', 'top');
    }
    text('WASD / arrows move · Shift sneak · E grab or drop shadow · Click to move · P pause · M mute',
      FIELD.width / 2, FIELD.height - WALL - 26, 15, PALETTE.muted, 'center', 'top');
  }

  // Word-wrap a panel line to the panel's inner width (20px font).
  function wrapLine(value, maxWidth) {
    context.font = `20px ${FONT}`;
    const words = value.split(' ');
    const out = [];
    let current = '';
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word;
      if (context.measureText(trial).width <= maxWidth || !current) current = trial;
      else { out.push(current); current = word; }
    }
    if (current) out.push(current);
    return out;
  }

  function drawPanel(title, lines, prompt) {
    const wrapped = lines.flatMap((line) => (line === '' ? [''] : wrapLine(line, PANEL.width - 80)));
    const height = PANEL.top + wrapped.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(14, 26, 19, 0.45)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < wrapped.length; index += 1) {
      text(wrapped[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 22, PALETTE.gold, 'center');
  }

  function drawField(state) {
    drawFloor();
    drawExit();
    // Shadows lie on the floor, under everything else.
    for (const plant of state.plants) {
      if (plant.stolen) continue;
      drawShadowBlob(plant.x + plant.dx, plant.y + plant.dy, plant.rx, plant.ry, 0.85);
    }
    if (state.stolen.active) {
      const s = state.stolen;
      const plant = state.plants[s.source];
      drawShadowBlob(s.x, s.y, s.rx, s.ry, 0.88);
      if (plant) drawTendrils(plant, s.x, s.y);
    }
    // Vision cones wash over the floor, then planters stand in front of them.
    for (const guard of state.guards) drawCone(guard);
    for (const p of PLANTERS) drawPlanter(p);
    for (const plant of state.plants) drawPlant(plant);
    for (const guard of state.guards) drawGuard(guard);
    drawPlayer(state.player);
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, bestMs, muted) {
    timeMs = performance.now();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      const bestLine = bestMs > 0 ? `Best escape — ${formatTime(bestMs)}` : 'No escape yet — the greenhouse is waiting.';
      drawPanel('BORROWED DARK', [
        'A brightly lit greenhouse prison. You are the escaped prisoner.',
        'Steal shadows off the giant palms and drag them where you need cover.',
        'Only one stolen shadow at a time — and it fades. Planters block sight.',
        'Slip past the amber vision cones. Reach the glowing exit, unseen.',
        '',
        bestLine,
      ], 'Press Space or click to begin the escape');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The guards will wait for you.'], 'Press P to resume');
    } else if (screen === SCREEN_WON) {
      const lines = [
        `You slipped out unseen in ${formatTime(state.elapsed * 1000)}.`,
        bestMs > 0 ? `Best escape — ${formatTime(bestMs)}` : '',
        'The borrowed dark carried you home.',
      ];
      drawPanel('ESCAPED', lines, 'Press Space or click to play again');
    } else if (screen === SCREEN_LOST) {
      drawPanel('CAUGHT', [
        'A guard closed in and the greenhouse lights came up.',
        'The shadows are still there. Try a slower route.',
      ], 'Press Space or click to try again');
    }
    if (muted) text('muted', FIELD.width - 40, FIELD.height - WALL - 26, 14, PALETTE.muted, 'right', 'top');
  }

  /** Convert a pointer position in page pixels to field coordinates, or null outside. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (canvas.width / rect.width);
    const py = (clientY - rect.top) * (canvas.height / rect.height);
    const fx = (px - view.x) / view.scale;
    const fy = (py - view.y) / view.scale;
    if (fx < 0 || fy < 0 || fx > FIELD.width || fy > FIELD.height) return null;
    return { x: fx, y: fy };
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
