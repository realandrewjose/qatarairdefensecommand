export class FighterJet {
    constructor(id, startX, startY, patrolCX = 0.05, patrolCY = -0.05) {
        this.id = id;
        this.x = startX;
        this.y = startY;
        this.callsign   = `QAF-${id}`;
        this.type       = 'fighter_jet';
        this.isFriendly = true;
        this.reward     = 0;
        this.speed = 0.45;
        this.lifetime = 90;
        this.age = 0;
        this.ammo = 5;
        this.engageCooldown = 0;
        this.engageInterval = 4;
        this.engageRange = 0.15;
        this.killProbability = 0.90;
        this.state = 'hunting';
        this.active = true;
        this.heading = -Math.PI / 2;
        this.trail = [];
        this.maxTrail = 12;
        this.baseX = startX;
        this.baseY = startY;
        this._killCallback = null;
        // Patrol center — each wing assigned its own area
        this._patrolCX = patrolCX;
        this._patrolCY = patrolCY;
    }

    onKill(callback) { this._killCallback = callback; }

    update(deltaTime, missiles) {
        if (!this.active) return;
        this.age += deltaTime;
        this.engageCooldown = Math.max(0, this.engageCooldown - deltaTime);

        if (this.age >= this.lifetime || this.ammo <= 0) this.state = 'returning';

        let targetX, targetY;
        if (this.state === 'hunting') {
            const tgt = this._findPriorityTarget(missiles);
            if (tgt) {
                targetX = tgt.x; targetY = tgt.y;
                if (this.engageCooldown <= 0 && this.ammo > 0) {
                    const dx = tgt.x - this.x, dy = tgt.y - this.y;
                    if (Math.sqrt(dx*dx + dy*dy) < this.engageRange) this._engage(tgt);
                }
            } else {
                // Patrol own assigned sector, phase offset per jet so they spread out
                const ang = this.age * 0.5 + this.id * 0.63;
                targetX = this._patrolCX + Math.cos(ang) * 0.10;
                targetY = this._patrolCY + Math.sin(ang) * 0.10;
            }
        } else {
            targetX = this.baseX; targetY = this.baseY;
            const dx = targetX - this.x, dy = targetY - this.y;
            if (Math.sqrt(dx*dx + dy*dy) < 0.04) { this.active = false; return; }
        }

        const dx = targetX - this.x, dy = targetY - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0.005) {
            this.heading = Math.atan2(dy, dx);
            const step = Math.min(this.speed * deltaTime, dist);
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
        }
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();
    }

    _findPriorityTarget(missiles) {
        const canEngageMissile = new Set(['drone', 'cruise', 'loiter', 'maneuver']);
        let best = null, bestScore = -Infinity;
        for (const m of missiles) {
            if (!m.isActive()) continue;
            const dx = m.x - this.x, dy = m.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            let score;
            if (m.type === 'enemy_fighter') {
                if (dist > 0.85) continue;
                score = 100 - dist * 5; // highest priority — dogfight
            } else if (m.type === 'bomber') {
                if (dist > 0.7) continue;
                score = 50 - dist * 5;  // second priority — intercept bomber
            } else if (canEngageMissile.has(m.type)) {
                if (dist > 0.7) continue;
                score = (m.progress ?? 0) * 2 - dist;
            } else {
                continue;
            }
            if (score > bestScore) { bestScore = score; best = m; }
        }
        return best;
    }

    _engage(target) {
        if (typeof target.damage === 'function') {
            // HP-based entity (bomber, enemy fighter) — each shot deals 1 HP damage
            target.targeted = true; // trigger enemy fighter flare response
            target.damage(1);
            if (!target.isActive()) {
                this._killCallback?.(target);
            }
        } else {
            // Normal missile — probability kill
            if (Math.random() < this.killProbability) {
                target.active = false;
                this._killCallback?.(target);
            }
        }
        this.ammo--;
        this.engageCooldown = this.engageInterval;
    }

    draw(ctx, radar) {
        if (!this.active) return;
        const sp = radar.worldToScreen(this.x, this.y);

        // Contrail
        for (let i = 0; i < this.trail.length - 1; i++) {
            const alpha = (i / this.trail.length) * 0.5;
            const tp = radar.worldToScreen(this.trail[i].x, this.trail[i].y);
            ctx.fillStyle = `rgba(255,220,80,${alpha})`;
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Glow halo
        const glow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 18);
        glow.addColorStop(0, 'rgba(255,220,80,0.3)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 18, 0, Math.PI * 2);
        ctx.fill();

        // Jet body
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(this.heading);

        // Afterburner
        const flicker = 0.6 + 0.4 * Math.sin(this.age * 25);
        ctx.fillStyle = `rgba(255,140,30,${0.7 * flicker})`;
        ctx.beginPath();
        ctx.ellipse(-10 * flicker, 0, 7 * flicker, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fuselage
        ctx.fillStyle = '#ffdd44';
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(11, 0);
        ctx.lineTo(4, 2.5); ctx.lineTo(-6, 2.5);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-6, -2.5); ctx.lineTo(4, -2.5);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Wings
        ctx.fillStyle = '#ffcc22';
        ctx.beginPath();
        ctx.moveTo(2, 0); ctx.lineTo(-4, -10); ctx.lineTo(-7, -7); ctx.lineTo(-6, 0);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2, 0); ctx.lineTo(-4, 10); ctx.lineTo(-7, 7); ctx.lineTo(-6, 0);
        ctx.closePath(); ctx.fill();

        // Tail fins
        ctx.fillStyle = '#ffbb00';
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-9, -5); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-9, 5); ctx.lineTo(-8, 2); ctx.closePath(); ctx.fill();
        ctx.restore();

        // Labels
        ctx.fillStyle = '#ffdd44';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this.callsign, sp.x + 13, sp.y - 4);
        ctx.fillStyle = this.ammo > 1 ? '#ffdd44' : '#ff6600';
        ctx.font = '7px monospace';
        ctx.fillText(`\u25c8${this.ammo}`, sp.x + 13, sp.y + 5);
        if (this.state === 'returning') {
            ctx.fillStyle = '#ff8800';
            ctx.font = '6px monospace';
            ctx.fillText('RTB', sp.x + 13, sp.y + 13);
        }
    }

    isActive() { return this.active; }
}
