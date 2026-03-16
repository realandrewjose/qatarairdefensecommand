export const POWERUP_TYPES = {
    funds:     { icon: '$', label: 'EMERGENCY FUNDS',  color: '#f59e0b', desc: '+$1200',        amount: 1200 },
    repair:    { icon: '+', label: 'REPAIR CREW',      color: '#22c55e', desc: '+25 HP',         amount: 25   },
    shield:    { icon: '◈', label: 'DEFENSE SHIELD',  color: '#38bdf8', desc: '30s SHIELD',     duration: 30 },
    intel:     { icon: '◎', label: 'INTEL BURST',     color: '#a78bfa', desc: 'GHOST CLEAR'                  },
    overclock: { icon: '⚡', label: 'OVERCLOCK',       color: '#00ffcc', desc: '2× SPEED 20s',  duration: 20 },
    ammo:      { icon: '◉', label: 'RESUPPLY',        color: '#fbbf24', desc: '+$600 RESET CD', amount: 600  },
};

// Weighted type pool: funds most common, overclock/ammo rarer
const TYPE_POOL = ['funds', 'funds', 'funds', 'repair', 'repair', 'shield', 'intel', 'overclock', 'ammo', 'ammo'];

let _powerupIdCounter = 0;

export class Powerup {
    constructor(type) {
        this.id   = ++_powerupIdCounter;
        this.type = type || TYPE_POOL[Math.floor(Math.random() * TYPE_POOL.length)];
        this.config = POWERUP_TYPES[this.type];

        this.active    = true;
        this.collected = false;
        this.isPowerup = true;
        this.age       = 0;
        this.lifetime  = 16 + Math.random() * 6;  // 16–22 seconds

        // Spawn at random point on radar edge, drift toward center
        const spawnAngle = Math.random() * Math.PI * 2;
        const edgeR      = 0.88 + Math.random() * 0.08;
        this.x = Math.cos(spawnAngle) * edgeR;
        this.y = Math.sin(spawnAngle) * edgeR;

        const speed      = 0.022 + Math.random() * 0.014;
        const driftAngle = Math.atan2(-this.y, -this.x) + (Math.random() - 0.5) * 0.55;
        this.vx = Math.cos(driftAngle) * speed;
        this.vy = Math.sin(driftAngle) * speed;

        this._spinAngle  = 0;
        this._pulsePhase = Math.random() * Math.PI * 2;
        this._blinkOn    = true;
        this._blinkTimer = 0;
    }

    update(dt) {
        if (!this.active) return;

        this.age += dt;
        this.x   += this.vx * dt;
        this.y   += this.vy * dt;
        this._spinAngle += dt * 2.0;

        // Blink fast when about to expire
        if (this.age > this.lifetime - 4) {
            this._blinkTimer += dt;
            if (this._blinkTimer >= 0.22) { this._blinkTimer = 0; this._blinkOn = !this._blinkOn; }
        } else {
            this._blinkOn = true;
        }

        if (this.age >= this.lifetime || Math.sqrt(this.x * this.x + this.y * this.y) > 1.08) {
            this.active = false;
        }
    }

    draw(ctx, radar) {
        if (!this.active || !this._blinkOn) return;

        const sp    = radar.worldToScreen(this.x, this.y);
        const col   = this.config.color;
        const pulse = 0.6 + 0.4 * Math.sin(this.age * 3 + this._pulsePhase);

        ctx.save();

        // Outer glow
        const grd = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 26);
        grd.addColorStop(0, col + Math.floor(pulse * 0x55).toString(16).padStart(2, '0'));
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 26, 0, Math.PI * 2);
        ctx.fill();

        // Spinning dashed ring
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(this._spinAngle);
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth   = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Inner circle fill
        ctx.fillStyle = 'rgba(5,8,20,0.82)';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        // Icon
        ctx.fillStyle    = col;
        ctx.font         = 'bold 12px monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.icon, sp.x, sp.y);
        ctx.textBaseline = 'alphabetic';

        // Label & desc above
        ctx.fillStyle = col;
        ctx.font      = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.config.label, sp.x, sp.y - 20);
        ctx.fillStyle = col + 'bb';
        ctx.font      = '6px monospace';
        ctx.fillText(this.config.desc, sp.x, sp.y - 12);

        // Time-remaining bar (shows last 8 seconds)
        const lifeLeft = this.lifetime - this.age;
        if (lifeLeft < 8) {
            const barW = 26;
            const ratio = lifeLeft / 8;
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(sp.x - barW / 2, sp.y + 14, barW, 3);
            ctx.fillStyle = ratio > 0.4 ? col : '#ef4444';
            ctx.fillRect(sp.x - barW / 2, sp.y + 14, barW * ratio, 3);
        }

        ctx.restore();
    }

    isActive() { return this.active; }
}
