// Hamad International Airport — landing target
const HAMAD_X = 0.137, HAMAD_Y = 0.022;

// Transit routes: fly-through paths that pass near Qatar
const TRANSIT_ROUTES = [
    { sx: -1.1, sy: -0.05, ex:  1.1, ey: -0.12 },
    { sx: -1.1, sy: -0.20, ex:  1.1, ey:  0.30 },
    { sx: -0.9, sy: -1.1,  ex:  0.8, ey:  1.1  },
    { sx: -1.1, sy:  0.15, ex:  1.1, ey:  0.10 },
    { sx:  1.1, sy: -0.05, ex: -1.1, ey:  0.00 },
];

// Landing approach routes — planes inbound to Hamad International
const LANDING_ROUTES = [
    { sx:  0.05, sy: -1.1  },   // from north (Gulf/Iran)
    { sx: -1.1,  sy:  0.05 },   // from west (Europe/Saudi)
    { sx:  1.1,  sy: -0.10 },   // from east (India/Pakistan)
    { sx:  0.60, sy:  1.1  },   // from south-east (UAE/Asia)
    { sx: -0.50, sy: -1.1  },   // from north-west (Kuwait/Iraq)
];

// Divert exit points — away from Qatar airspace, toward safe corridors
const DIVERT_EXITS = [
    {  ex:  0.80, ey:  1.1  },  // south toward UAE
    {  ex:  1.1,  ey:  0.60 },  // east over Gulf
    {  ex: -0.80, ey:  1.1  },  // south-west toward Saudi
];

const CALLSIGNS = ['QR448', 'EK007', 'SQ501', 'BA103', 'LH401', 'AF447', 'TK791', 'MS804', 'QR021', 'EK515',
                   'QR716', 'EK362', 'FZ734', 'SV802', 'WY102', 'QR012', 'EK201'];

let _civIdCounter = 0;

export class CivilianAircraft {
    constructor(landing = false) {
        this.id = ++_civIdCounter;
        this.isLanding = landing;

        if (landing) {
            const r = LANDING_ROUTES[Math.floor(Math.random() * LANDING_ROUTES.length)];
            this.startX = r.sx; this.startY = r.sy;
            this.endX = HAMAD_X; this.endY = HAMAD_Y;
        } else {
            const route = TRANSIT_ROUTES[Math.floor(Math.random() * TRANSIT_ROUTES.length)];
            this.startX = route.sx; this.startY = route.sy;
            this.endX   = route.ex; this.endY   = route.ey;
        }

        this.x = this.startX;
        this.y = this.startY;

        this.speed = 0.065 + Math.random() * 0.030;
        this.callsign = CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)];

        this._setHeading(this.endX, this.endY);

        this.active    = true;
        this.isCivilian = true;
        this.isGhost   = false;
        this.targeted  = false;
        this.reward    = 0;
        this.type      = 'civilian';
        this.config    = { name: 'Civilian Airliner', shortName: 'CIV' };

        this._diverted    = false;
        this._landing     = false;   // in final landing roll
        this._landScale   = 1.0;     // shrinks to 0 on touchdown

        this.trail = [];
        this._blinkTimer = 0;
        this._blinkOn    = true;
        this.onIntercepted = null;
    }

    // ── Public: redirect plane away from Qatar when threats incoming ──────────
    divert() {
        if (this._diverted || this._landing) return;
        this._diverted = true;

        if (this.isLanding) {
            // Was heading to land — break off approach, fly to a safe exit
            const ex = DIVERT_EXITS[Math.floor(Math.random() * DIVERT_EXITS.length)];
            this.endX = ex.ex; this.endY = ex.ey;
            this._setHeading(ex.ex, ex.ey);
        } else {
            // Transit — nudge heading away from Qatar center
            const awayAngle = Math.atan2(this.y, this.x); // pointing away from (0,0)
            const ex = this.x + Math.cos(awayAngle) * 2.0;
            const ey = this.y + Math.sin(awayAngle) * 2.0;
            this.endX = ex; this.endY = ey;
            this._setHeading(ex, ey);
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────────
    _setHeading(tx, ty) {
        const dx = tx - this.x, dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
        this.heading = Math.atan2(dy, dx);
    }

    update(deltaTime) {
        if (!this.active) return;

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10) this.trail.shift();

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        this._blinkTimer += deltaTime;
        if (this._blinkTimer >= 0.8) { this._blinkTimer = 0; this._blinkOn = !this._blinkOn; }

        // Check arrival at destination
        const dx = this.endX - this.x, dy = this.endY - this.y;
        const distToEnd = Math.sqrt(dx * dx + dy * dy);

        if (this.isLanding && !this._diverted) {
            // Close to airport → begin touchdown roll
            if (distToEnd < 0.05 && !this._landing) {
                this._landing = true;
                this.vx *= 0.2; this.vy *= 0.2; // slow down dramatically
            }
            if (this._landing) {
                this._landScale -= deltaTime * 0.4; // shrink as plane parks
                if (this._landScale <= 0) { this.active = false; return; }
            }
        }

        // Deactivate once it leaves the radar area or reaches end
        if (distToEnd < 0.03 && !this.isLanding) { this.active = false; return; }
        const r = Math.sqrt(this.x * this.x + this.y * this.y);
        if (r > 1.35) this.active = false;
    }

    draw(ctx, radar) {
        if (!this.active) return;
        const sp = radar.worldToScreen(this.x, this.y);
        const scale = this._landing ? Math.max(0.3, this._landScale) : 1.0;

        // Dashed trail
        if (this.trail.length > 1) {
            ctx.save();
            ctx.strokeStyle = 'rgba(119,153,204,0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 5]);
            ctx.beginPath();
            const fp = radar.worldToScreen(this.trail[0].x, this.trail[0].y);
            ctx.moveTo(fp.x, fp.y);
            for (let i = 1; i < this.trail.length; i++) {
                const tp = radar.worldToScreen(this.trail[i].x, this.trail[i].y);
                ctx.lineTo(tp.x, tp.y);
            }
            ctx.lineTo(sp.x, sp.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        if (!this._blinkOn && !this._landing) return;

        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(this.heading);
        ctx.scale(scale, scale);

        const col = this._diverted ? '#ffaa44' : '#7799cc';
        ctx.strokeStyle = col;
        ctx.fillStyle = col + 'cc';
        ctx.lineWidth = 1.5;

        // Fuselage
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-4, -3); ctx.lineTo(-3, 0); ctx.lineTo(-4, 3);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Wings
        ctx.beginPath();
        ctx.moveTo(0, -7); ctx.lineTo(-3, 0); ctx.lineTo(0, 7);
        ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();

        // Tail
        ctx.beginPath();
        ctx.moveTo(-3, -3.5); ctx.lineTo(-6, 0); ctx.lineTo(-3, 3.5);
        ctx.stroke();

        ctx.restore();

        // Label
        if (scale > 0.5) {
            ctx.save();
            ctx.fillStyle = this._diverted ? '#ffaa44' : '#7799cc';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(this.callsign, sp.x + 10, sp.y - 3);
            ctx.font = '7px monospace';
            ctx.fillStyle = 'rgba(119,153,204,0.7)';
            const tag = this._diverted ? 'DIVERTED' : (this.isLanding && !this._diverted ? 'INBOUND' : 'CIV');
            ctx.fillText(tag, sp.x + 10, sp.y + 7);
            ctx.restore();
        }
    }

    isActive() { return this.active; }
}
