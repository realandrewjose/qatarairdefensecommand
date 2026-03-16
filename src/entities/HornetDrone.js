// Hornet UAV — autonomous kamikaze drone. Hunts cruise/drone/loiter missiles, rams and destroys them (and itself).
// Does NOT return to base. Dies on impact or after lifetime expires.
export class HornetDrone {
    constructor(id, startX, startY, patrolCX = 0, patrolCY = 0) {
        this.id       = id;
        this.x        = startX;
        this.y        = startY;
        this.callsign   = `UAV-${String(id).padStart(2, '0')}`;
        this.type       = 'hornet_drone';
        this.isFriendly = true;
        this.reward     = 0;
        this.speed    = 0.32;
        this.lifetime = 120;  // seconds alive before expiry
        this.age      = 0;
        this.ramRange = 0.030; // world units — close enough to ram
        this.active   = true;
        this.heading  = -Math.PI / 2;
        this.trail    = [];
        this.maxTrail = 12;
        this._killCallback = null;
        this._target  = null;  // locked-on target
        // Each hornet patrols its own area when no target
        this._patrolCX = patrolCX;
        this._patrolCY = patrolCY;
    }

    // Valid target types for Hornet — slow loitering threats only (no cruise, no ballistic)
    static VALID_TYPES = new Set(['drone', 'loiter']);

    onKill(callback) { this._killCallback = callback; }
    isActive()        { return this.active; }

    update(deltaTime, missiles) {
        if (!this.active) return;
        this.age += deltaTime;

        // Expire after lifetime
        if (this.age >= this.lifetime) {
            this.active = false;
            return;
        }

        // Re-acquire target if current one is gone or wrong type
        if (!this._target || !this._target.isActive?.() || this._target.active === false) {
            this._target = this._findTarget(missiles);
        }

        let targetX, targetY;
        if (this._target) {
            targetX = this._target.x;
            targetY = this._target.y;

            // Ram check
            const dx = this._target.x - this.x;
            const dy = this._target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.ramRange) {
                // Kamikaze impact — kill target and self
                this._target.active = false;
                this._killCallback?.(this._target);
                this.active = false;
                return;
            }
        } else {
            // No target — patrol own assigned area, loose ellipse
            const ang = this.age * 0.38 + this.id * 0.7; // phase offset per drone
            targetX = this._patrolCX + Math.cos(ang) * 0.12;
            targetY = this._patrolCY + Math.sin(ang) * 0.09;
        }

        // Move toward target
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.003) {
            this.heading = Math.atan2(dy, dx);
            const step = Math.min(this.speed * deltaTime, dist);
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
        }

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();
    }

    _findTarget(missiles) {
        let best = null, bestScore = -Infinity;
        for (const m of missiles) {
            if (!m.isActive?.() || m.active === false) continue;
            if (!HornetDrone.VALID_TYPES.has(m.type)) continue; // cruise, drone, loiter only
            const dx = m.x - this.x, dy = m.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.85) continue; // don't chase off-radar
            // Prefer closer threats with higher progress (closer to hitting Qatar)
            const score = (m.progress ?? 0) * 3 - dist;
            if (score > bestScore) { bestScore = score; best = m; }
        }
        return best;
    }

    draw(ctx, radar) {
        if (!this.active) return;
        const sp = radar.worldToScreen(this.x, this.y);

        // Trail
        for (let i = 0; i < this.trail.length - 1; i++) {
            const alpha = (i / this.trail.length) * 0.45;
            const tp = radar.worldToScreen(this.trail[i].x, this.trail[i].y);
            ctx.fillStyle = `rgba(255,170,34,${alpha})`;
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Glow
        const glow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 11);
        glow.addColorStop(0, 'rgba(255,170,34,0.28)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 11, 0, Math.PI * 2);
        ctx.fill();

        // Drone body
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(this.heading);

        // Blink red in last 20s of life
        const nearExpiry = this.age > this.lifetime - 20;
        const blinkOn    = !nearExpiry || Math.floor(this.age * 4) % 2 === 0;
        const bodyColor  = nearExpiry && blinkOn ? '#ff4400' : '#ffaa22';
        const rimColor   = nearExpiry && blinkOn ? '#ff6600' : '#ffcc55';

        ctx.fillStyle   = bodyColor;
        ctx.strokeStyle = rimColor;
        ctx.lineWidth   = 0.7;
        ctx.beginPath();
        ctx.ellipse(2, 0, 5, 2.2, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Spinning rotors
        ctx.strokeStyle = 'rgba(255,204,85,0.65)';
        ctx.lineWidth   = 1;
        const armPhase = this.age * 9;
        for (let i = 0; i < 4; i++) {
            const a = armPhase + (i * Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
            ctx.stroke();
        }
        ctx.restore();

        // Callsign label
        ctx.fillStyle = nearExpiry && blinkOn ? '#ff4400' : '#ffaa22';
        ctx.font      = 'bold 7px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this.callsign, sp.x + 11, sp.y - 3);

        // Time remaining
        ctx.fillStyle = nearExpiry ? '#ff4400' : '#ffaa22';
        ctx.font = '5px monospace';
        ctx.fillText(`${Math.ceil(this.lifetime - this.age)}s`, sp.x + 11, sp.y + 5);

        // Lock-on indicator
        if (this._target?.isActive?.()) {
            ctx.fillStyle = 'rgba(255,170,34,0.8)';
            ctx.font = '6px monospace';
            ctx.fillText('⊙', sp.x + 11, sp.y + 12);
        }
    }
}
