// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play, paused,
// escaped and caught.
//
// ?seed=N fixes the patrol timing. ?shot=start|play|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_ALERT,
  EVENT_CAUGHT,
  EVENT_FADE,
  EVENT_PICKUP,
  EVENT_PLACE,
  EVENT_SPOTTED,
  EVENT_STEAL,
  EVENT_WON,
} from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_GRAB,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_LOST,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WON,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best time then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  const best = readBest();
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, best, audio.isMuted());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, renderer.toField);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let muted = audio.isMuted();
  let accumulator = 0;
  let last = performance.now();
  let stepSoundTimer = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Reach the glowing exit, unseen.');
  }

  function endGame(won) {
    if (won) {
      screen = SCREEN_WON;
      const ms = Math.round(world.state.elapsed * 1000);
      if (best === 0 || ms < best) {
        best = ms;
        saveBest(best);
      }
      audio.win();
      announce(`Escaped in ${Math.round(world.state.elapsed)} seconds.`);
    } else {
      screen = SCREEN_LOST;
      audio.lose();
      announce('Caught. Press Space or click to try again.');
    }
  }

  function toggleMute() {
    muted = audio.toggleMute();
    document.getElementById('mute-btn').textContent = muted ? '🔇 Muted' : '🔊 Sound';
    return muted;
  }

  function handleEvents(events) {
    if (events & EVENT_STEAL) audio.steal();
    if (events & EVENT_PLACE) audio.place();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_FADE) audio.fade();
    if (events & EVENT_SPOTTED) {
      audio.spotted();
      announce('A guard is getting suspicious.');
    }
    if (events & EVENT_ALERT) {
      audio.alert();
      announce('Spotted! A guard is chasing you — break line of sight and hide!');
    }
    if (events & EVENT_WON) endGame(true);
    else if (events & EVENT_CAUGHT) endGame(false);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) toggleMute();
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      startGame();
      return;
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) {
      if (actions & (ACTION_CONFIRM | ACTION_GRAB)) {
        audio.unlock();
        startGame();
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen === SCREEN_PLAY && (actions & ACTION_GRAB)) {
      handleEvents(world.tryGrab());
    }
  }

  function handleClick() {
    const click = input.takeClick();
    if (!click) return;
    audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    handleEvents(world.clickAt(click.x, click.y));
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The title's backdrop: guards patrol, nothing can be won or lost.
      world.step(STEP, { x: 0, y: 0 }, false);
      return;
    }
    const events = world.step(STEP, input.direction(), input.sneaking());
    if (world.state.player.moving) {
      stepSoundTimer -= STEP;
      if (stepSoundTimer <= 0) {
        audio.step();
        stepSoundTimer = 0.42;
      }
    }
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClick();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, muted);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // The DOM buttons above the canvas.
  document.getElementById('pause-btn').addEventListener('click', () => {
    if (screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  });
  document.getElementById('restart-btn').addEventListener('click', () => {
    if (screen !== SCREEN_TITLE) startGame();
  });
  document.getElementById('mute-btn').addEventListener('click', toggleMute);
  document.getElementById('mute-btn').textContent = muted ? '🔇 Muted' : '🔊 Sound';
  document.getElementById('help-btn').addEventListener('click', () => {
    announce('Steal a palm shadow with E, place it with E, sneak with Shift, and reach the glowing exit unseen.');
  });

  announce('Borrowed Dark. Press Space or click to begin the escape.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
