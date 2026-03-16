# Qatar Air Defense Game

An interactive, real-time strategy air defense game featuring a radar-based interface. Defend Qatar's airspace against incoming missiles and drones from hostile territory using various interceptor types and allied support.

## Features

- **Radar Interface**: Real-time tactical radar with scanning effects and range rings
- **Dynamic Threats**: Multiple missile types (Standard, Advanced, Cluster, Hypersonic) with varying speeds and damages
- **Interceptor Arsenal**: 
  - Standard Interceptor: Balanced all-purpose defense
  - Rapid-Fire: Quick response with lower damage
  - Area Denial: High damage with larger blast radius
  - Precision Strike: Maximum single-target damage
- **Risk/Reward System**: Earn money by successfully intercepting threats
- **Allied Support**: Purchase temporary defensive boosts for strategic advantage
- **Progressive Difficulty**: Increasing wave intensity as you advance through levels
- **Health & Resource Management**: Balance money spending with health preservation

## Game Mechanics

### Money System
- Earn $50-150 per successful interception (varies by missile type)
- Spend money to deploy interceptors
- Purchase allied support for critical defense situations

### Health System
- Base health: 100
- Each missed missile damages your defense
- Game over when health reaches 0

### Interceptor Types
| Type | Cost | Ideal For |
|------|------|-----------|
| Standard | $100 | General defense |
| Rapid-Fire | $150 | High-speed threats |
| Area Denial | $250 | Multiple targets |
| Precision | $200 | Single high-value targets |

## Controls

### Mouse
- **Left Click**: Deploy selected interceptor at clicked location

### Keyboard
- **1-4**: Select interceptor type (Standard, Rapid-Fire, Area Denial, Precision)
- **Space**: Pause/Resume game
- **ESC**: Close pause menu

### UI Buttons
- **PAUSE**: Pause the game
- **REQUEST ALLIED SUPPORT**: Activate temporary defensive boost ($500)
- **SETTINGS**: Game settings (coming soon)

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js 20+ for desktop packaging
- Python 3.x only if you want to run the browser version

### Running the Desktop App

Install dependencies once:

```bash
npm install
```

Launch the Electron desktop app in development mode:

```bash
npm start
```

Or on Windows:

```bat
launch.bat
```

### Packaging the Desktop App

Build both a Windows installer and a portable EXE:

```bash
npm run package
```

Build only the installer:

```bash
npm run build:installer
```

Build only the portable EXE:

```bash
npm run build:portable
```

Build an unpacked test folder without creating an installer:

```bash
npm run package:dir
```

Packaged output is written to `dist/`.

### Running the Browser Version

**Option 1: Using Python HTTP Server**
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser

**Option 2: Using Live Server in VS Code**
- Install the "Live Server" extension
- Right-click `index.html` and select "Open with Live Server"

**Option 3: Direct File Access**
- Open `index.html` directly in your browser (limited functionality)

## Project Structure

```
qatar-air-defense/
├── index.html                 # Main game page
├── package.json               # Project metadata
├── styles/
│   ├── main.css              # Core styles
│   ├── radar.css             # Radar-specific styles
│   └── ui.css                # UI component styles
├── src/
│   ├── main.js               # Entry point
│   ├── game/
│   │   ├── Game.js           # Main game loop
│   │   ├── Radar.js          # Radar system
│   │   ├── EntityManager.js  # Entity lifecycle management
│   │   └── GameState.js      # Game state tracking
│   ├── entities/
│   │   ├── Missile.js        # Missile entity & types
│   │   ├── Interceptor.js    # Interceptor entity & types
│   │   └── Explosion.js      # Explosion effects
│   ├── input/
│   │   └── InputHandler.js   # Input & controls
│   └── ui/
│       └── UIManager.js      # UI updates & display
└── assets/
    ├── images/               # Game graphics (placeholder)
    └── sounds/               # Audio effects (placeholder)
```

## Gameplay Strategy

1. **Early Game (Levels 1-3)**
   - Use Standard Interceptors for general defense
   - Build up cash reserves
   - Learn mouse aiming

2. **Mid Game (Levels 4-7)**
   - Mix interceptor types for efficiency
   - Save for expensive Precision Strikes
   - Use Area Denial against clusters

3. **Late Game (Levels 8+)**
   - Strategic use of Allied Support
   - Prioritize high-value missile threats
   - Maintain health above 30% for buffer

## Future Development

- [ ] Sound effects and music
- [ ] Upgrade system for interceptors
- [ ] Different battle scenarios
- [ ] Customizable difficulty levels
- [ ] Leaderboard system
- [ ] Mobile controls support
- [ ] Graphical improvements and animations
- [ ] Campaign mode with story

## Performance

The game is optimized for 60 FPS on modern browsers. It uses:
- Canvas 2D rendering for fast performance
- Efficient entity pooling
- Throttled UI updates
- Hardware acceleration when available

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

**Game doesn't start:**
- Check browser console for errors (F12)
- Ensure JavaScript is enabled
- Try a different browser

**Performance issues:**
- Close other browser tabs
- Disable browser extensions
- Lower screen resolution
- Use a modern browser

## License

MIT License - Feel free to modify and distribute

## Author

Qatar Air Defense Development Team

---

**Note**: This is an educational and entertainment project. Any resemblance to real military systems is purely coincidental.
