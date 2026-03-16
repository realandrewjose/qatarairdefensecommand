const GHOST_TYPES = ['ballistic', 'cruise', 'drone'];

const GHOST_TYPE_COLORS = {
    ballistic: '#ff2200',
    cruise:    '#ff8800',
    drone:     '#ffdd00',
};

const GHOST_TYPE_PREFIXES = {
    ballistic: 'BAL',
    cruise:    'CRZ',
    drone:     'DRN',
};

let _ghostIdCounter = 0;

export class RadarGhost {
    constructor() {
        this.id = ++_ghostIdCounter;

        // Random position in radar bounds (r: 0.5–0.95)
        const r     = 0.5 + Math.random() * 0.45;
        const angle = Math.random() * Math.PI * 2;
        this.x = Math.cos(angle) * r;
        this.y = Math.sin(angle) * r;

        // Slow random drift
        const driftAngle = Math.random() * Math.PI * 2;
        const driftSpeed = 0.012 + Math.random() * 0.018;
        this.vx = Math.cos(driftAngle) * driftSpeed;
        this.vy = Math.sin(driftAngle) * driftSpeed;

        this.type = GHOST_TYPES[Math.floor(Math.random() * GHOST_TYPES.length)];
        this.color = GHOST_TYPE_COLORS[this.type] || '#ff4400';

        // Life: 3.5–7 seconds
        this.life      = 3.5 + Math.random() * 3.5;
        this.maxLife   = this.life;

        this.active    = true;
        this.targeted  = false;
        this.isGhost   = true;
        this.isCivilian = false;

        // Required by Interceptor homing
        this.progress  = 0.5; // mid-flight appearance
        this.reward    = 0;

        this.config = { name: 'Ghost Contact', shortName: '?GHOST' };

        this._blinkTimer = 0;
        this._blinkOn    = true;

        // Trail stub
        this.trail = [];
        this.maxTrail = 5;
    }

    update(deltaTime) {
        if (!this.active) return;

        // When targeted, reduce life quickly
        if (this.targeted && this.life > 1.5) {
            this.life = 1.5;
        }

        this.life -= deltaTime;
        if (this.life <= 0) { this.active = false; return; }

        // Drift
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Blink — faster when life < 2s
        const blinkRate = this.life < 2 ? 0.2 : 0.5;
        this._blinkTimer += deltaTime;
        if (this._blinkTimer >= blinkRate) {
            this._blinkTimer = 0;
            this._blinkOn = !this._blinkOn;
        }
    }

    draw(ctx, radar) {
        if (!this.active) return;

        const sp = radar.worldToScreen(this.x, this.y);

        // Fade out in last 1.5s
        const fadeAlpha = this.life < 1.5 ? Math.max(0, this.life / 1.5) : 1.0;
        const alpha = 0.75 * fadeAlpha;

        if (!this._blinkOn) return;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Outer glow (dimmer than real missiles)
        const grd = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 14);
        grd.addColorStop(0, this.color + 'aa');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 14, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Targeting ring if targeted
        if (this.targeted) {
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 13, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Label: "??" + type prefix
        ctx.fillStyle = this.color;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`??${GHOST_TYPE_PREFIXES[this.type] || '???'}`, sp.x + 8, sp.y - 3);

        ctx.restore();
    }

    isActive() { return this.active; }
}
