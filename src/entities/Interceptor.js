export const INTERCEPTOR_TYPES = {
    patriot: {
        name: 'Patriot PAC-3',
        shortName: 'PAC-3',
        cost: 150,
        speed: 0.55,
        killRadius: 0.045,
        color: '#00ff88',
        isBeam: false,
        effectiveness: { ballistic: 0.88, cruise: 0.92, hypersonic: 0.52, drone: 0.72, antiship: 0.88, bomber: 0.72, maneuver: 0.65, loiter: 0.80, mirv: 0.70, enemy_fighter: 0.65, civilian: 0.98 },
        description: 'Medium-range. Best vs ballistic & cruise.',
        keyHint: '[1]',
    },
    arrow: {
        name: 'Arrow-3 (Hetz)',
        shortName: 'ARROW-3',
        cost: 380,
        speed: 0.72,
        killRadius: 0.06,
        color: '#0088ff',
        isBeam: false,
        effectiveness: { ballistic: 0.98, cruise: 0.62, hypersonic: 0.92, drone: 0.28, antiship: 0.72, bomber: 0.85, maneuver: 0.80, loiter: 0.45, mirv: 0.90, enemy_fighter: 0.75, civilian: 0.98 },
        description: 'Long-range anti-ballistic. High cost.',
        keyHint: '[2]',
    },
    shorad: {
        name: 'Crotale NG',
        shortName: 'CROTALE',
        cost: 70,
        speed: 0.68,
        killRadius: 0.04,
        color: '#88ff00',
        isBeam: false,
        effectiveness: { ballistic: 0.18, cruise: 0.88, hypersonic: 0.10, drone: 0.96, antiship: 0.78, bomber: 0.55, maneuver: 0.40, loiter: 0.92, mirv: 0.30, enemy_fighter: 0.55, civilian: 0.98 },
        description: 'Fast & cheap. Ideal vs drones & cruise.',
        keyHint: '[3]',
    },
    laser: {
        name: 'Iron Beam (HEL)',
        shortName: 'LASER',
        cost: 40,
        speed: 999,
        killRadius: 0.03,
        color: '#ff4488',
        isBeam: true,
        effectiveness: { ballistic: 0.38, cruise: 0.72, hypersonic: 0.15, drone: 0.99, antiship: 0.68, bomber: 0.30, loiter: 0.99, maneuver: 0.22, mirv: 0.15, enemy_fighter: 0.85, civilian: 0.98 },
        description: 'Instant beam. Destroys drones. Recharges.',
        keyHint: '[4]',
    },
    cram: {
        name: 'C-RAM (Phalanx)',
        shortName: 'C-RAM',
        cost: 20,
        speed: 0.95,
        killRadius: 0.032,
        color: '#ff6600',
        isBeam: false,
        isCram: true,
        effectiveness: { ballistic: 0.10, cruise: 0.55, hypersonic: 0.02, drone: 0.92, antiship: 0.35, bomber: 0.18, loiter: 0.88, maneuver: 0.12, mirv: 0.05, enemy_fighter: 0.45, civilian: 0.95 },
        description: '$20/burst — 18 rds × 3 Phalanx batteries. Best vs drones & loiter.',
        keyHint: '[5]',
    },
};

export class Interceptor {
    constructor(startX, startY, targetMissile, type = 'patriot') {
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.targetMissile = targetMissile;
        this.type = type;

        const cfg = INTERCEPTOR_TYPES[type] || INTERCEPTOR_TYPES.patriot;
        this.config   = cfg;
        this.speed    = cfg.speed;
        this.killRadius = cfg.killRadius;
        this.color    = cfg.color;
        this.isBeam   = cfg.isBeam;

        this.active       = true;
        this.killedTarget = false;
        this.age          = 0;
        this.maxAge       = 18;

        // Heading in radians (for rocket shape)
        this.heading = 0;

        // Trail of past positions for exhaust rendering
        this.trail    = [];
        this.maxTrail = 18;

        // Beam-specific
        this.beamDuration = 0.45;
        this.beamAge      = 0;

        // Loitering hornet-specific
        if (cfg.isLoitering) {
            this.isLoitering    = true;
            this.loiterAge      = 0;
            this.loiterDuration = cfg.loiterDuration || 120;
            this.loiterAmmo     = cfg.loiterAmmo || 5;
            this._killedMissile = null;
            this.maxAge         = 9999; // don't expire via normal age
        }

        if (targetMissile) targetMissile.targeted = true;
    }

    update(deltaTime) {
        this.age += deltaTime;
        if (this.age > this.maxAge) { this.active = false; return; }

        // ── Loitering Hornet update ──
        if (this.isLoitering) {
            this.loiterAge += deltaTime;
            if (this.loiterAge >= this.loiterDuration || this.loiterAmmo <= 0) {
                this.active = false; return;
            }

            const tm = this.targetMissile;
            if (!tm || !tm.isActive()) {
                // Fly in slow patrol circle (EntityManager will re-assign target)
                const angle = this.loiterAge * 0.6;
                const px = 0.05 + Math.cos(angle) * 0.07;
                const py = 0.00 + Math.sin(angle) * 0.07;
                const dx = px - this.x, dy = py - this.y;
                const d = Math.sqrt(dx*dx + dy*dy);
                if (d > 0.01) {
                    this.heading = Math.atan2(dy, dx);
                    this.x += (dx/d) * this.speed * deltaTime;
                    this.y += (dy/d) * this.speed * deltaTime;
                }
                this.targetMissile = null;
            } else {
                const dx = tm.x - this.x, dy = tm.y - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                this.heading = Math.atan2(dy, dx);
                if (dist < this.killRadius) {
                    const eff = this.config.effectiveness[tm.type] ?? 0;
                    if (Math.random() < eff) {
                        tm.active = false;
                        this.killedTarget = true;
                        this._killedMissile = tm;
                        this.loiterAmmo--;
                    }
                    tm.targeted = false;
                    this.targetMissile = null;
                } else {
                    this.x += (dx/dist) * this.speed * deltaTime;
                    this.y += (dy/dist) * this.speed * deltaTime;
                }
            }

            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > this.maxTrail) this.trail.shift();
            return;
        }

        if (this.isBeam) {
            this.beamAge += deltaTime;
            if (this.beamAge >= this.beamDuration) {
                if (this.targetMissile?.isActive()) {
                    const eff = this.config.effectiveness[this.targetMissile.type] ?? 0.5;
                    if (Math.random() < eff) {
                        this.targetMissile.active = false;
                        this.killedTarget = true;
                    }
                }
                this.active = false;
            }
            return;
        }

        if (!this.targetMissile?.isActive()) {
            this.active = false;
            if (this.targetMissile) this.targetMissile.targeted = false;
            return;
        }

        const tx = this.targetMissile.x;
        const ty = this.targetMissile.y;
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Update heading toward target
        this.heading = Math.atan2(dy, dx);

        if (dist < this.killRadius) {
            const eff = this.config.effectiveness[this.targetMissile.type] ?? 0.5;
            if (Math.random() < eff) {
                if (typeof this.targetMissile.damage === 'function') {
                    // Bomber: deal one hit; let it decide if it dies
                    this.targetMissile.damage(1);
                    this.killedTarget = true; // credit a hit (EntityManager checks if actually dead)
                } else {
                    this.targetMissile.active = false;
                    this.killedTarget = true;
                }
            }
            this.targetMissile.targeted = false;
            this.active = false;
            return;
        }

        const step = this.speed * deltaTime;
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();
    }

    draw(ctx, radar) {
        if (!this.active) return;
        if (this.isBeam) { this._drawBeam(ctx, radar); return; }
        if (this.config?.isCram) { this._drawCram(ctx, radar); return; }

        const sp = radar.worldToScreen(this.x, this.y);
        const px = radar.maxRadius; // pixels per world unit

        // ── Exhaust trail ──
        if (this.trail.length > 1) {
            for (let i = 0; i < this.trail.length - 1; i++) {
                const alpha = (i / this.trail.length) * 0.6;
                const size  = 1 + (i / this.trail.length) * 3;
                const tp    = radar.worldToScreen(this.trail[i].x, this.trail[i].y);
                const hex   = Math.floor(alpha * 0xff).toString(16).padStart(2, '0');
                ctx.fillStyle = this.color + hex;
                ctx.beginPath();
                ctx.arc(tp.x, tp.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ── Seek line from interceptor to target (faint) ──
        if (this.targetMissile?.isActive()) {
            const tp = radar.worldToScreen(this.targetMissile.x, this.targetMissile.y);
            ctx.save();
            ctx.strokeStyle = this.color + '33';
            ctx.lineWidth   = 1;
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y);
            ctx.lineTo(tp.x, tp.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // ── Rocket body (oriented toward heading) ──
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(this.heading);

        // Exhaust flame (behind rocket, at -x)
        const flicker = 0.7 + 0.3 * Math.sin(this.age * 30);
        const flameGrd = ctx.createLinearGradient(-14, 0, -5, 0);
        flameGrd.addColorStop(0, `rgba(255,200,50,0)`);
        flameGrd.addColorStop(0.5, `rgba(255,140,20,${0.6 * flicker})`);
        flameGrd.addColorStop(1,   `rgba(255,255,180,${0.8 * flicker})`);
        ctx.fillStyle = flameGrd;
        ctx.beginPath();
        ctx.ellipse(-10 * flicker, 0, 8 * flicker, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rocket body
        ctx.fillStyle   = this.color;
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth   = 0.5;
        ctx.beginPath();
        ctx.moveTo( 9,  0);  // nose
        ctx.lineTo( 4,  2.5);
        ctx.lineTo(-5,  2.5);
        ctx.lineTo(-5, -2.5);
        ctx.lineTo( 4, -2.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Fins
        ctx.fillStyle = this.color + 'aa';
        ctx.beginPath();
        ctx.moveTo(-3, -2.5); ctx.lineTo(-7, -5); ctx.lineTo(-5, -2.5);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-3, 2.5); ctx.lineTo(-7, 5); ctx.lineTo(-5, 2.5);
        ctx.closePath(); ctx.fill();

        ctx.restore();

        // Glow behind everything
        ctx.save();
        const grd = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 14);
        grd.addColorStop(0, this.color + '44');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _drawCram(ctx, radar) {
        // C-RAM: draw a stream of red tracer rounds from battery to interceptor position
        if (!this.targetMissile?.isActive()) return;
        const src   = radar.worldToScreen(this.startX, this.startY);
        const cur   = radar.worldToScreen(this.x, this.y);
        const alpha = Math.max(0.2, 1 - this.age / this.maxAge);

        ctx.save();

        // Tracer stream — 6 dots spaced along trajectory from source to current position
        const steps = 6;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const px = src.x + (cur.x - src.x) * t;
            const py = src.y + (cur.y - src.y) * t;
            const a  = alpha * (0.3 + 0.7 * (i / steps));
            const r  = 1.2 + (i / steps) * 1.8;

            // Bright orange-red tracer
            ctx.fillStyle = `rgba(255,${Math.floor(80 + 80 * (1 - i/steps))},0,${a.toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();

            // Glow
            ctx.fillStyle = `rgba(255,140,40,${(a * 0.3).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(px, py, r * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Leading round — bright white-orange
        ctx.fillStyle = `rgba(255,220,100,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(cur.x, cur.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawBeam(ctx, radar) {
        if (!this.targetMissile) return;
        const alpha = Math.max(0, 1 - this.beamAge / this.beamDuration);
        const start = radar.worldToScreen(this.startX, this.startY);
        const end   = radar.worldToScreen(this.targetMissile.x, this.targetMissile.y);

        ctx.save();
        // Outer glow
        ctx.strokeStyle = `rgba(255,68,136,${(alpha * 0.35).toFixed(2)})`;
        ctx.lineWidth   = 10;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Core beam
        ctx.strokeStyle = `rgba(255,210,230,${alpha.toFixed(2)})`;
        ctx.lineWidth   = 2;
        ctx.shadowBlur  = 16;
        ctx.shadowColor = '#ff4488';
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    isActive()    { return this.active; }
    getType()     { return this.type; }
    getConfig()   { return this.config; }
}
