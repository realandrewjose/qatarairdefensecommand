// ── Qatar geographic coordinate system ──
// Center: 25.32°N, 51.20°E = world (0, 0)
// Scale: 300 km = 1.0 world unit
// x = (lon - 51.20) / 2.981  (lon degrees at 25°N ≈ 100.6 km each, 300/100.6≈2.981)
// y = -(lat - 25.32) / 2.703 (lat degrees ≈ 111 km each, 300/111≈2.703)

// Accurate Qatar peninsula outline (clockwise from SW corner)
const QATAR_OUTLINE = [
    [-0.128,  0.315], // 24.47°N 50.82°E – SW (land border with Saudi Arabia)
    [-0.051,  0.315], // 24.47°N 51.05°E
    [ 0.027,  0.315], // 24.47°N 51.28°E – SE (land border end)
    // East coast heading north
    [ 0.074,  0.285],
    [ 0.107,  0.241],
    [ 0.127,  0.193],
    [ 0.134,  0.137],
    [ 0.134,  0.074],
    [ 0.134,  0.007], // 25.30°N near Doha
    [ 0.127, -0.048],
    [ 0.117, -0.104],
    [ 0.100, -0.159],
    [ 0.074, -0.207],
    [ 0.034, -0.252],
    [ 0.007, -0.289],
    [ 0.007, -0.315], // 26.17°N 51.22°E – North tip
    // West coast heading south
    [-0.044, -0.296],
    [-0.074, -0.259],
    [-0.101, -0.196],
    [-0.121, -0.122],
    [-0.128, -0.030],
    [-0.128,  0.044],
    [-0.128,  0.130],
    [-0.128,  0.211],
    [-0.128,  0.278],
    // closes back to first point
];

// Critical infrastructure (geographically accurate)
const QATAR_CRITICAL_INFRASTRUCTURE = [
    // Capital & Government
    { name: 'DOHA',             x:  0.111, y:  0.011, type: 'capital',    weight: 10, color: '#ff9900' },
    { name: 'Emiri Diwan',      x:  0.111, y:  0.015, type: 'government', weight:  9, color: '#ff6600' },
    // Airports
    { name: 'Hamad Intl',       x:  0.137, y:  0.022, type: 'airport',    weight:  9, color: '#00aaff' },
    // Military
    { name: 'Al Udeid Airbase', x:  0.037, y:  0.074, type: 'military',   weight:  9, color: '#ff4444' },
    // Energy
    { name: 'Ras Laffan LNG',   x:  0.117, y: -0.311, type: 'energy',    weight:  9, color: '#ffaa00' },
    { name: 'Mesaieed Oil',     x:  0.124, y:  0.126, type: 'energy',    weight:  8, color: '#ff8800' },
    { name: 'Dukhan Oil',       x: -0.138, y: -0.041, type: 'energy',    weight:  8, color: '#ff6600' },
    // Utilities
    { name: 'Kahramaa Power',   x:  0.090, y:  0.030, type: 'utility',   weight:  7, color: '#ffff00' },
    { name: 'Desalination',     x:  0.134, y:  0.048, type: 'utility',   weight:  7, color: '#00ffff' },
    // Cities
    { name: 'Al Wakrah',        x:  0.131, y:  0.055, type: 'city',      weight:  6, color: '#cccccc' },
    { name: 'Al Khor',          x:  0.101, y: -0.133, type: 'city',      weight:  6, color: '#cccccc' },
    { name: 'Al Khor Naval',   x:  0.175, y: -0.133, type: 'naval',     weight:  7, color: '#44aaff' },
    { name: 'Madinat Ash Shamal', x: 0.023, y: -0.270, type: 'city',    weight:  5, color: '#aaaaaa' },
    { name: 'Al Ruwais',        x: -0.040, y: -0.274, type: 'city',      weight:  4, color: '#999999' },
];

// Defense batteries at geographically accurate positions
export const DEFENSE_BATTERIES = [
    { id: 'A', name: 'Alpha / Al Udeid',   x:  0.037, y:  0.074, type: 'patriot', color: '#00ff88' },
    { id: 'B', name: 'Bravo / Ras Laffan', x:  0.110, y: -0.289, type: 'arrow',   color: '#0088ff' },
    { id: 'C', name: 'Charlie / Dukhan',   x: -0.120, y: -0.025, type: 'shorad',  color: '#88ff00' },
    { id: 'D', name: 'Delta / Doha',       x:  0.090, y:  0.020, type: 'laser',   color: '#ff4488' },
    { id: 'E', name: 'Echo / Mesaieed',    x:  0.124, y:  0.118, type: 'patriot', color: '#ff8800' },
    // C-RAM Phalanx batteries (point defence — 3 fixed sites)
    { id: 'CR1', name: 'C-RAM / Doha Port',    x:  0.118, y:  0.008, type: 'cram', color: '#ff6600' },
    { id: 'CR2', name: 'C-RAM / Al Udeid',     x:  0.042, y:  0.068, type: 'cram', color: '#ff6600' },
    { id: 'CR3', name: 'C-RAM / Ras Laffan',   x:  0.105, y: -0.278, type: 'cram', color: '#ff6600' },
];

// Background SVG (simplemaps qa.svg) world bounding box
const SVG_WORLD = { left: -0.356, right: 0.356, top: -0.356, bottom: 0.356 };

// QatarOutline.svg — drawn slightly larger than the qa.svg background (SVG_WORLD ±0.356).
// Centred on Qatar's geographic centroid (x=0.003, y=0.011), half-span 0.40.
const OUTLINE_WORLD = { left: -0.397, right: 0.403, top: -0.389, bottom: 0.411 };

// ADIZ — Air Defense Identification Zone: Qatar outline expanded 100 km into the sea.
// Expansion is radial from Qatar's geographic centroid (0.003, 0.011).
const QATAR_CENTROID = [0.003, 0.011];
const ADIZ_OFFSET = 100 / 300; // 100 km in world units ≈ 0.333
const QATAR_ADIZ = QATAR_OUTLINE.map(([x, y]) => {
    const dx = x - QATAR_CENTROID[0];
    const dy = y - QATAR_CENTROID[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return [x, y];
    return [x + (dx / dist) * ADIZ_OFFSET, y + (dy / dist) * ADIZ_OFFSET];
});

function _pointInPoly(poly, x, y) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1];
        const xj = poly[j][0], yj = poly[j][1];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi))
            inside = !inside;
    }
    return inside;
}

export class Radar {
    constructor(canvas) {
        this.canvas = canvas;
        this.width   = canvas.width;
        this.height  = canvas.height;
        // Will be properly set by resize() once the DOM is rendered;
        // use safe defaults that match the CSS panel widths/bar heights
        this.resize(canvas.width, canvas.height);
        this.scanAngle = -Math.PI / 2;
        this.scanSpeed = 1.1;
        this.time = 0;

        // Zoom
        this.zoomLevel   = 1.0;
        this.minZoom     = 0.5;
        this.maxZoom     = 4.0;
        this.zoomCenterX = 0;
        this.zoomCenterY = 0;

        // Stars (generated once)
        this._stars = Array.from({ length: 60 }, () => ({
            a: Math.random() * Math.PI * 2,
            r: 0.3 + Math.random() * 0.7,
            size: 0.5 + Math.random() * 1.0,
            brightness: 0.3 + Math.random() * 0.5,
        }));

        // Phosphor echo: stores { angle, radius, alpha } of recent scan hits
        this._phosphorDots = [];

        this._disabledBatteryIds = new Set();

        // Border crossing detection
        this.lastBorderStatus = new Map();
        this.borderSirenActive = false;
        this.sirenCooldown = 0;

        // Load background context map (simplemaps qa.svg)
        this._svgImg   = null;
        this._svgReady = false;
        const img = new Image();
        img.onload = () => { this._svgImg = img; this._svgReady = true; };
        img.src = 'assets/images/qa.svg';

        // Load Qatar outline image (QatarOutline.svg — used as the visible map)
        this._outlineImg   = null;
        this._outlineReady = false;
        const outlineImg = new Image();
        outlineImg.onload = () => { this._outlineImg = outlineImg; this._outlineReady = true; };
        outlineImg.src = 'assets/images/QatarOutline.svg';
    }

    update(deltaTime) {
        this.scanAngle += this.scanSpeed * deltaTime;
        if (this.scanAngle > Math.PI * 1.5) this.scanAngle -= Math.PI * 2;
        this.time += deltaTime;
        if (this.sirenCooldown > 0) this.sirenCooldown -= deltaTime;
    }

    // Uses ADIZ polygon (50 km buffer) for siren triggers
    isInsideQatar(x, y) {
        return _pointInPoly(QATAR_ADIZ, x, y);
    }

    isInsideQatarStrict(x, y) {
        return _pointInPoly(QATAR_OUTLINE, x, y);
    }

    checkBorderCrossings(missiles, onBorderCross) {
        missiles.forEach(m => {
            const isInside = this.isInsideQatar(m.x, m.y);
            const wasInside = this.lastBorderStatus.get(m.id) || false;
            if (isInside !== wasInside) {
                if (isInside && !wasInside) this.triggerBorderSiren(m, 'ENTRY', onBorderCross);
                else if (!isInside && wasInside) this.triggerBorderSiren(m, 'EXIT', onBorderCross);
            }
            this.lastBorderStatus.set(m.id, isInside);
        });
        const ids = new Set(missiles.map(m => m.id));
        for (const [id] of this.lastBorderStatus) {
            if (!ids.has(id)) this.lastBorderStatus.delete(id);
        }
    }

    triggerBorderSiren(missile, type, callback) {
        if (this.sirenCooldown <= 0) {
            this.sirenCooldown = 3;
            callback?.(missile, type);
        }
    }

    getCriticalTargetsAtRisk(missile) {
        return QATAR_CRITICAL_INFRASTRUCTURE
            .map(loc => {
                const dx = missile.x - loc.x, dy = missile.y - loc.y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                return { ...loc, distance, riskLevel: Math.max(0, 1 - distance / 0.05) };
            })
            .filter(loc => loc.distance < 0.05)
            .sort((a, b) => b.riskLevel - a.riskLevel);
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.maxRadius, 0, Math.PI * 2);
        ctx.clip();

        // Background
        ctx.fillStyle = '#000d00';
        ctx.fill();

        this._drawAtmosphere(ctx);
        this._drawStars(ctx);
        this._drawGrid(ctx);
        this._drawRangeRings(ctx);
        this._drawNeighborStates(ctx);
        this._drawQatarSVGMap(ctx);
        this._drawQatarOutline(ctx);
        this._drawScanSweep(ctx);
        this._drawDefenseBatteries(ctx);

        ctx.restore();

        // Outer ring (drawn outside clip so it's sharp)
        const sirenPulse = this.borderSirenActive
            ? `rgba(255,50,0,${0.6 + 0.4 * Math.sin(this.time * 12)})`
            : 'rgba(0,200,0,0.7)';
        ctx.strokeStyle = sirenPulse;
        ctx.lineWidth = this.borderSirenActive ? 3 : 2;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.maxRadius, 0, Math.PI * 2);
        ctx.stroke();

        this._drawCompass(ctx);

        // Center dot
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Zoom level indicator
        if (this.zoomLevel !== 1.0) {
            ctx.fillStyle = 'rgba(0,200,0,0.7)';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`ZOOM ${this.zoomLevel.toFixed(1)}\u00d7`, this.centerX - this.maxRadius + 8, this.centerY - this.maxRadius + 18);
        }
    }

    _drawAtmosphere(ctx) {
        const g = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, this.maxRadius
        );
        g.addColorStop(0,   'rgba(0,40,0,0.4)');
        g.addColorStop(0.5, 'rgba(0,20,0,0.2)');
        g.addColorStop(1,   'rgba(0,60,10,0.0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.maxRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawStars(ctx) {
        this._stars.forEach(s => {
            const a = s.a;
            const r = s.r * this.maxRadius;
            const blink = s.brightness + 0.15 * Math.sin(this.time * 1.3 + s.a * 7);
            ctx.fillStyle = `rgba(0,180,50,${blink * 0.4})`;
            ctx.beginPath();
            ctx.arc(
                this.centerX + Math.cos(a) * r,
                this.centerY + Math.sin(a) * r,
                s.size, 0, Math.PI * 2
            );
            ctx.fill();
        });
    }

    _drawGrid(ctx) {
        ctx.strokeStyle = 'rgba(0,160,0,0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(this.centerX, this.centerY);
            ctx.lineTo(
                this.centerX + Math.cos(a) * this.maxRadius,
                this.centerY + Math.sin(a) * this.maxRadius
            );
            ctx.stroke();
        }
    }

    _drawRangeRings(ctx) {
        const rings = [75, 150, 225, 300];
        const origin = this.worldToScreen(0, 0);

        rings.forEach((km, idx) => {
            const worldR  = km / 300;
            const screenR = worldR * this.maxRadius * this.zoomLevel;

            if (screenR > this.maxRadius * 1.5) return;

            ctx.strokeStyle = `rgba(0,${80 + idx * 28},0,0.38)`;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.arc(origin.x, origin.y, screenR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            const labelY = origin.y - screenR + 13;
            if (labelY > this.centerY - this.maxRadius + 4 &&
                labelY < this.centerY + this.maxRadius - 4) {
                ctx.fillStyle = `rgba(0,${140 + idx * 20},0,0.55)`;
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${km}km`, origin.x, labelY);
            }
        });
    }

    _drawQatarSVGMap(ctx) {
        // 1. Faint background context (Gulf region)
        if (this._svgReady && this._svgImg) {
            const tl = this.worldToScreen(SVG_WORLD.left,  SVG_WORLD.top);
            const br = this.worldToScreen(SVG_WORLD.right, SVG_WORLD.bottom);
            const dw = br.x - tl.x, dh = br.y - tl.y;
            if (dw > 0 && dh > 0) {
                ctx.save();
                ctx.globalAlpha = 0.10;
                ctx.drawImage(this._svgImg, tl.x, tl.y, dw, dh);
                ctx.restore();
            }
        }

        // 2. Qatar outline image — the visible map
        if (this._outlineReady && this._outlineImg) {
            const tl = this.worldToScreen(OUTLINE_WORLD.left,  OUTLINE_WORLD.top);
            const br = this.worldToScreen(OUTLINE_WORLD.right, OUTLINE_WORLD.bottom);
            const dw = br.x - tl.x, dh = br.y - tl.y;
            if (dw > 0 && dh > 0) {
                ctx.save();
                // Use 'screen' blend so the image glows green against the dark radar
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = 0.55;
                ctx.drawImage(this._outlineImg, tl.x, tl.y, dw, dh);
                ctx.restore();
            }
        }
    }

    _drawQatarOutline(ctx) {
        // ── Qatar land fill (subtle tint — the SVG image provides the visible border) ──
        ctx.beginPath();
        const first = this.worldToScreen(QATAR_OUTLINE[0][0], QATAR_OUTLINE[0][1]);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < QATAR_OUTLINE.length; i++) {
            const p = this.worldToScreen(QATAR_OUTLINE[i][0], QATAR_OUTLINE[i][1]);
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(141,27,61,0.10)';
        ctx.fill();

        // ── ADIZ boundary (100 km airspace barrier) — red dashed, Qatar-shaped ──
        ctx.save();
        ctx.beginPath();
        const adizFirst = this.worldToScreen(QATAR_ADIZ[0][0], QATAR_ADIZ[0][1]);
        ctx.moveTo(adizFirst.x, adizFirst.y);
        for (let i = 1; i < QATAR_ADIZ.length; i++) {
            const p = this.worldToScreen(QATAR_ADIZ[i][0], QATAR_ADIZ[i][1]);
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        const sirenPulseAlpha = this.borderSirenActive
            ? 0.65 + 0.35 * Math.sin(this.time * 14)
            : 0.45;
        ctx.strokeStyle = `rgba(255,30,30,${sirenPulseAlpha})`;
        ctx.lineWidth = this.borderSirenActive ? 3 : 1.5;
        ctx.setLineDash([10, 7]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label the ADIZ line
        if (!this.borderSirenActive) {
            const labelPt = this.worldToScreen(QATAR_ADIZ[15][0], QATAR_ADIZ[15][1]);
            ctx.fillStyle = 'rgba(255,60,60,0.55)';
            ctx.font = '7px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('100km ADIZ', labelPt.x - 4, labelPt.y - 4);
        } else {
            const labelPt = this.worldToScreen(QATAR_ADIZ[15][0], QATAR_ADIZ[15][1]);
            ctx.fillStyle = `rgba(255,60,60,${sirenPulseAlpha})`;
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('⚠ ADIZ BREACH', labelPt.x - 4, labelPt.y - 4);
        }
        ctx.restore();

        QATAR_CRITICAL_INFRASTRUCTURE.forEach(loc => {
            const sp = this.worldToScreen(loc.x, loc.y);
            const pulse = 0.5 + 0.5 * Math.sin(this.time * 2.5 + loc.x * 8 + loc.y * 5);

            if (loc.type === 'capital') {
                const gr = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 22);
                gr.addColorStop(0, loc.color + 'cc');
                gr.addColorStop(1, 'transparent');
                ctx.fillStyle = gr;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, 22, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = loc.color;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px monospace';
                ctx.textAlign = 'left';
                ctx.fillText('\u2295 ' + loc.name, sp.x + 9, sp.y + 4);

            } else if (loc.type === 'military') {
                ctx.strokeStyle = loc.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, 9 + pulse * 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = loc.color + 'aa';
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = loc.color;
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'left';
                ctx.fillText('\u2726 ' + loc.name, sp.x + 8, sp.y + 3);

            } else if (loc.type === 'energy') {
                const pr = 6 + pulse * 3;
                ctx.strokeStyle = loc.color + Math.floor(pulse * 200).toString(16).padStart(2,'0');
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, pr, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = loc.color;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = loc.color;
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'left';
                ctx.fillText('\u26a1 ' + loc.name, sp.x + 5, sp.y + 3);

            } else if (loc.type === 'naval') {
                // Anchor symbol for naval base
                const p2 = 0.3 + 0.7 * pulse;
                ctx.strokeStyle = loc.color;
                ctx.fillStyle   = loc.color + 'aa';
                ctx.lineWidth   = 1.5;
                // Circle
                ctx.beginPath(); ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2); ctx.stroke();
                ctx.fill();
                // Mast
                ctx.beginPath(); ctx.moveTo(sp.x, sp.y - 7); ctx.lineTo(sp.x, sp.y + 7); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sp.x - 4, sp.y - 5); ctx.lineTo(sp.x + 4, sp.y - 5); ctx.stroke();
                // Wave lines
                ctx.strokeStyle = loc.color + Math.floor(p2 * 0x88).toString(16).padStart(2,'0');
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(sp.x, sp.y, 10, 0, Math.PI * 2); ctx.stroke();
                // Label
                ctx.fillStyle = loc.color;
                ctx.font = 'bold 7px monospace';
                ctx.textAlign = 'left';
                ctx.fillText('⚓ ' + loc.name, sp.x + 12, sp.y + 3);

            } else {
                ctx.strokeStyle = loc.color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = loc.color + '80';
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = loc.color;
                ctx.font = '8px monospace';
                ctx.textAlign = 'left';
                ctx.fillText(loc.name, sp.x + 6, sp.y + 3);
            }
        });
    }

    _drawDefenseBatteries(ctx) {
        DEFENSE_BATTERIES.forEach(b => {
            const disabled = this._disabledBatteryIds.has(b.id);
            const sp  = this.worldToScreen(b.x, b.y);
            const col = disabled ? '#555555' : b.color;
            const pulse = disabled ? 0 : (0.5 + 0.5 * Math.sin(this.time * 2.5 + b.x * 10));

            ctx.save();
            ctx.strokeStyle = col + Math.floor(pulse * 0x55).toString(16).padStart(2,'0');
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 12 + pulse * 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.fillStyle   = col + 'cc';
            ctx.strokeStyle = col;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sp.x,     sp.y - 8);
            ctx.lineTo(sp.x + 7, sp.y + 5);
            ctx.lineTo(sp.x - 7, sp.y + 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = col;
            ctx.font = 'bold 7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(b.id, sp.x, sp.y + 17);
            ctx.restore();

            if (disabled) {
                ctx.save();
                ctx.strokeStyle = '#ff3333';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sp.x - 8, sp.y - 8); ctx.lineTo(sp.x + 8, sp.y + 8);
                ctx.moveTo(sp.x + 8, sp.y - 8); ctx.lineTo(sp.x - 8, sp.y + 8);
                ctx.stroke();
                ctx.fillStyle = '#ff3333';
                ctx.font = 'bold 7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('OFFLINE', sp.x, sp.y + 22);
                ctx.restore();
            }
        });
    }

    _drawNeighborStates(ctx) {
        // ── Saudi Arabia ──
        // Eastern Province coastline + land border with Qatar
        // Coords: x=(lon-51.20)/2.981, y=-(lat-25.32)/2.703
        // Coast points (used for line and start of fill polygon)
        const saudiCoastPts = [
            [-0.141,  0.315],  // Saudi-Qatar land border SW corner
            [-0.165,  0.270],
            [-0.190,  0.200],
            [-0.210,  0.130],
            [-0.225,  0.060],  // Qatif region ~25.35°N
            [-0.245,  0.000],
            [-0.275, -0.065],  // Tarut Bay
            [-0.305, -0.150],  // approaching Al Khobar
            [-0.330, -0.220],  // ~26.0°N near Bahrain causeway
            [-0.335, -0.325],  // Al Khobar ~26.22°N
            [-0.365, -0.400],  // Dammam ~26.43°N
            [-0.352, -0.490],  // Ras Tanura ~26.65°N
            [-0.490, -0.610],  // near Jubail ~27°N
        ];
        // Full fill polygon: coast + sweep off-radar to enclose entire landmass
        const saudiCoast = [
            ...saudiCoastPts,
            [-0.900, -0.900],  // off-radar NW corner
            [-0.900,  1.200],  // off-radar W far south
            [ 1.200,  1.200],  // off-radar S far south (covers east of Qatar too)
            [ 1.200,  0.315],  // off-radar E at Qatar latitude
            [ 0.050,  0.315],  // SE corner of Qatar land border (Salwa)
        ];

        // Fill Saudi landmass
        ctx.save();
        ctx.beginPath();
        const sa0 = this.worldToScreen(saudiCoast[0][0], saudiCoast[0][1]);
        ctx.moveTo(sa0.x, sa0.y);
        for (let i = 1; i < saudiCoast.length; i++) {
            const p = this.worldToScreen(saudiCoast[i][0], saudiCoast[i][1]);
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(180,140,60,0.08)';
        ctx.fill();
        ctx.restore();

        // Saudi Gulf coastline (visible segment only)
        ctx.save();
        ctx.beginPath();
        const sc0 = this.worldToScreen(saudiCoastPts[0][0], saudiCoastPts[0][1]);
        ctx.moveTo(sc0.x, sc0.y);
        for (let i = 1; i < saudiCoastPts.length; i++) {
            const p = this.worldToScreen(saudiCoastPts[i][0], saudiCoastPts[i][1]);
            ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(180,140,60,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // Saudi Arabia land border with Qatar (south border)
        ctx.save();
        ctx.beginPath();
        const sb1 = this.worldToScreen(-0.141, 0.315);
        const sb2 = this.worldToScreen( 0.050, 0.315);
        ctx.moveTo(sb1.x, sb1.y);
        ctx.lineTo(sb2.x, sb2.y);
        ctx.strokeStyle = 'rgba(200,160,60,0.65)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Saudi Arabia label
        const saLbl = this.worldToScreen(-0.30, 0.50);
        ctx.save();
        ctx.fillStyle = 'rgba(200,160,60,0.55)';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SAUDI ARABIA', saLbl.x, saLbl.y);
        ctx.restore();

        // Saudi city labels
        const saudiCities = [
            { name: 'Dammam',    x: -0.365, y: -0.400 },
            { name: 'Al Khobar', x: -0.335, y: -0.325 },
            { name: 'Ras Tanura',x: -0.352, y: -0.490 },
        ];
        ctx.save();
        ctx.fillStyle = 'rgba(180,140,60,0.50)';
        ctx.font = '7px monospace';
        ctx.textAlign = 'left';
        saudiCities.forEach(city => {
            const sp = this.worldToScreen(city.x, city.y);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillText(city.name, sp.x + 4, sp.y + 3);
        });
        ctx.restore();

        // ── Bahrain ──
        // Main island: ~26.0°N–26.35°N, 50.4°E–50.67°E
        const bahrain = [
            [-0.261, -0.380],  // NW (26.35°N, 50.42°E)
            [-0.195, -0.370],  // NE (26.32°N, 50.61°E)
            [-0.177, -0.290],  // SE (26.04°N, 50.66°E)
            [-0.220, -0.267],  // S  (25.97°N, 50.54°E)
            [-0.268, -0.300],  // SW (26.07°N, 50.40°E)
        ];

        ctx.save();
        ctx.beginPath();
        const bh0 = this.worldToScreen(bahrain[0][0], bahrain[0][1]);
        ctx.moveTo(bh0.x, bh0.y);
        for (let i = 1; i < bahrain.length; i++) {
            const p = this.worldToScreen(bahrain[i][0], bahrain[i][1]);
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(80,160,200,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,180,220,0.60)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        // Bahrain label
        const bhLbl = this.worldToScreen(-0.218, -0.330);
        ctx.save();
        ctx.fillStyle = 'rgba(100,180,220,0.70)';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BAHRAIN', bhLbl.x, bhLbl.y - 2);
        ctx.fillStyle = 'rgba(100,180,220,0.50)';
        ctx.font = '6px monospace';
        ctx.fillText('Manama', bhLbl.x, bhLbl.y + 7);
        ctx.restore();

        // Bahrain causeway (connects Saudi to Bahrain)
        const causeStart = this.worldToScreen(-0.268, -0.300);
        const causeEnd   = this.worldToScreen(-0.320, -0.235);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(causeStart.x, causeStart.y);
        ctx.lineTo(causeEnd.x, causeEnd.y);
        ctx.strokeStyle = 'rgba(150,160,100,0.40)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // ── UAE ──
        // Northwestern Abu Dhabi emirate coastline, SE of Qatar
        // Khor al Udaid border zone ~24.5°N, 51.55°E → x≈0.117, y≈0.307
        const uaeCoastPts = [
            [ 0.117,  0.307],  // Khor al Udaid (Qatar-UAE tri-border area)
            [ 0.185,  0.348],  // UAE coast going SE
            [ 0.260,  0.390],  // Abu Dhabi emirate NW coast
            [ 0.370,  0.440],  // continuing SE
            [ 0.490,  0.490],  // approaching radar edge
            [ 0.620,  0.520],  // near radar boundary
        ];
        const uaePoly = [
            ...uaeCoastPts,
            [ 1.200,  0.600],  // off radar SE
            [ 1.200,  1.200],  // off radar far S
            [ 0.050,  1.200],  // off radar S, align with Saudi border
            [ 0.050,  0.315],  // SE Qatar land border corner
        ];

        ctx.save();
        ctx.beginPath();
        const ae0 = this.worldToScreen(uaePoly[0][0], uaePoly[0][1]);
        ctx.moveTo(ae0.x, ae0.y);
        for (let i = 1; i < uaePoly.length; i++) {
            const p = this.worldToScreen(uaePoly[i][0], uaePoly[i][1]);
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(200,160,80,0.07)';
        ctx.fill();
        ctx.restore();

        // UAE coastline line
        ctx.save();
        ctx.beginPath();
        const ae1 = this.worldToScreen(uaeCoastPts[0][0], uaeCoastPts[0][1]);
        ctx.moveTo(ae1.x, ae1.y);
        for (let i = 1; i < uaeCoastPts.length; i++) {
            const p = this.worldToScreen(uaeCoastPts[i][0], uaeCoastPts[i][1]);
            ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(200,160,80,0.50)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // UAE label
        const aeLbl = this.worldToScreen(0.30, 0.44);
        ctx.save();
        ctx.fillStyle = 'rgba(200,160,80,0.58)';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('UAE', aeLbl.x, aeLbl.y);
        ctx.fillStyle = 'rgba(200,160,80,0.40)';
        ctx.font = '6px monospace';
        ctx.fillText('Abu Dhabi Emirate', aeLbl.x, aeLbl.y + 9);
        ctx.restore();
    }

    _drawScanSweep(ctx) {
        const fanAngle = Math.PI / 3;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.arc(this.centerX, this.centerY, this.maxRadius,
                this.scanAngle - fanAngle, this.scanAngle);
        ctx.closePath();
        const rg = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, this.maxRadius);
        rg.addColorStop(0,   'rgba(0,255,70,0.16)');
        rg.addColorStop(0.7, 'rgba(0,255,50,0.06)');
        rg.addColorStop(1,   'rgba(0,255,0,0.00)');
        ctx.fillStyle = rg;
        ctx.fill();
        ctx.restore();

        const bx = this.centerX + Math.cos(this.scanAngle) * this.maxRadius;
        const by = this.centerY + Math.sin(this.scanAngle) * this.maxRadius;
        const lg = ctx.createLinearGradient(this.centerX, this.centerY, bx, by);
        lg.addColorStop(0,   'rgba(0,255,0,0.0)');
        lg.addColorStop(0.5, 'rgba(0,255,0,0.4)');
        lg.addColorStop(1,   'rgba(100,255,100,0.95)');
        ctx.strokeStyle = lg;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(bx, by);
        ctx.stroke();
    }

    _drawCompass(ctx) {
        // Draw markers inside the radar ring so panels never obscure them
        const off = this.maxRadius * 0.88;
        ctx.fillStyle    = 'rgba(0,200,0,0.55)';
        ctx.font         = 'bold 11px monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N', this.centerX,       this.centerY - off);
        ctx.fillText('S', this.centerX,       this.centerY + off);
        ctx.fillText('E', this.centerX + off, this.centerY);
        ctx.fillText('W', this.centerX - off, this.centerY);
        ctx.textBaseline = 'alphabetic';
    }

    drawQatariFlag(ctx, x, y, w, h) {
        const nTeeth = 9;
        const divX   = x + w * (5 / 14);
        const toothW = h * 0.42;
        const toothH = h / nTeeth;

        ctx.fillStyle = '#8D1B3D';
        ctx.fillRect(x, y, w, h);

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(divX, y);
        for (let i = 0; i < nTeeth; i++) {
            ctx.lineTo(divX + toothW, y + (i + 0.5) * toothH);
            ctx.lineTo(divX,          y + (i + 1)   * toothH);
        }
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,180,0,0.5)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(x, y, w, h);
    }

    // ── Coordinate conversions ──
    worldToScreen(x, y) {
        const zoomedX = (x - this.zoomCenterX) * this.zoomLevel;
        const zoomedY = (y - this.zoomCenterY) * this.zoomLevel;
        return {
            x: this.centerX + zoomedX * this.maxRadius,
            y: this.centerY + zoomedY * this.maxRadius,
        };
    }

    screenToWorld(sx, sy) {
        return {
            x: (sx - this.centerX) / (this.maxRadius * this.zoomLevel) + this.zoomCenterX,
            y: (sy - this.centerY) / (this.maxRadius * this.zoomLevel) + this.zoomCenterY,
        };
    }

    isInBounds(x, y) { return Math.sqrt(x * x + y * y) < 1.0; }

    resize(width, height, insets = {}) {
        const L = insets.left  ?? 230;
        const R = insets.right ?? 230;
        const T = insets.top   ?? 58;
        const B = insets.btm   ?? 58;
        const pad = 18; // breathing room inside the free area

        this.width  = width;
        this.height = height;

        const freeW = width  - L - R;
        const freeH = height - T - B;

        this.centerX   = L + freeW / 2;
        this.centerY   = T + freeH / 2;
        this.maxRadius = Math.min(freeW, freeH) / 2 - pad;
    }

    getCenterX()   { return this.centerX; }
    getCenterY()   { return this.centerY; }
    getMaxRadius() { return this.maxRadius; }
    getBatteries() { return DEFENSE_BATTERIES; }
    setDisabledBatteries(ids) { this._disabledBatteryIds = new Set(ids); }

    zoomIn()   { this.setZoom(this.zoomLevel * 1.25); }
    zoomOut()  { this.setZoom(this.zoomLevel / 1.25); }
    setZoom(l) { this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, l)); }
    resetZoom() { this.zoomLevel = 1.0; this.zoomCenterX = 0; this.zoomCenterY = 0; }
    getZoomLevel() { return this.zoomLevel; }
}
