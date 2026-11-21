// BORROWED DARK — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The greenhouse walls: an emerald frame the player and guards stay inside. */
export const WALL = 26;

export const PLAYER = {
  radius: 13,
  speed: 185,
  sneakSpeed: 105,
  carrySpeed: 132,
  carrySneakSpeed: 88,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 72,
  stalkSpeed: 105,
  chaseSpeed: 168,
  viewRange: 255,
  viewRangeSneak: 205,
  halfAngle: 0.58, // ~33 degrees each side of the facing direction
  waypointPause: 1.4,
  suspicionRiseNear: 62, // per second, player close in the cone
  suspicionRiseFar: 30, // per second, player at the cone's edge
  suspicionDecay: 16, // per second, out of sight
  alertAt: 100,
  suspiciousAt: 60,
  losePatienceAt: 30, // suspicion below this: a suspicious guard gives up
  catchRadius: 27,
};

/** A stolen shadow only lasts this long before it slips back to its plant. */
export const SHADOW = {
  naturalRx: 52,
  naturalRy: 30,
  carriedRx: 34,
  carriedRy: 22,
  placedRx: 48,
  placedRy: 30,
  stealRange: 78,
  pickupRange: 52,
  lifetime: 25,
};

export const PALETTE = {
  backdrop: '#0e1a13',
  floor: '#f1ecdc',
  floorAlt: '#e9e2cd',
  tileLine: '#ddd5bd',
  wall: '#1d5c3f',
  wallTop: '#2a7a54',
  planter: '#b5654a',
  planterDark: '#8f4a35',
  soil: '#4a3226',
  shrub: '#3f7d4e',
  shrubLight: '#57a05f',
  leaf: '#2e7d46',
  leafLight: '#4da56a',
  leafDark: '#1f5c33',
  trunk: '#6b4a2f',
  shadow: '#0c0c10',
  cone: 'rgba(245, 158, 11, 0.30)',
  coneEdge: 'rgba(245, 158, 11, 0.75)',
  coneSuspicious: 'rgba(249, 115, 22, 0.38)',
  coneAlert: 'rgba(239, 68, 68, 0.38)',
  guard: '#232a3a',
  guardVisor: '#f59e0b',
  player: '#2f6b4f',
  playerHood: '#1e4d36',
  exitGlow: '#fde68a',
  exitDoor: '#0f766e',
  text: '#1c2b21',
  textLight: '#f4efe0',
  muted: '#6b7a6e',
  panel: '#fbf8ef',
  panelEdge: '#1d5c3f',
  gold: '#d97706',
  danger: '#dc2626',
  ok: '#15803d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best (fastest) escape time is kept between visits (this browser only). */
export const BEST_KEY = 'borrowed-dark.best-ms';
export const MUTE_KEY = 'borrowed-dark.muted';
