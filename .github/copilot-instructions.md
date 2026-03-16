# Qatar Air Defense - Development Instructions

## Workspace Overview

This is an interactive air defense strategy game featuring:
- Real-time radar-based interface
- Dynamic missile threats with various types
- Strategic interceptor deployment system
- Resource management and progression

## Quick Start

1. **Start Development Server:**
   ```bash
   cd "c:\Users\reala\OneDrive\Desktop\Qatar Air Defense"
   python -m http.server 8000
   ```

2. **Open in Browser:**
   - Navigate to `http://localhost:8000`

3. **Begin Defending:**
   - Watch the radar for incoming threats
   - Click to deploy interceptors at threat locations
   - Earn money for successful interceptions
   - Progress through levels

## Development Guidelines

### Code Organization

The project uses modular JavaScript (ES6 modules) organized by concern:

- **game/**: Core game loop, state, and systems
- **entities/**: Game objects (Missiles, Interceptors, Explosions)
- **input/**: User input handling and controls
- **ui/**: Display and UI management
- **styles/**: CSS styling and animations

### Adding New Features

#### New Interceptor Type
1. Add to `src/entities/Interceptor.js` in the `InterceptorTypes` object
2. Update `src/input/InputHandler.js` with new cost and selection
3. Test deployment and collision detection

#### New Missile Type
1. Add to `src/entities/Missile.js` in the `MissileTypes` object
2. Update `src/ui/UIManager.js` wave generation
3. Test trajectory and collision detection

#### Game Mechanic Changes
- Modify `src/game/GameState.js` for balance changes
- Update `src/game/Game.js` for collision/physics changes
- Test in browser immediately

### Debugging

- **Browser DevTools:** F12 or Ctrl+Shift+I
- **Console Logging:** `console.log()` statements visible in Console tab
- **Network Tab:** Monitor resource loading
- **Performance Tab:** Profile for rendering bottlenecks

### Testing Checklist

- [ ] Game initializes without errors
- [ ] Radar displays with scanning effect
- [ ] Missiles spawn and move toward target
- [ ] Interceptors deploy on click
- [ ] Collisions register correctly
- [ ] Money updates on interception
- [ ] Health decreases on miss
- [ ] Level increases with time
- [ ] UI buttons function properly
- [ ] Pause/Resume works
- [ ] Game Over screen displays

## Key Configuration Values

Located in respective files:

**Radar** (`src/game/Radar.js`):
- `maxRadius`: Radar display size
- `scanSpeed`: Scanning rotation speed
- `gridSize`: Range ring spacing

**Game** (`src/game/Game.js`):
- `deltaTime`: Frame timing
- Collision detection radius

**GameState** (`src/game/GameState.js`):
- `waveInterval`: Time between difficulty increases
- Base money and health values

**UIManager** (`src/ui/UIManager.js`):
- `waveInterval`: Time between missile spawns
- Difficulty progression

## Common Tasks

### Adjust Missile Spawn Rate
Edit `src/ui/UIManager.js`:
```javascript
setInterval(() => this.generateMissile(), 5000); // Change 5000 (milliseconds)
```

### Change Interceptor Cost
Edit `src/input/InputHandler.js` in `getInterceptorCost()` method

### Modify Starting Money
Edit `src/game/GameState.js`:
```javascript
this.money = 1000; // Change starting amount
```

### Adjust Difficulty Progression
Edit `src/game/GameState.js`:
```javascript
this.waveInterval = 30; // Faster increases = harder game
```

## Browser Compatibility

Tested and working on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires ES6 module support and Canvas 2D API.

## Next Development Priorities

1. **Audio System**: Add sound effects and music
2. **Graphics Polish**: Improved missile/interceptor visuals
3. **Qatar Map**: Visual map background
4. **Upgrade System**: Unlock better interceptors
5. **Tutorial Mode**: Guided introduction
6. **Leaderboard**: High score tracking
7. **Mobile Support**: Touch controls
8. **Campaign Mode**: Story-driven gameplay

## Performance Notes

- Current rendering: ~60 FPS on modern hardware
- Entity pooling not yet implemented (optimization opportunity)
- No physics engine required - simple distance-based system
- Canvas rendering is efficient for this game type

## Resources

- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Game Development Best Practices](https://developer.mozilla.org/en-US/docs/Games)

---

**Last Updated**: March 7, 2026
**Project Status**: Alpha
**Version**: 0.1.0
