// Enemy fighter jet — highly maneuverable, deploys flares to defeat interceptors
export class EnemyFighter {
    constructor(id, waveScaling = 1.0) {
        this.id    = id;
        this.type  = 'enemy_fighter';
        this.config = { name: 'Enemy Fighter', shortName: 'ENEMY FIGHTER' };
        this.color  = '#ff4444';
        this.active = true;
        this.targeted = false;
        this.age    = 0;
        this.hp     = 2;
        this.maxHp  = 2;
        this.reward = 400 + Math.floor(waveScaling * 80);

        // Start outside the radar, head toward a random Qatar target
        const angle  = Math.random() * Math.PI * 2;
        this.x = Math.cos(angle) * 1.15;
        this.y = Math.sin(angle) * 1.15;

        // Choose a random target inside Qatar
        const targets = [
            { x: 0.037, y: 0.074 }, // Al Udeid
            { x: 0.111, y: 0.011 }, // Doha
            { x: 0.117, y: -0.311 }, // Ras Laffan
        ];
        const tgt = targets[Math.floor(Math.random() * targets.length)];
        this._baseTargetX = tgt.x;
        this._baseTargetY = tgt.y;

        this.speed   = 0.22 + waveScaling * 0.02;
        this.heading = Math.atan2(tgt.y - this.y, tgt.x - this.x);

        // Maneuvering state
        this._maneuverTimer = 3 + Math.random() * 4;
        this._maneuverVx    = 0;
        this._maneuverVy    = 0;

        // Countermeasures (flares)
        this._flareCount   = 2 + Math.floor(waveScaling);
        this._flareCooldown = 0;
        this._flareActive  = false;
        this._flareTimer   = 0;

        // Strafe attack: fires multiple passes
        this._strafeCooldown    = 2;           // initial delay before first shot
        this._strafeCooldownMax = 5 + Math.random() * 4; // seconds between shots
        this._totalShots  = 0;
        this._maxShots    = 2 + Math.floor(waveScaling); // shots before retreating
        this._retreating  = false;
        this._firecallback = null;

        this.trail    = [];
        this.maxTrail = 18;
    }

    onFire(fn) { this._firecallback = fn; }
    isActive()  { return this.active; }

    damage(amount = 1) {
        // Check flare intercept
        if (this._flareActive && Math.random() < 0.75) return; // flare defeats missile
        this.hp -= amount;
        if (this.hp <= 0) { this.hp = 0; this.active = false; }
    }

    update(deltaTime) {
        if (!this.active) return;
        this.age += deltaTime;

        // Flare logic — deploy when targeted
        if (this._flareCooldown > 0) this._flareCooldown -= deltaTime;
        if (this._flareActive) {
            this._flareTimer -= deltaTime;
            if (this._flareTimer <= 0) this._flareActive = false;
        }
        if (this.targeted && this._flareCount > 0 && this._flareCooldown <= 0) {
            this._flareActive   = true;
            this._flareTimer    = 2.5;
            this._flareCooldown = 6;
            this._flareCount--;
        }

        // Maneuvering: random direction shifts
        this._maneuverTimer -= deltaTime;
        if (this._maneuverTimer <= 0) {
            const perpAngle = this.heading + Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1);
            const mag = 0.04 + Math.random() * 0.06;
            this._maneuverVx = Math.cos(perpAngle) * mag;
            this._maneuverVy = Math.sin(perpAngle) * mag;
            this._maneuverTimer = 1.5 + Math.random() * 2.5;
        }

        // Strafe cooldown
        if (this._strafeCooldown > 0) this._strafeCooldown -= deltaTime;

        // Retreating: fly away from center until out of bounds
        if (this._retreating) {
            const escAngle = Math.atan2(this.y, this.x);
            this.heading = escAngle;
            this.x += Math.cos(escAngle) * this.speed * deltaTime;
            this.y += Math.sin(escAngle) * this.speed * deltaTime;
            if (Math.sqrt(this.x * this.x + this.y * this.y) > 1.3) this.active = false;
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > this.maxTrail) this.trail.shift();
            return;
        }

        // Home toward target with maneuvering offset
        const tx = this._baseTargetX + this._maneuverVx;
        const ty = this._baseTargetY + this._maneuverVy;
        const dx = tx - this.x, dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.01) {
            this.heading = Math.atan2(dy, dx);
            this.x += (dx / dist) * this.speed * deltaTime;
            this.y += (dy / dist) * this.speed * deltaTime;
        }

        // Strafe: fire when in range and cooldown ready
        if (dist < 0.30 && this._strafeCooldown <= 0 && this._totalShots < this._maxShots) {
            this._totalShots++;
            this._strafeCooldown = this._strafeCooldownMax;
            this._firecallback?.(this.x, this.y, this._baseTargetX, this._baseTargetY);
        }

        // After max shots, retreat
        if (this._totalShots >= this._maxShots) this._retreating = true;

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();
    }

    draw(ctx, radar) {
        if (!this.active) return;
        const sp = radar.worldToScreen(this.x, this.y);

        // Trail
        for (let i = 0; i < this.trail.length - 1; i++) {
            const alpha = (i / this.trail.length) * 0.4;
            const tp = radar.worldToScreen(this.trail[i].x, this.trail[i].y);
            ctx.fillStyle = `rgba(255,100,100,${alpha})`;
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Glow
        if (this._flareActive) {
            const fg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 28);
            fg.addColorStop(0, 'rgba(255,220,50,0.55)');
            fg.addColorStop(1, 'transparent');
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 28, 0, Math.PI * 2);
            ctx.fill();
        }

        // Body
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(this.heading);

        // Afterburner
        const flicker = 0.6 + 0.4 * Math.sin(this.age * 24);
        ctx.fillStyle = `rgba(255,80,40,${0.7 * flicker})`;
        ctx.beginPath();
        ctx.ellipse(-10 * flicker, 0, 7 * flicker, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fuselage
        ctx.fillStyle   = '#cc2222';
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth   = 0.8;
        ctx.beginPath();
        ctx.moveTo(11, 0); ctx.lineTo(5, 2.5); ctx.lineTo(-7, 2.5);
        ctx.lineTo(-10, 0); ctx.lineTo(-7, -2.5); ctx.lineTo(5, -2.5);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Wings
        ctx.fillStyle   = '#aa1818';
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth   = 0.6;
        ctx.beginPath();
        ctx.moveTo(3, 0); ctx.lineTo(-5, -13); ctx.lineTo(-9, -9); ctx.lineTo(-7, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(3, 0); ctx.lineTo(-5, 13); ctx.lineTo(-9, 9); ctx.lineTo(-7, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        ctx.restore();

        // HP bar
        const barW = 24;
        const hpF  = this.hp / this.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(sp.x - barW/2, sp.y - 19, barW, 3);
        ctx.fillStyle = hpF > 0.5 ? '#ef4444' : '#f97316';
        ctx.fillRect(sp.x - barW/2, sp.y - 19, barW * hpF, 3);

        // Label
        ctx.fillStyle = '#ff6666';
        ctx.font      = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this._flareActive ? '✦ ENEMY FIGHTER' : '⚠ ENEMY FIGHTER', sp.x, sp.y + 19);

        if (this.targeted) {
            ctx.save();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth   = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
}
