export const MISSILE_TYPES = {
    ballistic: {
        name: 'Ballistic Missile',
        shortName: 'BALLISTIC',
        speed: 0.075,
        damage: 20, // Reduced from 35
        reward: 250,
        color: '#ff2200',
        glowColor: 'rgba(255,34,0,0.55)',
        arcHeight: 0.38,    // parabolic arc height in world units
        radius: 6,
        trailLength: 10,
        threatLevel: 'CRITICAL',
        alertMsg: 'Ballistic missile inbound. Impact imminent.',
    },
    cruise: {
        name: 'Cruise Missile',
        shortName: 'CRUISE',
        speed: 0.13,
        damage: 12, // Reduced from 20
        reward: 150,
        color: '#ff8800',
        glowColor: 'rgba(255,136,0,0.5)',
        arcHeight: 0.015,
        radius: 4,
        trailLength: 7,
        threatLevel: 'HIGH',
        alertMsg: 'Cruise missile detected on low-altitude approach.',
    },
    hypersonic: {
        name: 'Hypersonic Glide',
        shortName: 'HYPER',
        speed: 0.32,
        damage: 18, // Reduced from 30
        reward: 350,
        color: '#ff00ff',
        glowColor: 'rgba(255,0,255,0.6)',
        arcHeight: 0.09,
        radius: 3,
        trailLength: 14,
        threatLevel: 'CRITICAL',
        alertMsg: 'Hypersonic threat detected. Extreme speed — engage immediately.',
    },
    drone: {
        name: 'Kamikaze Drone',
        shortName: 'DRONE',
        speed: 0.052,
        damage: 5, // Reduced from 8
        reward: 75,
        color: '#ffdd00',
        glowColor: 'rgba(255,220,0,0.45)',
        arcHeight: 0.0,
        radius: 3,
        trailLength: 4,
        threatLevel: 'MEDIUM',
        alertMsg: 'Kamikaze drone swarm inbound.',
    },
    antiship: {
        name: 'Anti-Ship Missile',
        shortName: 'C-802',
        speed: 0.18,
        damage: 15,
        reward: 200,
        color: '#00ccff',
        glowColor: 'rgba(0,200,255,0.5)',
        arcHeight: 0.01,
        radius: 4,
        trailLength: 7,
        threatLevel: 'HIGH',
        alertMsg: 'Anti-ship missile targeting coastal installations.',
    },
    maneuver: {
        name: 'Maneuvering Reentry (MaRV)',
        shortName: 'MaRV',
        speed: 0.10,
        damage: 18,
        reward: 300,
        color: '#ff6622',
        glowColor: 'rgba(255,100,30,0.55)',
        arcHeight: 0.28,
        radius: 5,
        trailLength: 12,
        threatLevel: 'CRITICAL',
        alertMsg: 'Maneuvering warhead detected. Intercept probability reduced.',
        maneuverable: true,
    },
    loiter: {
        name: 'Loitering Munition',
        shortName: 'LOITER',
        speed: 0.05,
        damage: 10,
        reward: 130,
        color: '#ffaa00',
        glowColor: 'rgba(255,170,0,0.45)',
        arcHeight: 0.0,
        radius: 3,
        trailLength: 6,
        threatLevel: 'MEDIUM',
        alertMsg: 'Loitering munition detected — circling above Qatar.',
    },
    mirv: {
        name: 'MIRV Warhead',
        shortName: 'MIRV',
        speed: 0.065,
        damage: 28,
        reward: 450,
        color: '#ff0044',
        glowColor: 'rgba(255,0,68,0.65)',
        arcHeight: 0.42,
        radius: 7,
        trailLength: 9,
        threatLevel: 'CRITICAL',
        alertMsg: 'MIRV warhead detected — multiple sub-missiles incoming!',
    },
    cluster: {
        name: 'Cluster Ballistic Missile',
        shortName: 'CBM',
        speed: 0.070,
        damage: 5,        // minimal direct damage — threat is in the submunitions
        reward: 350,      // high reward for stopping it before split
        color: '#ff6600',
        glowColor: 'rgba(255,100,0,0.65)',
        arcHeight: 0.40,
        radius: 8,
        trailLength: 12,
        threatLevel: 'CRITICAL',
        alertMsg: 'Cluster Ballistic Missile inbound — will disperse submunitions over Qatar!',
        isCluster: true,
        splitProgress: 0.60,   // splits when descending into Qatari airspace
    },
    submunition: {
        name: 'Cluster Submunition',
        shortName: 'SUBMUN',
        speed: 0.130,
        damage: 10,
        reward: 50,
        color: '#ff8833',
        glowColor: 'rgba(255,136,50,0.55)',
        arcHeight: 0.14,
        radius: 3,
        trailLength: 6,
        threatLevel: 'HIGH',
        alertMsg: 'Submunitions dispersed — multiple warheads inbound!',
    },
};

let _missileIdCounter = 0;

export class Missile {
    constructor(startX, startY, targetX, targetY, type = 'ballistic', targetName = 'Unknown', waveScaling = 1.0) {
        this.id = ++_missileIdCounter;
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.origTargetX = targetX;
        this.origTargetY = targetY;
        this.targetName = targetName;
        this.type = type;

        const cfg = MISSILE_TYPES[type] || MISSILE_TYPES.ballistic;
        this.config = cfg;
        this.speed   = cfg.speed * waveScaling;
        this.damage  = Math.round(cfg.damage * Math.min(waveScaling, 2.5));
        this.reward  = cfg.reward;
        this.color   = cfg.color;
        this.glowColor = cfg.glowColor;
        this.arcHeight = cfg.arcHeight;
        this.radius  = cfg.radius;

        this.progress = 0;
        this.active = true;
        this.reachedTarget = false;
        this.targeted = false;
        this.hasSplit = false; // for MIRV / cluster
        this._jamMult = 1.0;
        this._jammed  = false;
        this._splitCallback = null;

        this.trail = [];
        this.maxTrail = cfg.trailLength;

        this.wobbleAmp   = (type === 'drone' || type === 'loiter') ? 0.010 : 0;
        this.wobbleFreq  = 8 + Math.random() * 4;
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.blipBrightness = 1.0;
        this._age = 0;
        this._drawHeading = 0; // visual heading — updated each movement tick

        // Maneuvering missile state
        if (cfg.maneuverable) {
            this.maneuverTimer    = 5 + Math.random() * 5; // first maneuver delay
            this.maneuverCount    = 0;
        }

        // Loitering drone state
        if (type === 'loiter') {
            this.loiterPhase    = 'approach';
            // Loiter point: above/near the target
            this.loiterApproachX = targetX + (Math.random() - 0.5) * 0.06;
            this.loiterApproachY = targetY - 0.06 - Math.random() * 0.04;
            this.loiterRadius    = 0.05 + Math.random() * 0.03;
            this.loiterAngle     = Math.random() * Math.PI * 2;
            this.loiterAngSpeed  = (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 0.8);
            this.loiterTimer     = 18 + Math.random() * 14; // 18–32 s circling
        }
    }

    // World position at parametric t (0→1) along the arc
    getPositionAt(t) {
        const x = this.startX + (this.targetX - this.startX) * t;
        const y = this.startY + (this.targetY - this.startY) * t
            - this.arcHeight * Math.sin(Math.PI * t);
        return { x, y };
    }

    update(deltaTime) {
        if (!this.active) return;
        this._age += deltaTime;

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();

        // ── Loitering drone: multi-phase flight ──
        if (this.type === 'loiter') {
            this._updateLoiter(deltaTime);
            return;
        }

        // ── Normal progress-based movement ──
        this.progress = Math.min(1.0, this.progress + this.speed * (this._jamMult) * deltaTime);
        const pos = this.getPositionAt(this.progress);
        // Track visual heading so _drawDrone can use actual movement direction
        this._drawHeading = Math.atan2(this.targetY - this.startY, this.targetX - this.startX);
        this.x = pos.x;
        this.y = pos.y;

        // Cluster missile split — triggers when descending into Qatari airspace
        if (this.config.isCluster && !this.hasSplit && this.progress >= this.config.splitProgress) {
            this.hasSplit = true;
            this.active = false; // delivery vehicle spent on dispersion
            this._splitCallback?.(this.x, this.y);
            return;
        }

        // Maneuvering
        if (this.config.maneuverable) this._updateManeuver(deltaTime);

        // Wobble (drone / loiter)
        if (this.wobbleAmp > 0) {
            const perp = this.getPerpendicular();
            this.x += Math.sin(this.progress * this.wobbleFreq + this.wobblePhase) * this.wobbleAmp * perp.x;
            this.y += Math.sin(this.progress * this.wobbleFreq + this.wobblePhase) * this.wobbleAmp * perp.y;
        }

        if (this.progress >= 1.0) {
            this.active = false;
            // Jammed missiles slide off-screen — no impact
            if (!this._jammed) this.reachedTarget = true;
        }
    }

    _updateLoiter(deltaTime) {
        switch (this.loiterPhase) {
            case 'approach': {
                const dx = this.loiterApproachX - this.x;
                const dy = this.loiterApproachY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 0.025) {
                    this.loiterPhase = 'circle';
                } else {
                    this._drawHeading = Math.atan2(dy, dx);
                    const step = this.speed * this._jamMult * deltaTime;
                    this.x += (dx / dist) * step;
                    this.y += (dy / dist) * step;
                }
                break;
            }
            case 'circle': {
                this.loiterTimer -= deltaTime;
                this.loiterAngle += this.loiterAngSpeed * deltaTime;
                // Heading = tangent to circle in direction of angular travel
                this._drawHeading = this.loiterAngle + (this.loiterAngSpeed > 0 ? Math.PI / 2 : -Math.PI / 2);
                this.x = this.loiterApproachX + Math.cos(this.loiterAngle) * this.loiterRadius;
                this.y = this.loiterApproachY + Math.sin(this.loiterAngle) * this.loiterRadius;
                if (this.wobbleAmp > 0) {
                    this.x += Math.sin(this.loiterAngle * this.wobbleFreq + this.wobblePhase) * this.wobbleAmp * 0.5;
                    this.y += Math.cos(this.loiterAngle * this.wobbleFreq + this.wobblePhase) * this.wobbleAmp * 0.5;
                }
                if (this.loiterTimer <= 0) {
                    this.loiterPhase = 'strike';
                    this.startX = this.x;
                    this.startY = this.y;
                    this.progress = 0;
                }
                break;
            }
            case 'strike': {
                // Fast dive at target
                this._drawHeading = Math.atan2(this.targetY - this.y, this.targetX - this.x);
                this.progress = Math.min(1.0, this.progress + this.speed * this._jamMult * deltaTime * 4);
                const pos = this.getPositionAt(this.progress);
                this.x = pos.x;
                this.y = pos.y;
                if (this.progress >= 1.0) {
                    this.active = false;
                    this.reachedTarget = true;
                }
                break;
            }
        }
    }

    _updateManeuver(deltaTime) {
        this.maneuverTimer -= deltaTime;
        if (this.maneuverTimer <= 0 && this.progress > 0.18 && this.progress < 0.88) {
            // Rebase: start a new arc from current position to a shifted target
            this.startX = this.x;
            this.startY = this.y;
            const angle = Math.random() * Math.PI * 2;
            const mag = 0.04 + Math.random() * 0.06;
            this.targetX = Math.max(-0.15, Math.min(0.14, this.origTargetX + Math.cos(angle) * mag));
            this.targetY = Math.max(-0.33, Math.min(0.33, this.origTargetY + Math.sin(angle) * mag));
            this.progress = 0;
            this.targeted = false; // break lock — interceptor will miss
            this.maneuverCount++;
            this.maneuverTimer = 5 + Math.random() * 6;
        }
    }

    onSplit(cb) { this._splitCallback = cb; }

    getPerpendicular() {
        const dx = this.targetX - this.startX;
        const dy = this.targetY - this.startY;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return { x: -dy / len, y: dx / len };
    }

    draw(ctx, radar) {
        if (!this.active) return;
        if (this.type === 'drone') { this._drawDrone(ctx, radar); return; }
        const screenPos = radar.worldToScreen(this.x, this.y);

        // Draw trajectory from current pos to target
        this.drawTrajectory(ctx, radar);

        // Draw trail
        if (this.trail.length > 1) {
            ctx.save();
            ctx.strokeStyle = this.glowColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const fp = radar.worldToScreen(this.trail[0].x, this.trail[0].y);
            ctx.moveTo(fp.x, fp.y);
            for (let i = 1; i < this.trail.length; i++) {
                const tp = radar.worldToScreen(this.trail[i].x, this.trail[i].y);
                ctx.lineTo(tp.x, tp.y);
            }
            ctx.lineTo(screenPos.x, screenPos.y);
            ctx.stroke();
            ctx.restore();
        }

        // Outer glow
        ctx.save();
        const grd = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, this.radius * 3.5
        );
        grd.addColorStop(0, this.color + 'cc');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.radius * 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Core dot
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Targeting ring (when interceptor is homing on this)
        if (this.targeted) {
            ctx.save();
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, this.radius + 9, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Cluster missile: pulsing split-warning ring as it approaches dispersion
        if (this.config.isCluster && !this.hasSplit) {
            const splitProx = Math.max(0, (this.progress - 0.40) / (this.config.splitProgress - 0.40));
            if (splitProx > 0) {
                const pulse = 0.5 + 0.5 * Math.sin(this._age * 8.33); // pause-aware (≈ Date.now()/120 in real time)
                ctx.save();
                ctx.strokeStyle = `rgba(255,160,0,${0.35 + 0.55 * splitProx * pulse})`;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, this.radius + 10 + pulse * 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        }

        // Type label
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this.config.shortName, screenPos.x + this.radius + 4, screenPos.y - 3);
        ctx.restore();
    }

    _drawDrone(ctx, radar) {
        const sp = radar.worldToScreen(this.x, this.y);

        // Trail
        for (let i = 0; i < this.trail.length - 1; i++) {
            const alpha = (i / this.trail.length) * 0.5;
            const tp = radar.worldToScreen(this.trail[i].x, this.trail[i].y);
            ctx.fillStyle = `rgba(255,40,0,${alpha})`;
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Glow
        const glow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 13);
        glow.addColorStop(0, 'rgba(255,40,0,0.35)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 13, 0, Math.PI * 2);
        ctx.fill();

        // Heading — use tracked movement direction (correct during loiter circle)
        const heading = this._drawHeading;

        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(heading);

        // Body
        ctx.fillStyle   = '#cc2200';
        ctx.strokeStyle = '#ff4422';
        ctx.lineWidth   = 0.8;
        ctx.beginPath();
        ctx.ellipse(1, 0, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Spinning rotors (4 arms)
        ctx.strokeStyle = 'rgba(255,80,40,0.7)';
        ctx.lineWidth   = 1;
        const armPhase = this._age * 11;
        for (let i = 0; i < 4; i++) {
            const a = armPhase + (i * Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
            ctx.stroke();
        }
        ctx.restore();

        // Targeting ring
        if (this.targeted) {
            ctx.save();
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Label
        ctx.fillStyle = '#ff4422';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('DRONE', sp.x + 12, sp.y - 3);
    }

    drawTrajectory(ctx, radar) {
        const targetScreen = radar.worldToScreen(this.targetX, this.targetY);

        if (this.arcHeight > 0.04) {
            // Parabolic arc from current pos to target
            const steps = 24;
            ctx.save();
            ctx.strokeStyle = this.color + '44';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            const cp = radar.worldToScreen(this.x, this.y);
            ctx.moveTo(cp.x, cp.y);

            for (let i = 1; i <= steps; i++) {
                const t = this.progress + (i / steps) * (1 - this.progress);
                const pos = this.getPositionAt(Math.min(t, 1.0));
                const sp = radar.worldToScreen(pos.x, pos.y);
                ctx.lineTo(sp.x, sp.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // Apogee marker (midpoint of remaining arc)
            if (this.progress < 0.5) {
                const apogeePos = this.getPositionAt(0.5);
                const ap = radar.worldToScreen(apogeePos.x, apogeePos.y);
                ctx.strokeStyle = this.color + '88';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(ap.x, ap.y, 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = this.color + 'aa';
                ctx.font = '7px monospace';
                ctx.textAlign = 'left';
                ctx.fillText('APOGEE', ap.x + 6, ap.y + 3);
            }
            ctx.restore();
        } else {
            // Simple dashed line for flat-trajectory missiles
            const cp = radar.worldToScreen(this.x, this.y);
            ctx.save();
            ctx.strokeStyle = this.color + '55';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 6]);
            ctx.beginPath();
            ctx.moveTo(cp.x, cp.y);
            ctx.lineTo(targetScreen.x, targetScreen.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Impact X marker
        ctx.save();
        ctx.strokeStyle = this.color + 'bb';
        ctx.lineWidth = 1.5;
        const s = 6;
        ctx.beginPath();
        ctx.moveTo(targetScreen.x - s, targetScreen.y - s);
        ctx.lineTo(targetScreen.x + s, targetScreen.y + s);
        ctx.moveTo(targetScreen.x + s, targetScreen.y - s);
        ctx.lineTo(targetScreen.x - s, targetScreen.y + s);
        ctx.stroke();
        ctx.restore();
    }

    isActive() { return this.active; }
    getType() { return this.type; }
    getConfig() { return this.config; }
}
