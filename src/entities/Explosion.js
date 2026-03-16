export class Explosion {
    constructor(x, y, type = 'intercept', color = '#ffcc00') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = color;

        this.age = 0;
        this.duration = type === 'impact' ? 0.9 : 0.55;
        this.maxRadius = type === 'impact' ? 28 : 18;
        this.active = true;

        this.sparks = Array.from({ length: type === 'impact' ? 16 : 10 }, () => ({
            angle: Math.random() * Math.PI * 2,
            speed: 0.015 + Math.random() * 0.03,
            life: 0.4 + Math.random() * 0.3,
            age: 0,
        }));
    }

    update(deltaTime) {
        this.age += deltaTime;
        this.sparks.forEach(s => { s.age += deltaTime; });
        if (this.age >= this.duration) this.active = false;
    }

    draw(ctx, radar) {
        if (!this.active) return;
        const sp = radar.worldToScreen(this.x, this.y);
        const t = this.age / this.duration;
        const alpha = Math.max(0, 1 - t);
        const radius = this.maxRadius * Math.sin(Math.PI * t * 0.85);

        ctx.save();

        // Outer ring
        const ringAlpha = Math.floor(alpha * 0xcc).toString(16).padStart(2, '0');
        ctx.strokeStyle = this.color + ringAlpha;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner flash
        const innerAlpha = Math.max(0, 1 - t * 2.2);
        if (innerAlpha > 0) {
            const grd = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, radius * 0.7);
            grd.addColorStop(0, `rgba(255,255,220,${(innerAlpha * 0.85).toFixed(2)})`);
            grd.addColorStop(0.4, this.color + Math.floor(innerAlpha * 0x88).toString(16).padStart(2, '0'));
            grd.addColorStop(1, 'transparent');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }

        // Second expanding ring (impact explosions)
        if (this.type === 'impact' && t > 0.2) {
            const r2 = radius * 1.55 * ((t - 0.2) / 0.8);
            ctx.strokeStyle = `rgba(255,80,0,${(alpha * 0.45).toFixed(2)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, r2, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Sparks
        this.sparks.forEach(s => {
            if (s.age >= s.life) return;
            const sa = 1 - s.age / s.life;
            const dist = s.speed * s.age * radar.maxRadius * 55;
            const px = sp.x + Math.cos(s.angle) * dist;
            const py = sp.y + Math.sin(s.angle) * dist;
            ctx.fillStyle = `rgba(255,215,60,${sa.toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(px, py, 1.8, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    isActive() { return this.active; }
}
