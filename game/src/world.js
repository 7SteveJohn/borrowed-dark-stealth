// BORROWED DARK — the rules and state, with no drawing and no browser in it:
// the escaped prisoner, the guards and their vision cones, the stolen shadow,
// detection, winning and being caught. step() advances one fixed step and returns
// what happened as bit flags, so the caller can react without the world knowing
// about screens or sound.

import { FIELD, GUARD, PLAYER, SHADOW, WALL } from './config.js';
import {
  angleDiff,
  clamp,
  dist,
  EXIT,
  lineBlocked,
  moveCircle,
  PLANTERS,
  PLANTS,
  PLAYER_START,
  pointInEllipse,
} from './level.js';

export const EVENT_CAUGHT = 1;
export const EVENT_WON = 2;
export const EVENT_STEAL = 4;
export const EVENT_PLACE = 8;
export const EVENT_PICKUP = 16;
export const EVENT_ALERT = 32;
export const EVENT_SPOTTED = 64;
export const EVENT_FADE = 128;

const MODE_PATROL = 'patrol';
const MODE_STALK = 'stalk';
const MODE_CHASE = 'chase';

function makeGuards() {
  return [
    {
      x: 380, y: 250, angle: 0, mode: MODE_PATROL, wpIndex: 1, pause: 0,
      suspicion: 0, lastSeen: { x: 0, y: 0 }, seenTimer: 0, baseAngle: 0,
      spotted: false, scanPhase: 0,
      waypoints: [{ x: 380, y: 250 }, { x: 800, y: 250 }],
    },
    {
      x: 980, y: 200, angle: Math.PI / 2, mode: MODE_PATROL, wpIndex: 1, pause: 0,
      suspicion: 0, lastSeen: { x: 0, y: 0 }, seenTimer: 0, baseAngle: Math.PI / 2,
      spotted: false, scanPhase: 0,
      waypoints: [{ x: 980, y: 200 }, { x: 980, y: 500 }],
    },
    {
      x: 420, y: 600, angle: 0, mode: MODE_PATROL, wpIndex: 1, pause: 0,
      suspicion: 0, lastSeen: { x: 0, y: 0 }, seenTimer: 0, baseAngle: 0,
      spotted: false, scanPhase: 0,
      waypoints: [{ x: 420, y: 600 }, { x: 980, y: 600 }],
    },
    {
      x: 1080, y: 150, angle: Math.PI / 2, mode: MODE_PATROL, wpIndex: 1, pause: 0,
      suspicion: 0, lastSeen: { x: 0, y: 0 }, seenTimer: 0, baseAngle: Math.PI / 2,
      spotted: false, scanPhase: 0,
      waypoints: [{ x: 1080, y: 150 }, { x: 1080, y: 380 }],
    },
  ];
}

export function createWorld(random) {
  const player = {
    x: PLAYER_START.x, y: PLAYER_START.y, radius: PLAYER.radius,
    sneak: false, hidden: false, carrying: false, target: null, moving: false,
  };
  const plants = PLANTS.map((p) => ({ ...p, stolen: false }));
  const stolen = {
    active: false, carried: false, x: 0, y: 0,
    rx: SHADOW.placedRx, ry: SHADOW.placedRy, source: -1, timeLeft: 0,
  };
  const guards = makeGuards();
  const state = {
    player, plants, stolen, guards,
    elapsed: 0, status: 'playing', suspicion: 0, seen: false,
    message: '', messageTimer: 0, bestMs: 0,
  };

  function reset() {
    player.x = PLAYER_START.x;
    player.y = PLAYER_START.y;
    player.sneak = false;
    player.hidden = false;
    player.carrying = false;
    player.target = null;
    player.moving = false;
    for (const plant of plants) plant.stolen = false;
    stolen.active = false;
    stolen.carried = false;
    stolen.source = -1;
    stolen.timeLeft = 0;
    for (let i = 0; i < guards.length; i += 1) {
      const fresh = makeGuards()[i];
      Object.assign(guards[i], fresh);
    }
    state.elapsed = 0;
    state.status = 'playing';
    state.suspicion = 0;
    state.seen = false;
    state.message = '';
    state.messageTimer = 0;
  }

  function say(text, seconds) {
    state.message = text;
    state.messageTimer = seconds;
  }

  /** Where a plant's natural shadow sits; null when the shadow has been stolen. */
  function naturalShadow(plant) {
    if (plant.stolen) return null;
    return { x: plant.x + plant.dx, y: plant.y + plant.dy, rx: plant.rx, ry: plant.ry };
  }

  /** True when the player is standing inside any shadow right now. */
  function computeHidden() {
    for (const plant of plants) {
      const shadow = naturalShadow(plant);
      if (shadow && pointInEllipse(player.x, player.y, shadow.x, shadow.y, shadow.rx, shadow.ry)) return true;
    }
    if (stolen.active) {
      if (pointInEllipse(player.x, player.y, stolen.x, stolen.y, stolen.rx, stolen.ry)) return true;
    }
    return false;
  }

  /** Can this guard see the player right now (cone, range, line of sight)? */
  function canSee(guard) {
    if (player.hidden) return false;
    const range = player.sneak ? GUARD.viewRangeSneak : GUARD.viewRange;
    const d = dist(guard.x, guard.y, player.x, player.y);
    if (d > range) return false;
    const toPlayer = Math.atan2(player.y - guard.y, player.x - guard.x);
    if (angleDiff(toPlayer, guard.angle) > GUARD.halfAngle) return false;
    return !lineBlocked(guard.x, guard.y, player.x, player.y);
  }

  function moveGuardToward(guard, tx, ty, speed, dt) {
    const d = dist(guard.x, guard.y, tx, ty);
    if (d < 4) return true;
    const stepLen = Math.min(d, speed * dt);
    const nx = guard.x + ((tx - guard.x) / d) * stepLen;
    const ny = guard.y + ((ty - guard.y) / d) * stepLen;
    const body = { x: guard.x, y: guard.y, radius: GUARD.radius };
    moveCircle(body, nx - guard.x, ny - guard.y);
    guard.x = body.x;
    guard.y = body.y;
    guard.angle = Math.atan2(ty - guard.y, tx - guard.x);
    return d - stepLen < 6;
  }

  function updateGuard(guard, dt) {
    let ev = 0;
    const visible = canSee(guard);
    if (visible) {
      const range = player.sneak ? GUARD.viewRangeSneak : GUARD.viewRange;
      const d = dist(guard.x, guard.y, player.x, player.y);
      let rate = GUARD.suspicionRiseFar + (GUARD.suspicionRiseNear - GUARD.suspicionRiseFar) * (1 - d / range);
      if (player.sneak) rate *= 0.5;
      guard.suspicion = Math.min(GUARD.alertAt, guard.suspicion + rate * dt);
      guard.lastSeen.x = player.x;
      guard.lastSeen.y = player.y;
      guard.seenTimer = 0;
      if (guard.suspicion >= GUARD.alertAt && guard.mode !== MODE_CHASE) {
        guard.mode = MODE_CHASE;
        ev |= EVENT_ALERT;
      } else if (guard.suspicion >= GUARD.suspiciousAt && guard.mode === MODE_PATROL) {
        guard.mode = MODE_STALK;
      }
      if (guard.suspicion >= GUARD.suspiciousAt && !guard.spotted) {
        guard.spotted = true;
        ev |= EVENT_SPOTTED;
      }
    } else {
      guard.seenTimer += dt;
      const decay = guard.mode === MODE_PATROL ? GUARD.suspicionDecay : GUARD.suspicionDecay * 0.5;
      guard.suspicion = Math.max(0, guard.suspicion - decay * dt);
      if (guard.suspicion < GUARD.losePatienceAt) guard.spotted = false;
      if (guard.mode === MODE_CHASE && guard.seenTimer > 2.5) {
        guard.mode = MODE_STALK;
        guard.suspicion = Math.max(guard.suspicion, 70);
      } else if (guard.mode === MODE_STALK && guard.suspicion < GUARD.losePatienceAt) {
        guard.mode = MODE_PATROL;
      }
    }

    if (guard.mode === MODE_PATROL) {
      if (guard.pause > 0) {
        guard.pause -= dt;
        guard.scanPhase += dt;
        // Sweep the cone slowly while waiting at a waypoint.
        guard.angle = guard.baseAngle + Math.sin(guard.scanPhase * 0.9) * 0.7;
      } else {
        const wp = guard.waypoints[guard.wpIndex];
        if (moveGuardToward(guard, wp.x, wp.y, GUARD.patrolSpeed, dt)) {
          guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
          guard.pause = GUARD.waypointPause;
          guard.scanPhase = 0;
          const next = guard.waypoints[guard.wpIndex];
          guard.baseAngle = Math.atan2(next.y - guard.y, next.x - guard.x);
        }
      }
    } else if (guard.mode === MODE_STALK) {
      if (guard.pause > 0) {
        guard.pause -= dt;
        guard.angle += dt * 1.4; // look around the spot where you were last seen
        if (guard.pause <= 0) guard.mode = MODE_PATROL;
      } else if (moveGuardToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.stalkSpeed, dt)) {
        guard.pause = 2;
      }
    } else {
      // MODE_CHASE: run at the player while visible, else at where they were last seen.
      const tx = visible ? player.x : guard.lastSeen.x;
      const ty = visible ? player.y : guard.lastSeen.y;
      moveGuardToward(guard, tx, ty, GUARD.chaseSpeed, dt);
      if (dist(guard.x, guard.y, player.x, player.y) < GUARD.catchRadius) {
        return ev | EVENT_CAUGHT;
      }
    }
    return ev;
  }

  /** Steal a shadow, place the carried one, or pick a placed one back up. */
  function tryGrab() {
    if (state.status !== 'playing') return 0;
    if (player.carrying) {
      // Place it where you stand — it stays there as a hiding spot.
      stolen.carried = false;
      stolen.rx = SHADOW.placedRx;
      stolen.ry = SHADOW.placedRy;
      player.carrying = false;
      say('Shadow placed — hide inside it. It will fade in a few seconds.', 3);
      return EVENT_PLACE;
    }
    if (stolen.active) {
      const d = dist(player.x, player.y, stolen.x, stolen.y);
      if (d < SHADOW.pickupRange) {
        stolen.carried = true;
        stolen.rx = SHADOW.carriedRx;
        stolen.ry = SHADOW.carriedRy;
        player.carrying = true;
        player.target = null;
        return EVENT_PICKUP;
      }
    }
    for (let i = 0; i < plants.length; i += 1) {
      const plant = plants[i];
      if (plant.stolen) continue;
      if (dist(player.x, player.y, plant.x, plant.y) < SHADOW.stealRange) {
        plant.stolen = true;
        stolen.active = true;
        stolen.carried = true;
        stolen.source = i;
        stolen.x = plant.x + plant.dx;
        stolen.y = plant.y + plant.dy;
        stolen.rx = SHADOW.carriedRx;
        stolen.ry = SHADOW.carriedRy;
        stolen.timeLeft = SHADOW.lifetime;
        player.carrying = true;
        player.target = null;
        say('You stole the palm’s shadow — it follows you. Move slowly or it slips off you.', 4);
        return EVENT_STEAL;
      }
    }
    return 0;
  }

  /**
   * A click in the field: pick up a placed shadow, steal from a nearby plant,
   * drop the carried shadow, or set a walk-to point.
   */
  function clickAt(x, y) {
    if (state.status !== 'playing') return 0;
    const cx = clamp(x, WALL + PLAYER.radius, FIELD.width - WALL - PLAYER.radius);
    const cy = clamp(y, WALL + PLAYER.radius, FIELD.height - WALL - PLAYER.radius);
    if (player.carrying) {
      if (!PLANTERS.some((p) => pointInEllipse(cx, cy, p.x + p.w / 2, p.y + p.h / 2, p.w / 2 + 20, p.h / 2 + 20))) {
        stolen.carried = false;
        stolen.x = cx;
        stolen.y = cy;
        stolen.rx = SHADOW.placedRx;
        stolen.ry = SHADOW.placedRy;
        player.carrying = false;
        player.target = null;
        say('Shadow placed — hide inside it. It will fade in a few seconds.', 3);
        return EVENT_PLACE;
      }
    }
    if (stolen.active && !stolen.carried && dist(cx, cy, stolen.x, stolen.y) < SHADOW.pickupRange + 20) {
      // Clicked the placed shadow itself: pick it up if you can reach it.
      if (dist(player.x, player.y, stolen.x, stolen.y) < SHADOW.pickupRange + 60) {
        stolen.carried = true;
        stolen.rx = SHADOW.carriedRx;
        stolen.ry = SHADOW.carriedRy;
        player.carrying = true;
        player.target = null;
        return EVENT_PICKUP;
      }
      player.target = { x: stolen.x, y: stolen.y };
      return 0;
    }
    for (const plant of plants) {
      if (!plant.stolen && dist(cx, cy, plant.x, plant.y) < 46) {
        if (dist(player.x, player.y, plant.x, plant.y) < SHADOW.stealRange) return tryGrab();
        player.target = { x: plant.x + plant.dx, y: plant.y + plant.dy };
        return 0;
      }
    }
    player.target = { x: cx, y: cy };
    return 0;
  }

  /**
   * One fixed step. `move` is the keyboard direction (-1..1 on each axis);
   * a click-to-move target takes over when no key is held.
   */
  function step(dt, move, sneak) {
    let events = 0;
    if (state.status !== 'playing') return 0;
    state.elapsed += dt;
    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) state.message = '';
    }

    player.sneak = sneak;
    let mx = move.x;
    let my = move.y;
    if (mx === 0 && my === 0 && player.target) {
      const d = dist(player.x, player.y, player.target.x, player.target.y);
      if (d < 7) {
        player.target = null;
      } else {
        mx = (player.target.x - player.x) / d;
        my = (player.target.y - player.y) / d;
      }
    }
    if (mx !== 0 || my !== 0) {
      player.target = null; // keys override a click-to-move target
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      const speed = player.carrying
        ? (sneak ? PLAYER.carrySneakSpeed : PLAYER.carrySpeed)
        : (sneak ? PLAYER.sneakSpeed : PLAYER.speed);
      moveCircle(player, mx * speed * dt, my * speed * dt);
      player.moving = true;
    } else {
      player.moving = false;
    }

    // The carried shadow trails behind you: run and it slips off, sneak and it covers you.
    if (stolen.active && stolen.carried) {
      const rate = 3.5;
      stolen.x += (player.x - stolen.x) * Math.min(1, rate * dt);
      stolen.y += (player.y - stolen.y) * Math.min(1, rate * dt);
      stolen.timeLeft -= dt;
      if (stolen.timeLeft <= 0) {
        plants[stolen.source].stolen = false;
        stolen.active = false;
        stolen.carried = false;
        player.carrying = false;
        say('The borrowed shadow slipped away and returned to its plant.', 3);
        events |= EVENT_FADE;
      }
    } else if (stolen.active) {
      stolen.timeLeft -= dt;
      if (stolen.timeLeft <= 0) {
        plants[stolen.source].stolen = false;
        stolen.active = false;
        say('The borrowed shadow slipped away and returned to its plant.', 3);
        events |= EVENT_FADE;
      }
    }

    player.hidden = computeHidden();

    let maxSuspicion = 0;
    let anySeen = false;
    for (const guard of guards) {
      events |= updateGuard(guard, dt);
      if (guard.suspicion > maxSuspicion) maxSuspicion = guard.suspicion;
      if (canSee(guard)) anySeen = true;
      if (events & EVENT_CAUGHT) break;
    }
    state.suspicion = maxSuspicion;
    state.seen = anySeen;

    if (events & EVENT_CAUGHT) {
      state.status = 'lost';
      return events;
    }

    // The exit: step into the glowing doorway and you are out.
    if (player.x > EXIT.x - 6 && player.x < EXIT.x + EXIT.w + 6 &&
        player.y > EXIT.y - 6 && player.y < EXIT.y + EXIT.h + 6) {
      state.status = 'won';
      events |= EVENT_WON;
    }
    return events;
  }

  /**
   * The hero composition for ?shot=play: the prisoner crouched in a stolen palm
   * shadow, its tendrils still reaching back to the plant, two cones crossing
   * ahead of them and the glowing exit in the top-right corner.
   */
  function stageHero() {
    reset();
    const plant = plants[3]; // the tall palm at (950, 300)
    plant.stolen = true;
    stolen.active = true;
    stolen.carried = false;
    stolen.source = 3;
    stolen.x = 880;
    stolen.y = 365;
    stolen.rx = SHADOW.placedRx;
    stolen.ry = SHADOW.placedRy;
    stolen.timeLeft = 18;
    player.x = 880;
    player.y = 365;
    player.sneak = true;
    player.hidden = true;
    guards[1].x = 985;
    guards[1].y = 215;
    guards[1].angle = Math.PI / 2;
    guards[1].pause = 2;
    guards[1].baseAngle = Math.PI / 2;
    guards[1].suspicion = 46;
    guards[2].x = 660;
    guards[2].y = 520;
    guards[2].angle = -0.5;
    guards[2].pause = 2;
    guards[2].baseAngle = -0.5;
    guards[2].suspicion = 22;
    guards[3].x = 1075;
    guards[3].y = 262;
    guards[3].angle = 2.65;
    guards[3].pause = 2;
    guards[3].baseAngle = 2.65;
    guards[3].suspicion = 58;
    guards[3].spotted = true;
    state.suspicion = 58;
    state.seen = false;
    state.elapsed = 61.2;
    state.message = 'Hidden in borrowed dark — wait for the cones to pass.';
    state.messageTimer = 99;
  }

  /** The win scene for ?shot=end: the prisoner at the glowing exit, escape timed. */
  function stageWin() {
    reset();
    player.x = EXIT.x + EXIT.w / 2;
    player.y = EXIT.y + EXIT.h / 2 + 8;
    state.status = 'won';
    state.elapsed = 96.4;
    state.bestMs = 96400;
    state.suspicion = 0;
  }

  reset();
  return { state, reset, step, tryGrab, clickAt, stageHero, stageWin };
}
