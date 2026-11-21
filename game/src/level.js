// The greenhouse level: walls, solid planter boxes, tall palms, guards and the exit,
// plus the small geometry helpers the rules and the renderer share.
// Coordinates are in the 1280x720 field; the layout is fixed so every run plays the same.

import { FIELD, SHADOW, WALL } from './config.js';

/** Solid planter boxes: permanent cover that also blocks a guard's line of sight. */
export const PLANTERS = [
  { x: 300, y: 120, w: 180, h: 58 },
  { x: 560, y: 300, w: 200, h: 58 },
  { x: 860, y: 140, w: 58, h: 200 },
  { x: 240, y: 460, w: 58, h: 160 },
  { x: 700, y: 520, w: 220, h: 58 },
  { x: 1000, y: 420, w: 140, h: 58 },
];

/**
 * Tall palms. Each casts a natural ink shadow offset from its trunk; stealing that
 * shadow (shadow dx/dy and radii travel with the shadow) leaves the plant bare.
 */
export const PLANTS = [
  { x: 180, y: 200, dx: 46, dy: 30, rx: SHADOW.naturalRx, ry: SHADOW.naturalRy, lean: -0.5, seed: 0.11 },
  { x: 470, y: 180, dx: -42, dy: 34, rx: 56, ry: 30, lean: 0.4, seed: 0.37 },
  { x: 640, y: 430, dx: 48, dy: 22, rx: 54, ry: 30, lean: -0.3, seed: 0.62 },
  { x: 950, y: 300, dx: -44, dy: 30, rx: 58, ry: 32, lean: 0.5, seed: 0.81 },
  { x: 1080, y: 580, dx: -40, dy: -26, rx: 52, ry: 28, lean: -0.6, seed: 0.24 },
];

/** The glowing greenhouse exit: a doorway in the top-right wall. */
export const EXIT = { x: 1130, y: 46, w: 96, h: 64 };

export const PLAYER_START = { x: 112, y: 626 };

// Guard patrols live in world.js (makeGuards); the routes there are the ones that
// run. The routes were chosen so no patrol crosses a planter box:
// G1 runs y=250 clear of P1/P2, G2 runs x=980 clear of P3/P6,
// G3 runs y=600 below P5, G4 runs x=1080 clear of P3/P6.

// ---- geometry helpers -------------------------------------------------------

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** Smallest absolute angle between two directions, 0..PI. */
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** True when point (px, py) lies inside the ellipse centred at (cx, cy). */
export function pointInEllipse(px, py, cx, cy, rx, ry) {
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** True when the segment (x1,y1)-(x2,y2) touches or crosses the rectangle. */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const { x, y, w, h } = rect;
  if (x1 >= x && x1 <= x + w && y1 >= y && y1 <= y + h) return true;
  if (x2 >= x && x2 <= x + w && y2 >= y && y2 <= y + h) return true;
  return (
    segmentsCross(x1, y1, x2, y2, x, y, x + w, y) ||
    segmentsCross(x1, y1, x2, y2, x + w, y, x + w, y + h) ||
    segmentsCross(x1, y1, x2, y2, x + w, y + h, x, y + h) ||
    segmentsCross(x1, y1, x2, y2, x, y + h, x, y)
  );
}

/** True when the segment is blocked by any planter (or the field walls). */
export function lineBlocked(x1, y1, x2, y2) {
  for (const p of PLANTERS) if (segmentHitsRect(x1, y1, x2, y2, p)) return true;
  return false;
}

/** True when a circle of radius r at (x, y) overlaps a rectangle. */
export function circleHitsRect(x, y, r, rect) {
  const cx = clamp(x, rect.x, rect.x + rect.w);
  const cy = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

/**
 * Move a circle one axis at a time, stopping at planters and the walls.
 * Returns the new position; mutating the passed object keeps the pool allocation-free.
 */
export function moveCircle(body, dx, dy) {
  const r = body.radius;
  let nx = clamp(body.x + dx, WALL + r, FIELD.width - WALL - r);
  let blocked = false;
  for (const p of PLANTERS) if (circleHitsRect(nx, body.y, r, p)) { blocked = true; break; }
  if (!blocked) body.x = nx;
  let ny = clamp(body.y + dy, WALL + r, FIELD.height - WALL - r);
  blocked = false;
  for (const p of PLANTERS) if (circleHitsRect(body.x, ny, r, p)) { blocked = true; break; }
  if (!blocked) body.y = ny;
  return body;
}
