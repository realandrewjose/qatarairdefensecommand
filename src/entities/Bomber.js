export class Bomber {
    constructor(id, waveScaling = 1.0) {
        this.id = id;
        this.hp    = Math.min(3 + Math.floor(waveScaling), 8);
        this.maxHp = this.hp;
        this.reward = 600 + Math.floor(waveScaling * 100);
        this.color = '#ffcc44';
        // Duck-typing interface shared with Missile so interceptors can target it
        this.type   = 'bomber';
        this.config = { name: 'Strategic Bomber', shortName: 'BOMBER' };
        this.active   = true;
        this.targeted = false;
        this.age = 0;
        this.trail    = [];
        this.maxTrail = 24;

        // Fly across the radar from one edge to the opposite
        const angle    = Math.random() * Math.PI * 2;
        const exitDiff = Math.PI + (Math.random() - 0.5) * 0.6;
        this.x       = Math.cos(angle) * 1.18;
        this.y       = Math.sin(angle) * 1.18;
        this.targetX = Math.cos(angle + exitDiff) * 1.18;
        this.targetY = Math.sin(angle + exitDiff) * 1.18;
        this.speed   = 0.055 + waveScaling * 0.005;
        this.heading = Math.atan2(this.targetY - this.y, this.targetX - this.x);

        this.dropInterval = Math.max(3.5, 6 - waveScaling * 0.5);
        this.dropTimer    = 2; // first drop after 2 s

        this._dropCallback    = null;
        this._destroyCallback = null;
    }

    onDrop(fn)    { this._dropCallback    = fn; }
    onDestroy(fn) { this._destroyCallback = fn; }
    isActive()    { return this.active; }

    // Called by interceptors on hit (duck-typed alongside Missile)
    damage(amount = 1) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp     = 0;
            this.active = false;
            this._destroyCallback?.();
        }
    }

    update(deltaTime) {
        if (!this.active) return;
        this.age += deltaTime;

        const dx   = this.targetX - this.x;
        const dy   = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.05) { this.active = false; return; } // escaped

        this.x += (dx / dist) * this.speed * deltaTime;
        this.y += (dy / dist) * this.speed * deltaTime;

        // Drop payload only when inside the radar disk
        this.dropTimer -= deltaTime;
        if (this.dropTimer <= 0) {
            if (Math.sqrt(this.x * this.x + this.y * this.y) < 0.90) {
                this._dropCallback?.(this.x, this.y);
            }
            this.dropTimer = this.dropInterval;
        }

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();
    }

    draw(ctx, radar) {
        if (!this.active) return;
        const sp = radar.worldToScreen(this.x, this.y);

        // Contrail
        for (let i = 0; i < this.trail.length - 1; i++) {
            const alpha = (i / this.trail.length) * 0.45;
            const tp = radar.worldToScreen(this.trail[i].x, this.trail[i].y);
            ctx.fillStyle = `rgba(255,200,80,${alpha})`;
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Outer glow halo
        const glow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 34);
        glow.addColorStop(0, 'rgba(255,180,50,0.32)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 34, 0, Math.PI * 2);
        ctx.fill();

        // Body (rotated toward heading)
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(this.heading);

        // 4-engine afterburner flames
        const flicker = 0.6 + 0.4 * Math.sin(this.age * 18);
        for (const yo of [-7, -3, 3, 7]) {
            ctx.fillStyle = `rgba(255,140,30,${0.65 * flicker})`;
            ctx.beginPath();
            ctx.ellipse(-16 * flicker, yo, 7 * flicker, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Fuselage
        ctx.fillStyle   = '#9a6f10';
        ctx.strokeStyle = '#ffcc44';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(13, 4); ctx.lineTo(-16, 4);
        ctx.lineTo(-22, 0);
        ctx.lineTo(-16, -4); ctx.lineTo(13, -4);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Swept wings
        ctx.fillStyle   = '#7a5808';
        ctx.strokeStyle = '#ffcc44';
        ctx.lineWidth   = 0.8;
        ctx.beginPath();
        ctx.moveTo(7, 0); ctx.lineTo(-9, -24); ctx.lineTo(-18, -17); ctx.lineTo(-12, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(7, 0); ctx.lineTo(-9, 24); ctx.lineTo(-18, 17); ctx.lineTo(-12, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Tail fins
        ctx.fillStyle = '#9a6f10';
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-22, -9); ctx.lineTo(-18, -4); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-22,  9); ctx.lineTo(-18,  4); ctx.closePath(); ctx.fill();

        ctx.restore();

        // HP bar
        const barW   = 40;
        const hpFrac = this.hp / this.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(sp.x - barW / 2, sp.y - 28, barW, 5);
        ctx.fillStyle = hpFrac > 0.6 ? '#22c55e' : hpFrac > 0.3 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(sp.x - barW / 2, sp.y - 28, barW * hpFrac, 5);

        // Label
        ctx.fillStyle = '#ffcc44';
        ctx.font      = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`⊛ BOMBER  HP:${this.hp}`, sp.x, sp.y + 26);

        // Targeting ring when locked
        if (this.targeted) {
            ctx.save();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth   = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 26, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
}
