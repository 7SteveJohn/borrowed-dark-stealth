// The screenshot scenes behind ?shot=start|play|end. Each one stages a real state
// of the game — the title over a live level, the hero composition, the win screen —
// and paints it twice so the frame is settled before the screenshot is taken.
// The same seed always gives the same frame.

import { STEP } from './config.js';
import { SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';

/** Seconds of patrol the title scene runs through before the shot. */
const START_SECONDS = 6;

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    world.stageHero();
    return { screen: SCREEN_PLAY };
  }
  if (name === 'end') {
    world.stageWin();
    return { screen: SCREEN_WON };
  }
  world.reset();
  for (let index = 0; index < START_SECONDS / STEP; index += 1) {
    world.step(STEP, { x: 0, y: 0 }, false);
  }
  return { screen: SCREEN_TITLE };
}

// Re-exported so main.js can draw a caught frame if it ever needs one.
export { SCREEN_LOST };
