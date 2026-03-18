# Qatar Air Defense Command

> **Version 1.0.0 · Alpha · March 2026**

A real-time tactical air defense game set over an accurate radar map of Qatar. You command the CAOC (Combined Air Operations Center) and must defend the peninsula against dynamically escalating waves of enemy missiles, drones, bombers, and fighter jets. The game features a live coordinate-accurate map, synthesized Web Audio, voice callouts, a contextual AI difficulty agent that learns from your play style, a full military rank system, PSA cutscene intervals, and both web and Electron desktop builds.

---

## Overview

You are the CAOC (Combined Air Operations Center) commander for Qatar's integrated air defense network. Enemy forces launch coordinated attacks combining ballistic missiles, cruise missiles, hypersonic glide vehicles, kamikaze drones, and anti-ship missiles. Your job is to intercept them all before they hit Doha, Al Udeid, Ras Laffan, or your naval assets.

The radar fills the screen. Qatar's actual geography is drawn. Your defense batteries are placed at historically plausible locations. Every interceptor you fire costs money. Miss a shot — you pay for it twice.

---

## Features

### Layered Defense Arsenal

| Weapon | Key | Cost | Best Against |
|--------|-----|------|--------------|
| Patriot PAC-3 | `1` | $180 | Ballistic, cruise, hypersonic |
| Arrow-3 | `2` | $380 | Ballistic, MIRV, high-altitude |
| SHORAD | `3` | $80 | Drones, low-altitude cruise |
| Iron Beam (Laser) | `4` | $90 | Drones, loiters (instant, 8s recharge) |
| C-RAM Phalanx | `5` | $20/burst | Drones, loiters — all 3 batteries fire 18 rounds each |
| Scramble F-15s | `6` | $1500 | Bombers, enemy fighters |
| Deploy Frigates | `7` | $1200 | Cruise & anti-ship missiles at sea |
| QAF Hornets | `8` | $600 | Air-to-air, escort, patrol |
| EW Jamming | `9` | $300 | Disrupts all threats (area confusion) |
| Allied Air Support | — | $5000 | 4-minute ADIZ auto-intercept coverage |

### Enemy Threat Types

- **Ballistic Missiles** — high arc, fast terminal phase; requires multiple intercepts
- **Cruise Missiles** — terrain-hugging, harder to detect early
- **Hypersonic Glide Vehicles** — near-mach cruise, brief intercept window
- **Kamikaze Drones** — swarms, cheap, aim directly at Qatar
- **Loitering Munitions** — slow, persistent; circle before striking
- **Anti-Ship Missiles** — target your frigates at sea
- **MIRV** — splits into multiple warheads mid-flight
- **Bombers & Enemy Fighters** — require air-to-air response

### AI Adaptive Difficulty (DDA)

A contextual epsilon-greedy bandit agent reads 9 real-time gameplay features — your interception rate, health trend, threat density, active missiles, money level, and wave phase — and continuously tunes enemy spawn count, spawn interval, speed, and TGP bonus to keep you in a *flow state* (targeting ~72% interception ratio, ~60% health). It learns across sessions via localStorage and biases early waves toward manageable presets while it calibrates.

Layered over the DDA is a **heartbeat state machine** that creates natural rhythm: BUILD → PEAK → DRAIN → RECOVER → BUILD. Peaks bring coordinated multi-type swarms. Drains give breathing room to restock and regroup.

### Naval Operations

Deploy frigates into the Persian Gulf and Gulf of Bahrain. Frigates:
- Sail only in open sea — they never enter land or territorial waters
- Engage cruise missiles and anti-ship missiles within a 150 km envelope
- Have C-RAM auto-fire for close-range drone/anti-ship threats within 50 km
- Remain on station for 5 minutes, then RTB; recharge 1 minute before redeployment
- Can be sunk by anti-ship missiles (money penalty on hit)

### Civilian Air Traffic

Civil airliners transit Qatar's airspace in real time. When enemy drones are detected, civilian aircraft divert. Some inbound flights attempt to land at Hamad International Airport — watch for `INBOUND` and `DIVERTED` tags on the radar.

### Audio

- Synthesized Web Audio API sound effects for every event
- SpeechSynthesis voice callouts (border crossings, kills, support activations)
- Dynamic background music with adjustable volume
- C-RAM has a distinctive machine-gun audio loop; opening burst plays a cinematic intro clip
- Air raid siren on ADIZ breaches

---

## Controls

### Selecting and Firing
1. Press `1`–`5` to select a weapon (or click its arsenal slot)
2. Click on a missile blip on the radar to fire
3. Interceptors home in on the selected target automatically
4. The Iron Beam (`4`) fires an instant beam — no travel time, but 8-second recharge
5. C-RAM (`5`) fires all 3 Phalanx batteries simultaneously — 18 rounds each, $20 flat

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1`–`5` | Select weapon |
| `6` | Scramble F-15 jets |
| `7` | Deploy frigate |
| `8` | Launch QAF Hornets (unlocks Wave 8) |
| `9` | Activate EW Jamming |
| `Space` | Pause / Resume |
| `+` / `-` | Zoom in / out |

### Bottom Bar Buttons

- **PAUSE** — freeze the simulation
- **ZOOM IN / OUT / RESET** — adjust radar scale
- **ALLIED SUPPORT** ($5000) — activates 4-minute full-ADIZ auto-intercept; 5-minute cooldown; button shows live countdown
- **SCRAMBLE JETS** — F-15QA interceptors for air-to-air threats
- **FRIGATES** — unlocks at Wave 11
- **HORNETS** — unlocks at Wave 8
- **EW JAM** — disrupts all active threats in ADIZ
- **SFX / VOICE / MUSIC** — toggle audio layers individually
- **SETTINGS** — volume sliders, keybindings info

---

## Running the Game

You need Python 3 (or any static file server). ES modules require HTTP — opening `index.html` directly will not work.

```bash
cd "Qatar Air Defense"
python -m http.server 8000
```

Then open `http://localhost:8000` in Chrome, Edge, or Firefox.

> **Note:** The game uses Web Audio API and SpeechSynthesis. Chrome gives the best results. Safari may require a user gesture before audio plays.

---

## Project Structure

```
Qatar Air Defense/
├── index.html                  # Full UI layout and overlay screens
├── styles/
│   ├── main.css                # Global layout and bottom bar
│   ├── radar.css               # Radar canvas frame
│   └── ui.css                  # HUD panels, arsenal tooltips, threat list
├── src/
│   ├── main.js                 # Entry — wires Game, UIManager, InputHandler, SoundManager
│   ├── ai/
│   │   └── DifficultyAgent.js  # Contextual epsilon-greedy bandit DDA
│   ├── audio/
│   │   └── SoundManager.js     # Web Audio synthesis + SpeechSynthesis voiceovers
│   ├── entities/
│   │   ├── Missile.js          # 9 enemy missile types with behavior configs
│   │   ├── Interceptor.js      # 5 interceptor types including laser and C-RAM
│   │   ├── Frigate.js          # Naval asset — patrols sea, fires autonomously
│   │   ├── CivilianAircraft.js # Transiting and landing civilian planes
│   │   └── Explosion.js        # Particle sparks and ring effects
│   ├── game/
│   │   ├── Game.js             # Core loop, wave spawning, DDA, heartbeat state machine
│   │   ├── Radar.js            # Qatar map outline, cities, battery positions, flag
│   │   ├── EntityManager.js    # Entity lifecycle (missiles, interceptors, explosions)
│   │   └── GameState.js        # Money, health, score, wave tracking
│   ├── input/
│   │   └── InputHandler.js     # Mouse targeting, keyboard, C-RAM salvo, EW, allied
│   └── ui/
│       └── UIManager.js        # HUD updates, threat list, arsenal panel, status log
└── assets/
    ├── images/                 # Qatar flag, map SVG, avatar
    ├── sounds/                 # SFX: siren, C-RAM, explosions, music tracks
    └── videos/                 # Opening screen video
```

---

## Coordinate System

The radar uses a normalized world coordinate space:

- `(0, 0)` = center of Qatar (world center)
- `y` positive = south (down on screen); `y` negative = north
- `maxRadius = 1.0` ≈ 300 km in-game
- Qatar peninsula spans roughly `x: [-0.18, 0.18]`, `y: [-0.33, 0.22]`

---

## Strategy Tips

**Early waves (1–4):** SHORAD and Patriot are your workhorses. Save money — don't panic-fire.

**Drone swarms:** Switch to Iron Beam or C-RAM. Both are cheap against soft targets. C-RAM's $20 flat burst makes it the most cost-effective choice against large swarms.

**Ballistic missiles:** Lead the target. Ballistics arc — fire Patriot early in the flight path. Arrow-3 handles extreme altitude. Ballistics may require multiple intercepts.

**PEAK waves:** These are coordinated multi-type attacks. Prioritize fast threats first. Use EW Jamming to buy seconds. Save Allied Support for genuine emergencies.

**Economy:** Every missed shot is a loss. Spending $380 (Arrow-3) on a missile worth $200 in damage is still worth it early. Late game, protect health aggressively.

**Frigates:** Position them in the Gulf — they intercept cruise and anti-ship threats autonomously, covering the eastern approach that your land batteries can't easily reach.

---

## Technical Notes

- Pure vanilla JavaScript — no frameworks, no bundler
- ES module imports throughout (`type="module"`)
- Canvas 2D for all rendering at native display resolution
- DDA agent weights persist via `localStorage` key `qad_dda_agent_v2`
- Game loop wrapped in `try/catch` — exceptions log to console but never kill the animation frame

---

*This is an educational entertainment project. All scenarios are fictional. Real Qatar Air Defense capabilities are far more classified than this.*
