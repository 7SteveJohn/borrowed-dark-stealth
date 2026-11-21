// Keyboard and pointer input. Held keys give a steering direction; one-shot presses
// (grab/drop a shadow, start, pause, restart, mute) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost and never counted twice.
// A click also reports its field position, for click-to-move and shadow placement.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_GRAB = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Enter']);
const GRAB = new Set(['KeyE', 'Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas, toField) {
  const held = new Set();
  let actions = 0;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) ||
        RIGHT.has(event.code) || SNEAK.has(event.code)) {
      held.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (GRAB.has(event.code)) {
      if (!event.repeat) actions |= ACTION_GRAB;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('pointerdown', (event) => {
    // Ignore clicks on the DOM buttons sitting above the canvas.
    if (event.target !== canvas) return;
    const point = toField(event.clientX, event.clientY);
    if (point) click = point;
  });

  function hasAny(codes) {
    for (const code of codes) if (held.has(code)) return true;
    return false;
  }

  return {
    /** Normalised steering: -1..1 on each axis, 0 when no key is held. */
    direction() {
      const x = (hasAny(RIGHT) ? 1 : 0) - (hasAny(LEFT) ? 1 : 0);
      const y = (hasAny(DOWN) ? 1 : 0) - (hasAny(UP) ? 1 : 0);
      return { x, y };
    },
    sneaking() {
      return hasAny(SNEAK);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The click since the last call, in field coordinates, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    /** Queue an action from a DOM button (pause, restart, mute, confirm). */
    queueAction(flag) {
      actions |= flag;
    },
  };
}
