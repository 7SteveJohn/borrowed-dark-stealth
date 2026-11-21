# Borrowed Dark

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/7SteveJohn/borrowed-dark-stealth/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/7SteveJohn/borrowed-dark-stealth/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game for the [make.fun "Make the best stealth game"](https://make.fun/bounty/best-stealth-game-20261121-1759) bounty. In a brightly lit greenhouse prison, you are the escaped prisoner — and the only cover is darkness you have to steal. Peel the shadow off a giant palm, drag it where you need it, and slip past the guards' amber vision cones to reach the glowing exit, unseen.

## The idea — BORROWED DARK

- **Steal a shadow**: stand by a tall palm and press E. Its shadow detaches, tendrils still reaching back to the plant, and follows you.
- **One shadow at a time**: carrying a shadow means the place you were hiding is exposed. Place it with E to make a fixed hiding spot, pick it back up with E — but it fades after 25 seconds and returns to its plant.
- **Sneak or be seen**: a carried shadow only covers you while you sneak. Run and it slips off behind you.
- **Solid planters** are permanent cover and block line of sight. A guard's suspicion rises inside its cone — faster up close, halved while you sneak. At full suspicion the guard chases; break line of sight and hide to cool it down.
- **Win** by reaching the glowing exit unseen. **Lose** if a chasing guard touches you.

## Controls

| Key / mouse | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sneak (slow, quiet, keeps a carried shadow over you) |
| E or Space | Steal / place / pick up a shadow |
| Click | Move toward the click, or click a placed shadow to pick it up |
| P / Esc | Pause |
| R | Restart |
| M | Mute |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No network requests, no build step — `game/` is plain static files, all art drawn in code and all sound synthesised with WebAudio.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
