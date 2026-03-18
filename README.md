# Qatar Air Defense Command

> **Version 1.0.0 · Alpha · March 2026**

A real-time tactical air defense game set over an accurate radar map of Qatar. You command the CAOC (Combined Air Operations Center) and must defend the peninsula against dynamically escalating waves of enemy missiles, drones, bombers, and fighter jets. The game features a coordinate-accurate live map, synthesized Web Audio API sound effects, SpeechSynthesis voice callouts, a contextual AI difficulty agent that learns across sessions, a full Qatari military rank progression system, PSA cutscene intervals between waves, and both web and Electron desktop builds.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [Running as a Desktop App (Electron)](#3-running-as-a-desktop-app-electron)
4. [Controls & Input Reference](#4-controls--input-reference)
5. [Arsenal — Interceptor Weapons](#5-arsenal--interceptor-weapons)
6. [Enemy Threats](#6-enemy-threats)
7. [Friendly Forces](#7-friendly-forces)
8. [Defense Batteries & Map Positions](#8-defense-batteries--map-positions)
9. [Resource & Economy System](#9-resource--economy-system)
10. [Wave System & Difficulty Progression](#10-wave-system--difficulty-progression)
11. [Heartbeat State Machine](#11-heartbeat-state-machine)
12. [AI Dynamic Difficulty Adjustment (DDA)](#12-ai-dynamic-difficulty-adjustment-dda)
13. [Powerups](#13-powerups)
14. [Civilian Air Traffic](#14-civilian-air-traffic)
15. [Radar Ghosts & EW Jamming](#15-radar-ghosts--ew-jamming)
16. [Naval Operations — Frigates](#16-naval-operations--frigates)
17. [Rank & Progression System](#17-rank--progression-system)
18. [PSA Cutscene System](#18-psa-cutscene-system)
19. [Audio System](#19-audio-system)
20. [Coordinate System & Map Geometry](#20-coordinate-system--map-geometry)
21. [Project Architecture](#21-project-architecture)
22. [Module Reference](#22-module-reference)
23. [Building & Packaging](#23-building--packaging)
24. [CI/CD — GitHub Actions](#24-cicd--github-actions)
25. [Configuration Reference](#25-configuration-reference)
26. [Strategy Guide](#26-strategy-guide)
27. [Browser Compatibility](#27-browser-compatibility)
28. [Roadmap](#28-roadmap)

---

## 1. Overview

Enemy forces launch coordinated, wave-based attacks. You choose which interceptor weapon to use (`1`–`5`), click a radar blip to engage it, and manage your budget so you don't go bankrupt mid-wave. Each miss deals health damage to Qatar's critical infrastructure. When health reaches zero, the game ends.

Key design principles:

- **Economy over reflexes** — spending $380 (Arrow-3) on a $200-damage threat is still worth it early. Overspending in a panic will leave you broke when the next wave peaks.
- **Layered defense** — no single weapon covers all threat types effectively. SHORAD handles drones, Patriot handles ballistics, Arrow-3 handles MIRVs and hypersonics, Iron Beam and C-RAM are cheap against soft swarms.
- **Flow-state targeting** — the built-in DDA agent continuously adjusts enemy count, spawn interval, speed, and bonus TGP to keep your interception ratio near ~72% and your health near ~60%. You should feel pressure without feeling overwhelmed.

---

## 2. Quick Start

Requires **Python 3** (any version) for the built-in HTTP server. ES modules require HTTP — opening `index.html` directly via `file://` will not work.

```bash
cd "Qatar Air Defense"
python -m http.server 8000
```

Open **http://localhost:8000** in Chrome, Edge, or Firefox.

Alternatively, double-click `launch-web.bat` (Windows).

### Start Screen

When the page loads, a 10-second animated loading sequence runs:

| Time | Label |
|------|-------|
| 0 s  | ◈ INITIALIZING RADAR SYSTEMS… |
| 2 s  | ◈ LOADING WEAPON SYSTEMS… |
| 4 s  | ◈ CALIBRATING DEFENSE GRID… |
| 5.8 s | ◈ SYNCING THREAT DATABASE… |
| 7.4 s | ◈ ARMING INTERCEPTORS… |
| 8.8 s | ◈ ESTABLISHING COMMAND LINK… |
| 9.7 s | ◈ DEFENSE SYSTEMS READY |

After 10 seconds, the **▶ ACTIVATE DEFENSE SYSTEM** button enables. Clicking it shows a fullscreen prompt (optional), then starts the game.

---

## 3. Running as a Desktop App (Electron)

The Electron entry point is `electron-main.js`. It registers a custom `game://` protocol so that ES modules, `fetch()`, Web Audio API, and `localStorage` all work in a secure Chromium context without needing a live HTTP server.

### Development (run without packaging)

```bash
npm install
npm start
```

This opens a 1400×900 Electron window that maximizes on startup.

### Production Build (Windows installer + portable EXE)

```bash
npm run package
```

This runs `electron-builder --win` and outputs to `dist/`:

| File | Description |
|------|-------------|
| `Qatar Air Defense Command Setup 1.0.0.exe` | NSIS installer (allows choosing install directory) |
| `Qatar Air Defense Command 1.0.0.exe` | Portable EXE (no install required) |
| `win-unpacked/` | Raw unpacked application folder |

### Electron Application Menu

| Menu > Item | Shortcut | Action |
|-------------|----------|--------|
| Game > Toggle Fullscreen | F11 | Toggle fullscreen |
| Game > Quit | — | Quit |
| View > Restart Game | Ctrl+R | Reload renderer (restarts game) |
| View > Force Restart | Ctrl+Shift+R | Hard reload |
| Audio > Mute/Unmute SFX | M | Toggle sound effects |
| Audio > Mute/Unmute Music | Shift+M | Toggle background music |
| Audio > Mute/Unmute Voice | V | Toggle voice callouts |
| Help > Toggle DevTools | Ctrl+Shift+I | Open Chromium DevTools |

### Electron Technical Notes

- Uses `protocol.registerSchemesAsPrivileged` to register `game://` as a standard, secure, CORS-enabled, streaming scheme.
- `autoplay-policy: no-user-gesture-required` is set via `app.commandLine.appendSwitch` so audio plays immediately on game start.
- `nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true` — renderer is fully sandboxed.
- External links open in the system browser via `shell.openExternal`.
- A global reference (`let mainWindow`) prevents the window from being garbage-collected.

---

## 4. Controls & Input Reference

### Weapon Selection

| Key | Weapon | Cost |
|-----|--------|------|
| `1` | Patriot PAC-3 | $150/shot |
| `2` | Arrow-3 (Hetz) | $380/shot |
| `3` | Crotale NG (SHORAD) | $70/shot |
| `4` | Iron Beam (HEL laser) | $40/shot |
| `5` | C-RAM (Phalanx) | $20/burst |

After selecting a weapon, **click a blip** on the radar canvas to fire at it. The interceptor homes automatically.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1`–`5` | Select weapon |
| `6` | Scramble F-15QA jets ($1500; available from Wave 1) |
| `7` | Deploy frigate ($1200; unlocks at Wave 11) |
| `8` | Launch QAF Hornets ($600; unlocks at Wave 8) |
| `9` | Activate EW Jamming ($300) |
| `Space` | Pause / Resume |
| `+` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom |

### Bottom Bar Buttons

| Button | Action |
|--------|--------|
| **PAUSE / RESUME** | Freeze/unfreeze game loop |
| **ZOOM IN / OUT / RESET** | Adjust radar scale (0.5×–4.0×) |
| **ALLIED SUPPORT** ($5000) | Activates 4-minute full-ADIZ auto-intercept; 5-minute cooldown; shows live countdown |
| **SCRAMBLE JETS** | Dispatches F-15QA squadron for air-to-air |
| **FRIGATES** | (unlocks Wave 11) Deploys naval frigate |
| **HORNETS** | (unlocks Wave 8) Launches QAF Hornet UAVs |
| **EW JAM** | Deploys electronic warfare jamming |
| **SFX / VOICE / MUSIC** | Toggle audio layers individually |
| **SETTINGS** | Opens settings panel with volume sliders |
| **⛶ FULLSCREEN** | Toggle browser/Electron fullscreen |
| **🎬 PSA** | Enable/disable inter-wave PSA cutscenes |
| **CLEAR DATA** | Wipe all saved cookies (rank, high score, stats) |

### Click Priority

When you click the canvas, the input handler resolves targets in this order:

1. **Powerup** — collected instantly if cursor is within pickup radius
2. **Bomber** — large target, checked first among hostile entities
3. **Enemy Fighter** — maneuvering jet checked before missiles
4. **Missile** — hovered missile (under cursor) or nearest to click
5. **Civilian Aircraft** — warns you before firing; triggers civilian incident penalty

If nothing is in range, a log entry says "No threat in range."

### C-RAM Special Behavior

C-RAM (`5`) fires all 3 Phalanx batteries simultaneously. It is limited to the ADIZ (target must be inside Qatar's outline). Hardened targets (`ballistic`, `mirv`, `hypersonic`) automatically queue 4 sequential bursts (×4 cost) because a single burst has low lethality against armored re-entry vehicles.

---

## 5. Arsenal — Interceptor Weapons

All weapons spawn from their nearest matching battery on the map. Effectiveness values are kill probabilities (0 = never kills this type, 1.0 = always kills this type).

### Patriot PAC-3 — Key `1` — $150

Medium-range surface-to-air missile. Workhorse of early and mid game.

| Type | Effectiveness |
|------|---------------|
| Ballistic | 0.88 |
| Cruise | 0.92 |
| Hypersonic | 0.52 |
| Drone | 0.72 |
| Anti-ship | 0.88 |
| Bomber | 0.72 |
| MaRV | 0.65 |
| Loiter | 0.80 |
| MIRV | 0.70 |
| Cluster CBM | 0.82 |
| Submunition | 0.70 |

Speed: `0.55` world units/sec · Kill radius: `0.045` wu

### Arrow-3 (Hetz) — Key `2` — $380

Long-range exo-atmospheric interceptor. Best vs ballistic and high-altitude threats. Weak vs drones.

| Type | Effectiveness |
|------|---------------|
| Ballistic | 0.98 |
| Cruise | 0.62 |
| Hypersonic | 0.92 |
| Drone | 0.28 |
| MaRV | 0.80 |
| MIRV | 0.90 |
| Cluster CBM | 0.90 |
| Bomber | 0.85 |

Speed: `0.72` wu/s · Kill radius: `0.06` wu

### Crotale NG (SHORAD) — Key `3` — $70

Short-range, fast, very cheap. Purpose-built for drones, loiters, and low-altitude cruise missiles. Cannot engage bombers.

| Type | Effectiveness |
|------|---------------|
| Drone | 0.96 |
| Loiter | 0.92 |
| Cruise | 0.88 |
| Anti-ship | 0.78 |
| Ballistic | 0.18 |
| MaRV | 0.40 |
| Hypersonic | 0.10 |

Speed: `0.68` wu/s · Kill radius: `0.04` wu

### Iron Beam (HEL) — Key `4` — $40

Instant-hit directed-energy beam. No travel time. 8-second recharge after each shot. Dominant vs drones and loitering munitions. Cannot engage bombers.

| Type | Effectiveness |
|------|---------------|
| Drone | 0.99 |
| Loiter | 0.99 |
| Cruise | 0.72 |
| Anti-ship | 0.68 |
| Ballistic | 0.38 |
| Enemy Fighter | 0.85 |
| Submunition | 0.85 |
| Hypersonic | 0.15 |

Speed: instant (`999`) · Kill radius: `0.03` wu · Beam duration: `0.45 s`

### C-RAM Phalanx — Key `5` — $20/burst

20mm rotary cannon. Fires 18 rounds per battery (3 batteries = 54 rounds total per burst). Extremely cheap per-burst but low lethality against hardened targets. Best value vs drone swarms. Range-limited to ADIZ.

| Type | Effectiveness |
|------|---------------|
| Drone | 0.92 |
| Loiter | 0.88 |
| Submunition | 0.80 |
| Cruise | 0.55 |
| Anti-ship | 0.35 |
| Enemy Fighter | 0.45 |
| MIRV | 0.05 |
| Hypersonic | 0.02 |

Speed: `0.95` wu/s · Kill radius: `0.032` wu · Hard targets: 4 auto-bursts ($80 total)

---

## 6. Enemy Threats

All threats spawn from a weighted set of origin directions — primarily from the North (weight 3), then NE/NW (weight 2 each), SE and West (weight 1 each). Each missile targets one of eight critical Qatari sites, weighted by infrastructure importance.

### Ballistic Missile — `ballistic`

High-arcing parabolic trajectory. Fast terminal phase. Requires early interception.

- Speed: `0.075` wu/s · Damage: `20` HP · Reward: `$250`
- Arc height: `0.38` wu — tall arc, easy to spot early
- Color: Red (`#ff2200`) · Threat level: CRITICAL
- Available from: Wave 1

### Cruise Missile — `cruise`

Low-altitude, fast, hard to detect early. Terrain-hugging approach.

- Speed: `0.13` wu/s · Damage: `12` HP · Reward: `$150`
- Arc height: `0.015` wu — nearly flat
- Color: Orange (`#ff8800`) · Threat level: HIGH
- Available from: Wave 1

### Hypersonic Glide Vehicle — `hypersonic`

Near-hypersonic speed with a brief intercept window. Only Arrow-3 or Patriot have meaningful kill probability.

- Speed: `0.32` wu/s · Damage: `18` HP · Reward: `$350`
- Color: Magenta (`#ff00ff`) · Threat level: CRITICAL
- Available from: Wave 15

### Kamikaze Drone — `drone`

Slow but numerous. Arrive in swarms. Use SHORAD, Iron Beam, or C-RAM to contain cost.

- Speed: `0.052` wu/s · Damage: `5` HP · Reward: `$75`
- Wobble amplitude: `0.010` wu
- Color: Yellow (`#ffdd00`) · Threat level: MEDIUM
- Available from: Wave 5

### Anti-Ship Missile — `antiship`

Sea-skimming. Primary threat to frigates. Also targets coastal installations.

- Speed: `0.18` wu/s · Damage: `15` HP · Reward: `$200`
- Arc height: `0.01` wu — essentially sea-level
- Color: Cyan (`#00ccff`) · Threat level: HIGH
- Available from: Wave 10

### Maneuvering Reentry Vehicle (MaRV) — `maneuver`

Ballistic-launch missile that executes lateral evasion maneuvers. Fire early.

- Speed: `0.10` wu/s · Damage: `18` HP · Reward: `$300`
- Arc height: `0.28` wu · Lateral maneuvers every 5–10 s
- Color: Red-orange (`#ff6622`) · Threat level: CRITICAL
- Available from: Wave 22

### Loitering Munition — `loiter`

Three-phase flight: approach → orbit (18–32 s) → fast dive-strike. Hardest to catch in orbit; best engaged on approach or during dive (4× speed).

- Speed: `0.05` wu/s (approach/orbit) · Damage: `10` HP · Reward: `$130`
- Color: Amber (`#ffaa00`) · Threat level: MEDIUM
- Available from: Wave 32

### MIRV Warhead — `mirv`

Splits into multiple sub-warheads mid-flight. High value to intercept the carrier before split.

- Speed: `0.065` wu/s · Damage: `28` HP · Reward: `$450`
- Arc height: `0.42` wu — very tall arc
- Color: Crimson (`#ff0044`) · Threat level: CRITICAL
- Available from: Wave 55

### Cluster Ballistic Missile (CBM) — `cluster`

Delivery vehicle that disperses submunitions at 60% flight progress. Intercept early or face 4–6 submunitions.

- Speed: `0.070` wu/s · Direct damage: `5` HP · Reward: `$350`
- Arc height: `0.40` wu · Splits at `progress = 0.60`
- Color: Orange (`#ff6600`) · Threat level: CRITICAL
- Available from: Wave 10

### Cluster Submunition — `submunition`

Spawned by a CBM post-split. Fast, numerous, small reward.

- Speed: `0.130` wu/s · Damage: `10` HP · Reward: `$50`
- Color: Orange (`#ff8833`) · Threat level: HIGH

### Bomber

Strategic bomber with 3–8 HP (scales with wave number). Flies across the entire radar edge-to-edge, dropping cruise-missile payloads at intervals while inside the ADIZ.

- Speed: `0.055 + waveScaling × 0.005` wu/s · HP: `3 + floor(waveScaling)`, max 8
- Reward: `$600 + floor(waveScaling × 100)`
- Drop interval: every `max(3.5, 6 − waveScaling × 0.5)` seconds
- Requires multiple interceptor hits to destroy
- Color: Gold (`#ffcc44`)

### Enemy Fighter

Hostile jet with 2 HP, flare countermeasures (75% deflect chance), and strafing attacks that fire missiles at Qatar targets.

- HP: 2 · Speed: `0.22 + waveScaling × 0.02` wu/s
- Flares: `2 + floor(waveScaling)` charges · Flare evasion: 75%
- Strafe shots: `2 + floor(waveScaling)` before retreating
- Reward: `$400 + floor(waveScaling × 80)`
- Color: Red (`#ff4444`)

---

## 7. Friendly Forces

### F-15QA Fighter Jets — Key `6`, $1500

Squadron launched from Al Udeid. Each jet has 5 missiles, 90-second lifetime, and autonomously hunts the highest-priority air threats.

**Target priority:**
1. Enemy fighters (engagement range: 0.85 wu)
2. Bombers (0.7 wu range)
3. Drones, loiters, cruise missiles, MaRVs, MIRVs (0.7 wu range)

- Kill probability per missile engagement: **90%**
- Bomber/enemy-fighter: 1 HP damage per shot
- Engage cooldown: 4 s between shots · Lifetime: 90 s, then RTB
- Dispatching disables Al Udeid for a recharge period (30 s)

### QAF Hornet UAVs — Key `8`, $600 — unlocks Wave 8

Autonomous kamikaze drones hunting `drone` and `loiter` type threats. Ram on contact (destroy both UAV and target). Do not return to base.

- Speed: `0.32` wu/s · Lifetime: 120 s · Ram range: `0.030` wu
- Patrol: loose ellipse over central Qatar when no target is acquired
- Target scoring: prefers closer, higher-progress threats (`progress × 3 − dist`)
- Callsigns: `UAV-01`, `UAV-02`, etc.

### Naval Frigates — Key `7`, $1200 — unlocks Wave 11

QN-series destroyers; see [Section 16](#16-naval-operations--frigates) for full details.

### Allied Air Support — $5000

4-minute automatic ADIZ coverage. 5-minute cooldown. Button shows live countdown. Best saved for genuine emergencies.

---

## 8. Defense Batteries & Map Positions

| ID | Name | World Position | Weapon |
|----|------|---------------|--------|
| A | Alpha / Al-Shahaniya Desert | (−0.068, 0.165) | Patriot PAC-3 |
| B | Bravo / Fuwayrit Interior | (0.028, −0.205) | Arrow-3 |
| C | Charlie / Zekreet Plateau | (−0.095, −0.040) | SHORAD (Crotale) |
| D | Delta / Umm Bab Desert | (−0.012, 0.055) | Iron Beam (HEL) |
| E | Echo / Al-Khasah Desert | (0.045, 0.178) | Patriot PAC-3 |
| CR1 | C-RAM / Doha Port | (0.110, 0.015) | C-RAM Phalanx |
| CR2 | C-RAM / Al Udeid | (0.035, 0.082) | C-RAM Phalanx |
| CR3 | C-RAM / Ras Laffan | (0.098, −0.262) | C-RAM Phalanx |

The nearest active battery of the selected weapon type fires each interceptor. Batteries can be disabled by game events; the HUD shows "OFFLINE" when unavailable.

---

## 9. Resource & Economy System

### Starting Resources

- **Money**: $2,000
- **Health**: 200 HP (max 200)

### Income Sources

| Source | Amount |
|--------|--------|
| Level-up (every 45 s) | $300 + level × $50 |
| Successful interception | See weapon reward column in threat tables |
| Powerup: Emergency Funds | +$1,200 |
| Powerup: Resupply | +$600 + reset cooldowns |

### Health

- **Regen**: 0.5 HP/s passive (up to max)
- **Adrenaline Mode**: activates at HP ≤ 30%; all kill rewards +50%
- **Shield Powerup**: 30-second damage immunity

---

## 10. Wave System & Difficulty Progression

### Type Unlock Table

| From Wave | Available Types | Base Count | Interval |
|-----------|----------------|-----------|---------|
| 1 | ballistic, cruise | 2–3 | 30 s |
| 5 | + drone | 3–5 | 27 s |
| 10 | + antiship, cluster | 3–5 | 24 s |
| 15 | + hypersonic | 4–6 | 22 s |
| 22 | + maneuver (MaRV) | 4–6 | 20 s |
| 32 | + loiter | 4–7 | 18 s |
| 55 | + mirv | 5–8 | 16 s |
| 100+ | all | 6–10 | 14 s |

### Wave Scaling

Each spawned missile receives a `waveScaling` multiplier that increases speed and damage (damage capped at ×2.5).

### Threat Origins (weighted)

| Direction | Weight |
|-----------|--------|
| North | 3 |
| Northeast / Northwest | 2 each |
| Southeast / West | 1 each |

### Target Sites (weighted)

| Name | Weight |
|------|--------|
| Doha | 5 |
| Al Udeid / Ras Laffan | 3 each |
| Al Wakrah / North Base / Hamad Intl / Dukhan / Al Khor Naval | 2 each |

Every 5th wave triggers a PSA cutscene (if enabled) before the wave spawns.

---

## 11. Heartbeat State Machine

A four-state machine overlays the wave system to create natural rhythm: **BUILD → PEAK → DRAIN → RECOVER → BUILD…**

| State | Duration | Count Multiplier | Interval Modifier | Description |
|-------|----------|-----------------|-------------------|-------------|
| BUILD | 55–90 s | ×0.85 | +2 s | Ramp-up; manageable density |
| PEAK | 28–50 s | ×1.35 | −6 s | Coordinated multi-type assault |
| DRAIN | 22–38 s | ×0.22 | +12 s | Lull; very few threats |
| RECOVER | 20–35 s | ×0.55 | +6 s | Gradual return to BUILD |

### Peak Profiles (rotate each peak)

| Profile | Label | Bias Types | Count Bonus | Bomber Raid |
|---------|-------|-----------|-------------|-------------|
| SWARM | DRONE SWARM | drone, loiter | +16 | No |
| HEAVY | HEAVY ASSAULT | ballistic, mirv, antiship | 0 | Yes |
| SNIPE | PRECISION STRIKE | hypersonic, maneuver | −2 | No |
| SATURATION | SATURATION ATTACK | all | +8 | Yes |

Peak intensity escalates: `intensity = min(1.0 + (peakCount − 1) × 0.18, 3.0)`.  
Lull depth scales proportionally: `lullDepth = min(intensity × 1.2, 2.5)`.

---

## 12. AI Dynamic Difficulty Adjustment (DDA)

`DifficultyAgent` in `src/ai/DifficultyAgent.js` implements a **contextual epsilon-greedy linear bandit** that adjusts wave difficulty every wave to maintain player flow state.

### Flow-State Targets

| Metric | Target |
|--------|--------|
| Interception ratio | ~72% |
| Health ratio | ~60% |

### 9-Dimensional State Vector

| Index | Feature |
|-------|---------|
| 0 | Interception ratio |
| 1 | Health normalized |
| 2 | Health delta (clamped ±1) |
| 3 | APM normalized (÷60) |
| 4 | Wave number normalized (÷100) |
| 5 | Miss EMA (α=0.3) |
| 6 | Hesitation normalized (÷5000 ms) |
| 7 | Money pressure `max(0, 1 − money/3000)` |
| 8 | Streak factor `min(1, streak/5)` |

### Difficulty Presets

| Action | Label | Count × | Interval Δ | TGP Bonus | Speed × |
|--------|-------|---------|-----------|-----------|---------|
| 0 | EASY | ×0.50 | +10 s | −0.30 | ×0.82 |
| 1 | MILD | ×0.72 | +5 s | 0.00 | ×0.92 |
| 2 | FLOW | ×1.00 | 0 s | 0.00 | ×1.00 |
| 3 | HARD | ×1.22 | −5 s | +0.40 | ×1.08 |
| 4 | BRUTAL | ×1.45 | −9 s | +0.80 | ×1.18 |

During DRAIN/RECOVER states, action is clamped ≤ MILD.

### Reward Function

```
r = 1.0
  − 1.8 × |interception_ratio − 0.72|
  − 1.2 × |health_norm − 0.60|
  − max(0, 0.20 − health_norm) × 3.0    (near-death penalty)
  − max(0, interception_ratio − 0.95) × 2.0  (too-easy penalty)
  + 0.10 × apm_norm
clamped to [−2, +2]
```

### Learning Details

- Linear value function: `V(s,a) = dot(W[a], s) + bias[a]`
- Learning rate α = 0.14 · Initial ε = 0.40 · ε decay = ×0.97/wave · ε floor = 0.05
- 80-transition circular replay buffer; 4-sample mini-replay per wave
- Persisted to `localStorage` key `qad_dda_agent_v2` every 5 episodes
- **TF.js upgrade**: after 200+ transitions, attempts to load TensorFlow.js and trains a 9→16→16→5 MLP; persisted to IndexedDB `qad-dda-net-v1`

---

## 13. Powerups

Spawn from the radar edge every ~45 seconds, drift inward. Click to collect. Expire in 16–22 s; blink rapidly in the last 4 seconds.

| Type | Icon | Color | Effect |
|------|------|-------|--------|
| Emergency Funds | `$` | Amber | +$1,200 |
| Repair Crew | `+` | Green | +25 HP |
| Defense Shield | `◈` | Sky blue | 30 s damage immunity |
| Intel Burst | `◎` | Purple | Clears all radar ghost contacts |
| Overclock | `⚡` | Cyan | 2× interceptor speed for 20 s |
| Resupply | `◉` | Gold | +$600 + reset all weapon cooldowns |

Spawn weight: `funds` (×3), `repair` (×2), `shield`, `intel`, `overclock`, `ammo` (×2).

---

## 14. Civilian Air Traffic

**Transit flights** — fly across the radar on 5 predefined lanes. Tagged with real-world callsigns (QR, EK, SQ, BA, LH, AF, TK, MS, etc.).

**Inbound flights** — approach Hamad International Airport from 5 directional corridors. Tagged `INBOUND`.

### Divert System

When active drones are detected in the ADIZ, civilian aircraft automatically divert to three safe exit corridors (south UAE, east Gulf, southwest Saudi). Inbound flights redirect before final approach.

### Civilian Incident Penalty

Intercepting a civilian aircraft triggers a financial penalty and reduces RepPoints (rank penalty).

---

## 15. Radar Ghosts & EW Jamming

### Radar Ghosts

Fake radar blips injected by enemy EW. Appear as ballistic, cruise, or drone contacts; drift slowly; vanish in 3.5–7 s. Firing at a ghost wastes an interceptor. The Intel Burst powerup (`◎`) clears all ghosts instantly.

### EW Jamming — Key `9`, $300

- Active duration: **3 minutes** (180 s) · Cooldown: **5 minutes** (300 s)
- Marks all currently active missiles as `_jammed = true`
- Reduces jammed missile speed to **60%** (`_jamMult = 0.60`)
- Jammed missiles slide off-screen and do not register impacts
- Missiles spawned after EW activation are not automatically jammed

---

## 16. Naval Operations — Frigates

### Deployment

Key `7` or **FRIGATES** button ($1200; unlocks at Wave 11). Sails from Al Khor Naval Base (0.175, −0.133).

### Patrol Zones

| Zone | Location | Description |
|------|----------|-------------|
| A | Persian Gulf east of Qatar | 3 waypoints; direct route |
| B | Gulf of Bahrain | 3 waypoints; routes via NE→N→NW gates around peninsula tip |
| C | North of peninsula tip | 2 waypoints; direct |

### Combat Systems

| System | Range | Fire Rate | Targets |
|--------|-------|-----------|---------|
| VLS (24 rounds) | 150 km (0.50 wu) | 3.0 s/shot | Cruise, anti-ship |
| C-RAM Phalanx | 50 km (0.167 wu) | 0.9 s/shot | Drones, close anti-ship |

- Deployment: **5 minutes** · VLS ammo: **24 rounds** · Recharge after RTB: **60 s**
- Anti-ship missiles can sink a frigate (money penalty)

---

## 17. Rank & Progression System

Rank persists via browser cookies. Based on **RepPoints**, not raw score.

### RepPoints Formula

```
base = kills × 8
     + floor(playtimeSec / 60) × 50
     + gamesPlayed × 30
     + bestStreak × 20

multipliers applied cumulatively:
  bestStreak ≥ 5   → +10%   bestStreak ≥ 10  → +12%
  gamesPlayed ≥ 10 → +8%    gamesPlayed ≥ 25 → +10%
  totalKills ≥ 200 → +8%    totalKills ≥ 500 → +10%

RepPoints = max(0, round(base × mult) − penalty)
```

### Full Rank Table

| # | English | Arabic | Category | Rep Required |
|---|---------|--------|----------|-------------|
| 1 | Jundi | جندي | Enlisted | 0 |
| 2 | Wakil Awwal | وكيل اول | Enlisted | 500 |
| 3 | Wakil Thani | وكيل ثاني | Enlisted | 1,500 |
| 4 | Raqib | رقيب | Enlisted | 4,000 |
| 5 | Nayib | نائب | Enlisted | 9,000 |
| 6 | Earif | عريف | Enlisted | 18,000 |
| 7 | Wakil Earif | وكيل عريف | Enlisted | 35,000 |
| 8 | Mulazim | ملازم | Officer | 60,000 |
| 9 | Mulazim Awwal | ملازم أول | Officer | 95,000 |
| 10 | Naqib | نقيب | Officer | 140,000 |
| 11 | Ra'id | رائد | Officer | 200,000 |
| 12 | Muqaddam | مقدم | Officer | 280,000 |
| 13 | Aqid | عقيد | Officer | 380,000 |
| 14 | Amid | عميد | Officer | 500,000 |
| 15 | Liwa | لواء | Officer | 650,000 |
| 16 | Fariq | فريق | Officer | 850,000 |
| 17 | Fariq Awwal | فريق اول | Officer | 1,100,000 |

### Persistent Cookie Keys

| Cookie | Stores |
|--------|--------|
| `qad_hs` | All-time high score |
| `qad_cs` | Cumulative score |
| `qad_gp` | Games played |
| `qad_tk` | Total kills |
| `qad_pt` | Total playtime (seconds) |
| `qad_ks` | Best kill streak |
| `qad_rkp` | Rank penalty |

**CLEAR DATA** button in top bar permanently resets all cookies after confirmation.

---

## 18. PSA Cutscene System

Before every 5th wave, the game pauses and plays a shuffled Qatari civil defense PSA video.

### Playlist (11 videos in `assets/videos/PSAs/`)

AlertLoud.mp4 · Drones.mp4 · ExplosionsWhenDriving.mp4 · Fake News.mp4 · IfYouSeeMissile.mp4 · IntegratedSecurityFramework.mp4 · LoudSound.mp4 · MarketsStable.mp4 · ReportSuspicious.mp4 · ShoppingComplexes.mp4 · WorkplaceProcedure.mp4

Playlist is shuffled at startup and plays sequentially. Once all 11 have played, cutscenes stop for that session. Toggle with **🎬 PSA** button.

### Cutscene Flow

1. Wave timer fires on wave `n` where `n % 5 === 0`
2. Wave timer frozen; game + music paused
3. Cutscene overlay shown: PSA video + title card + SKIP button
4. Video ends or player skips → `doneCb()` called
5. Wave spawns; game + music resume

---

## 19. Audio System

All audio uses the **Web Audio API**. No external audio library.

### Background Music

16 Arabic/Qatari tracks in `assets/sounds/Music/`. Shuffled playlist, plays sequentially. Default volume: 20%. Controlled via HUD **MUSIC** button, Settings volume slider, or Electron menu (Shift+M).

### Kill SFX

10 randomized kill sound files (no consecutive repeats). Plays on every successful interception.

### C-RAM Audio

Distinctive machine-gun loop during Phalanx bursts. First-ever C-RAM fire plays a cinematic intro clip; subsequent firings skip to the loop directly.

### Air-Raid Siren

Triggers automatically when any threat crosses the ADIZ boundary. 1-second arm delay; won't re-trigger until the current siren finishes.

### Voice Callouts

`window.speechSynthesis` with 4.5-second cooldown between callouts. Queue prevents overlapping. Key voice events:

- Game start · PEAK wave warnings · Adrenaline mode · Lull / resupply · Kill streaks
- Border crossings · Allied support activation · ADIZ breach alert

### SoundManager API

```javascript
window._soundMgr.toggleSound()       // SFX on/off
window._soundMgr.toggleVoice()       // Voice on/off
window._soundMgr.toggleMusic()       // Music on/off
window._soundMgr.setSfxVolume(0–1)   // SFX master gain
window._soundMgr.setMusicVolume(0–1) // Music volume
window._soundMgr.speak(text, urgent) // Queue voice callout
window._soundMgr.resume()            // Resume AudioContext
```

---

## 20. Coordinate System & Map Geometry

```
Center:  25.32°N, 51.20°E  =  world (0, 0)
Scale:   300 km             =  1.0 world unit

x = (longitude − 51.20) / 2.981
y = −(latitude − 25.32) / 2.703   [positive y = south/down]
```

### Key Positions

| Location | X | Y |
|----------|---|---|
| Doha city center | 0.111 | 0.011 |
| Hamad International Airport | 0.137 | 0.022 |
| Al Udeid Airbase | 0.037 | 0.074 |
| Ras Laffan LNG | 0.117 | −0.311 |
| Al Khor Naval Base | 0.175 | −0.133 |
| Dukhan Oil Field | −0.138 | −0.041 |

### Qatar Peninsula Extent

```
x: −0.19 to +0.17
y: −0.31 to +0.23
```

### ADIZ

Qatar outline polygon expanded radially 100 km (≈0.333 wu) from centroid (0.003, 0.011). C-RAM targeting is restricted to within the ADIZ boundary.

### Coordinate Transforms

```javascript
radar.worldToScreen(wx, wy)  // → { x: sx, y: sy }  canvas pixels
radar.screenToWorld(sx, sy)  // → { x: wx, y: wy }  world units
```

Both account for zoom level, zoom center offset, and HUD panel insets.

---

## 21. Project Architecture

Vanilla **ES6 modules** — no build needed in the browser. Webpack bundles to `dist/` for GitHub Pages.

```
Qatar Air Defense/
├── index.html              # Full HTML layout — all HUD panels, modals, overlays
├── electron-main.js        # Electron main process — game:// protocol, window, menu
├── package.json            # Scripts, Electron/webpack/builder config
├── styles/
│   ├── main.css            # Global layout, bottom bar, start screen
│   ├── radar.css           # Radar canvas frame, scan glow, phosphor effect
│   └── ui.css              # HUD panels, arsenal list, tooltips, threat list
├── src/
│   ├── main.js             # Entry — wires Game, InputHandler, UIManager, SoundManager
│   ├── ai/
│   │   └── DifficultyAgent.js   # Contextual bandit DDA
│   ├── audio/
│   │   └── SoundManager.js      # Web Audio, music, kill SFX, siren, voice
│   ├── entities/
│   │   ├── Missile.js           # 10 enemy missile types + MISSILE_TYPES config
│   │   ├── Interceptor.js       # 5 interceptor types + INTERCEPTOR_TYPES config
│   │   ├── Bomber.js            # Strategic bomber (HP model, drop callback)
│   │   ├── EnemyFighter.js      # Maneuvering enemy jet, flare countermeasures
│   │   ├── FighterJet.js        # Friendly F-15QA (hunts air targets, RTBs)
│   │   ├── HornetDrone.js       # Friendly kamikaze UAV (hunts drone/loiter)
│   │   ├── Frigate.js           # Naval frigate (VLS + C-RAM, sea routing)
│   │   ├── CivilianAircraft.js  # Transit + landing civilian traffic & divert
│   │   ├── RadarGhost.js        # Fake EW decoy blip
│   │   ├── Explosion.js         # Particle sparks + ring effect
│   │   └── Powerup.js           # Collectible powerup drops (6 types)
│   ├── game/
│   │   ├── Game.js             # Core loop, wave spawning, DDA, heartbeat, all callbacks
│   │   ├── Radar.js            # Qatar map, ADIZ, batteries, worldToScreen, scan
│   │   ├── EntityManager.js    # Entity lifecycle management
│   │   └── GameState.js        # Money, health, score, level, wave counter
│   ├── input/
│   │   └── InputHandler.js     # Canvas click/hover, keyboard, HUD button wiring
│   └── ui/
│       └── UIManager.js        # HUD updates, kill board, arsenal, rank, cutscene
└── assets/
    ├── images/             # Qatar flag, map SVGs, rank insignia images
    ├── sounds/             # SFX files + Music/ folder
    └── videos/
        └── PSAs/           # 11 PSA videos (mp4)
```

### Module Dependency Overview

```
main.js
  ├── Game.js ─── Radar, EntityManager, GameState, DifficultyAgent
  │              └── [all entity modules]
  ├── InputHandler.js ─── Interceptor (type config)
  ├── UIManager.js ─── Interceptor + Missile (type configs)
  └── SoundManager.js
```

### Game Loop

```
gameLoop(timestamp)
  deltaTime = min((timestamp − lastTime) / 1000, 0.05)  // capped at 50 ms
  update(deltaTime)  ← try/catch; exceptions never kill the loop
  render()           ← try/catch
  requestAnimationFrame(gameLoop)   // only if running === true
```

---

## 22. Module Reference

### `GameState` — key methods

| Method | Description |
|--------|-------------|
| `reset()` / `start()` | Reset to initial values |
| `update(dt)` | Level timer, HP regen, income |
| `spendMoney(n)` | Returns `false` if insufficient |
| `damaged(n)` | Reduce HP; sets `gameOver` if ≤ 0 |
| `addScore(pts)` | Award score points |
| `addInterception()` | Increment interception counter |

### `Radar` — key methods

| Method | Description |
|--------|-------------|
| `worldToScreen(x, y)` | World → canvas pixels |
| `screenToWorld(sx, sy)` | Canvas pixels → world |
| `isInsideQatar(x, y)` | Point-in-polygon vs. Qatar outline |
| `isInsideADIZ(x, y)` | Point-in-polygon vs. ADIZ |
| `getNearestBattery(type)` | Nearest enabled battery of given type |
| `disableBattery(id)` / `enableBattery(id)` | Toggle battery availability |

### `Game` — key public methods

| Method | Description |
|--------|-------------|
| `start()` / `pause()` / `resume()` | Lifecycle control |
| `resize(w, h, insets)` | Rebuild radar transform |
| `addInterceptor(i)` | Register interceptor entity |
| `getNearestMissile/Bomber/EnemyFighter/Civilian/Powerup(x, y)` | Spatial queries |
| `collectPowerup(p)` | Apply powerup and remove it |
| `isLaserReady()` / `triggerLaserCooldown()` | Iron Beam cooldown |
| `isBatteryAvailable(type)` | Check battery status |
| `setCallbacks(obj)` | Wire UIManager event callbacks |
| `dispatchJets()` / `dispatchHornets()` / `dispatchFrigates()` | Launch friendly forces |
| `activateEW()` / `activateAlliedSupport()` | Activate support systems |

---

## 23. Building & Packaging

### npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `electron .` | Run Electron dev |
| `npm run web` | `python -m http.server 8000` | Browser dev server |
| `npm run dev` | `webpack serve --mode development` | Webpack HMR dev server |
| `npm run build` | `webpack --mode production` | Webpack production bundle |
| `npm run package` | `electron-builder --win` | Windows installer + portable EXE |

### Webpack

- Bundles ES module source into `dist/bundle.[hash].js`
- `HtmlWebpackPlugin` → `dist/index.html`
- `CopyWebpackPlugin` → copies `assets/`, `styles/`, audio files to `dist/`

### electron-builder (Windows)

| Setting | Value |
|---------|-------|
| appId | `com.qatarairdefense.desktop` |
| productName | Qatar Air Defense Command |
| Output | `dist/` |
| Targets | NSIS installer (x64) + Portable (x64) |
| Icon | `assets/icon.ico` |
| NSIS | `oneClick: false` — user chooses install dir |

Code signing is skipped by default. Unsigned builds show SmartScreen warnings on other machines.

---

## 24. CI/CD — GitHub Actions

Workflow: `.github/workflows/webpack.yml`

**Triggers**: push to `main`/`master`, pull requests, `workflow_dispatch`

**build** job (ubuntu-latest, Node 24):
1. `actions/checkout@v4.2.2`
2. `actions/setup-node@v4.4.0` — Node 24 with npm cache
3. `npm ci` → `npm run build`
4. Upload `dist/` as Pages artifact

**deploy** job (non-PR pushes only):
- `actions/deploy-pages@v4` → GitHub Pages
- URL exposed as `steps.deployment.outputs.page_url`

Permissions: `contents: read`, `pages: write`, `id-token: write`

---

## 25. Configuration Reference

| Value | File | Default |
|-------|------|---------|
| Starting money | `GameState.js` | $2,000 |
| Starting health / max HP | `GameState.js` | 200 HP |
| Level interval | `GameState.js` | 45 s |
| Level-up income | `GameState.js` | $300 + level × $50 |
| Health regen | `GameState.js` | 0.5 HP/s |
| Radar scan speed | `Radar.js` | 1.1 rad/s |
| Zoom range | `Radar.js` | 0.5×–4.0× |
| Iron Beam cooldown | `Game.js` | 8 s |
| Jet recharge cooldown | `Game.js` | 30 s |
| Hornet recharge cooldown | `Game.js` | 90 s |
| Frigate recharge cooldown | `Game.js` | 60 s |
| EW active duration | `Game.js` | 180 s |
| EW cooldown | `Game.js` | 300 s |
| Allied support duration | `Game.js` | 240 s |
| Allied support cooldown | `Game.js` | 300 s |
| Powerup spawn interval | `Game.js` | 45 s |
| Powerup lifetime | `Powerup.js` | 16–22 s |
| TGP passive rate | `Game.js` | 1.0 + wave × 0.04 TGP/s |
| BUILD state duration | `Game.js` | 55–90 s |
| PEAK state duration | `Game.js` | 28–50 s |
| DRAIN state duration | `Game.js` | 22–38 s |
| RECOVER state duration | `Game.js` | 20–35 s |
| DDA learning rate α | `DifficultyAgent.js` | 0.14 |
| DDA initial epsilon | `DifficultyAgent.js` | 0.40 |
| DDA epsilon decay | `DifficultyAgent.js` | ×0.97/wave |
| DDA replay buffer size | `DifficultyAgent.js` | 80 transitions |
| Music default volume | `SoundManager.js` | 0.20 (20%) |
| Voice cooldown | `SoundManager.js` | 4.5 s |

---

## 26. Strategy Guide

### Economy Fundamentals

- Never go bankrupt. An empty wallet when the next wave peaks means zero defense.
- Use **Iron Beam** ($40) on drone waves — cheapest effective per-kill.
- **C-RAM** ($20/burst) is even cheaper for ADIZ swarms; reserve for large drone groups inside Qatar.
- **Arrow-3** ($380) only for ballistics, MIRVs, hypersonics, cluster missiles. Never on drones.
- **SHORAD** ($70) is your workhorse for drones and cruise missiles in early waves.

### Threat Priority

1. **Hypersonic / MIRV** — tiny intercept windows; fire Arrow-3 on detection.
2. **Cluster CBM** — must intercept before 60% progress or fight many submunitions.
3. **Loitering munitions** — catch on approach; once orbiting, they're frustrating to hit.
4. **Bombers** — each drop spawns a cruise missile; silence them early with jets.
5. **Anti-ship** — only priority if frigates are deployed in the Gulf.

### PEAK Waves

| Profile | Best Response |
|---------|--------------|
| DRONE SWARM | Iron Beam + C-RAM; never Patriot on drones |
| HEAVY ASSAULT | Arrow-3 primary; expect MIRV saturation |
| PRECISION STRIKE | Arrow-3 only; few targets but high damage |
| SATURATION | Pick off fastest threats first; use EW to slow everything |

### Frigates

Deploy into the Gulf as a forward interception layer. They catch cruise and anti-ship missiles before those threats enter land battery range, effectively doubling your interception depth on the eastern and northern approaches.

### Allied Support

Save $5,000 for double-PEAK sequences or a SATURATION wave while your batteries are depleted. The 5-minute cooldown means you cannot rely on it regularly.

### Adrenaline Mode (HP ≤ 30%)

+50% kill rewards. Best time to fire expensive interceptors; maximize earnings while under pressure.

---

## 27. Browser Compatibility

Requirements: ES6 Modules · Canvas 2D API · Web Audio API · SpeechSynthesis API (optional) · localStorage · Cookies · Fullscreen API (optional)

| Browser | Min Version | Notes |
|---------|------------|-------|
| Chrome | 90+ | Full support; best results |
| Edge | 90+ | Chrome-based; identical |
| Firefox | 88+ | Fully supported |
| Safari | 14+ | Requires user gesture before audio |

**Always serve via HTTP.** `file://` breaks ES module imports.

---

## 28. Roadmap

1. **Campaign Mode** — scripted threat events, named operations
2. **Qatar Map** — interactive infrastructure labels on radar
3. **Upgrade System** — inter-wave battery and interceptor upgrades
4. **Mobile/Touch** — tap-to-fire, pinch-to-zoom, virtual weapon bar
5. **Online Leaderboard** — optional Firebase/Supabase backend
6. **Tutorial Mode** — guided first-wave walkthrough
7. **Multiplayer Co-op** — two commanders splitting ADIZ sectors
8. **Additional Threats** — submarine-launched ballistics, UAV carrier swarms
9. **Entity Pooling** — object pools for missiles/interceptors to reduce GC pressure
10. **Positional Audio** — Web Audio `PannerNode` stereo positioning per threat

---

*This is an educational entertainment project. All scenarios are fictional. Qatar's real air defense capabilities are classified and far more sophisticated than depicted here.*

---

**Last Updated**: March 17, 2026  
**Project Status**: Alpha  
**Version**: 1.0.0
