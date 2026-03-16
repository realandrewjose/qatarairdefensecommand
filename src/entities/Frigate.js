// Qatar Naval Frigate — patrols Persian Gulf / Gulf of Bahrain
// Fires real Interceptor projectiles (VLS + C-RAM) — treated as moving batteries.

// ── Sea routing gates (around Qatar's northern peninsula tip) ─────────────────
const _G = {
    NE: { x:  0.12, y: -0.42 },  // offshore east, north of Ras Laffan
    N:  { x:  0.00, y: -0.52 },  // open water north of peninsula tip
    NW: { x: -0.14, y: -0.44 },  // Gulf of Bahrain entry from north
};

// Zone A — Persian Gulf, east of Qatar  (direct route from Al Khor)
// Zone B — Gulf of Bahrain / near Bahrain  (must round the northern tip)
// Zone C — Just north/NE of Qatar's peninsula tip (open Gulf water)
const PATROL_WAYPOINTS = [
    { x:  0.26, y: -0.32, route: [] },          // Zone A — NE offshore
    { x:  0.38, y: -0.10, route: [] },          // Zone A — central Gulf
    { x:  0.30, y:  0.14, route: [] },          // Zone A — southern Gulf (clear of UAE)
    { x: -0.30, y: -0.30, route: [_G.NE, _G.N, _G.NW] }, // Zone B — Gulf of Bahrain
    { x: -0.36, y: -0.20, route: [_G.NE, _G.N, _G.NW] }, // Zone B — near Bahrain
    { x: -0.32, y: -0.38, route: [_G.NE, _G.N, _G.NW] }, // Zone B — northern GoB
    { x:  0.07, y: -0.44, route: [] },          // Zone C — north of peninsula tip
    { x:  0.15, y: -0.41, route: [] },          // Zone C — NE of peninsula tip
];

// ── Land-avoidance helper ─────────────────────────────────────────────────────
// Returns false if (x,y) is on land (Qatar, Saudi, Bahrain, UAE).
// Saudi east coast is close — only ~0.10 world units west of Qatar's west coast
// at southern latitudes, widening to ~0.25 at northern latitudes.
function _isInSea(x, y) {
    // Qatar landmass
    if (x > -0.19 && x < 0.17 && y > -0.31 && y < 0.23) return false;

    // Saudi eastern coast — narrows the further south you go.
    // Approximated as a diagonal: boundary_x = -0.20 - 0.08 * (y / 0.30)
    const saudiBoundary = -0.20 - Math.max(0, y) * 0.27;
    if (x < saudiBoundary) return false;

    // Bahrain island cluster (NW of Qatar)
    if (x < -0.42 && x > -0.56 && y > -0.36 && y < -0.14) return false;

    // UAE coast (SE corner)
    if (x > 0.15 && y > 0.22) return false;

    return true;
}

// ── Frigate ───────────────────────────────────────────────────────────────────
export class Frigate {
    constructor(id, baseX, baseY, waypointIdx = 0) {
        this.id         = id;
        this.callsign   = `QN-${id}`;
        this.type       = 'frigate';
        this.isFriendly = true;
        this.reward     = 0;

        this.x = baseX;  this.y = baseY;
        this.baseX = baseX;  this.baseY = baseY;

        this.speed    = 0.055;
        this.heading  = 0;
        this.age      = 0;
        this.lifetime = 300;      // 5-minute deployment
        this.ammo     = 24;       // VLS rounds
        this.state    = 'deploying';

        this.engageCooldown = 0;   this.engageInterval = 3.0;  // VLS fire rate
        this.cramCooldown   = 0;   this.cramInterval   = 0.9;  // C-RAM fire rate
        this.cramRange      = 0.167;   // ≈ 50 km
        this.vlsRange       = 0.500;   // ≈ 150 km

        // Launch callback — wired by Game.js to spawn real Interceptor entities
        this._launchCallback = null;

        // Visual launch flashes [{ age, maxAge, isCram }]
        this._flashes = [];

        this.active   = true;
        this.trail    = [];
        this.maxTrail = 22;

        this._wpIdx       = waypointIdx % PATROL_WAYPOINTS.length;
        this._wp          = PATROL_WAYPOINTS[this._wpIdx];
        this._deployRoute = [...this._wp.route, this._wp];
        this._deployIdx   = 0;
        this._returnRoute = [...this._wp.route].reverse();
        this._returnIdx   = 0;
    }

    /** Game.js wires this to create an Interceptor at (fromX,fromY) targeting `target`. */
    onLaunch(cb) { this._launchCallback = cb; }

    update(deltaTime, missiles) {
        if (!this.active) return;
        this.age += deltaTime;
        this.engageCooldown = Math.max(0, this.engageCooldown - deltaTime);
        this.cramCooldown   = Math.max(0, this.cramCooldown   - deltaTime);
        this._flashes = this._flashes
            .map(f => ({ ...f, age: f.age + deltaTime }))
            .filter(f => f.age < f.maxAge);

        // ── Routing / state ──────────────────────────────────────────────────
        if (this.state === 'deploying') {
            const goal = this._deployRoute[this._deployIdx];
            if (goal) {
                const dx = goal.x - this.x, dy = goal.y - this.y;
                if (Math.sqrt(dx*dx + dy*dy) < 0.05) this._deployIdx++;
            }
            if (this._deployIdx >= this._deployRoute.length) this.state = 'hunting';
        }

        if (this.state === 'hunting' && (this.age >= this.lifetime || this.ammo <= 0)) {
            this.state      = 'returning';
            this._returnIdx = 0;
        }

        // ── Engagement (deploying AND hunting) ───────────────────────────────
        if (this.state !== 'returning') {
            // VLS — cruise / antiship within 150 km
            if (this.engageCooldown <= 0 && this.ammo > 0) {
                const tgt = this._findTarget(missiles, false);
                if (tgt) this._fire(tgt, false);
            }
            // C-RAM — drone / loiter within 50 km
            if (this.cramCooldown <= 0) {
                const tgt = this._findTarget(missiles, true);
                if (tgt) this._fire(tgt, true);
            }
        }

        // ── Movement ─────────────────────────────────────────────────────────
        let targetX, targetY;

        if (this.state === 'returning') {
            const gate = this._returnRoute[this._returnIdx];
            if (gate) {
                const dx = gate.x - this.x, dy = gate.y - this.y;
                if (Math.sqrt(dx*dx + dy*dy) < 0.05) this._returnIdx++;
                targetX = gate.x;  targetY = gate.y;
            } else {
                targetX = this.baseX;  targetY = this.baseY;
                const dx = targetX - this.x, dy = targetY - this.y;
                if (Math.sqrt(dx*dx + dy*dy) < 0.04) { this.active = false; return; }
            }
        } else if (this.state === 'deploying') {
            const goal = this._deployRoute[this._deployIdx] ?? this._wp;
            targetX = goal.x;  targetY = goal.y;
        } else {
            // Hunting — small orbit around waypoint, sea-clamped
            const ang = this.age * 0.18 + this.id * 1.2;
            const r   = 0.04;
            const ox  = this._wp.x + Math.cos(ang) * r;
            const oy  = this._wp.y + Math.sin(ang) * r;
            targetX   = _isInSea(ox, oy) ? ox : this._wp.x;
            targetY   = _isInSea(ox, oy) ? oy : this._wp.y;
        }

        const dx = targetX - this.x, dy = targetY - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0.003) {
            this.heading = Math.atan2(dy, dx);
            const step   = Math.min(this.speed * deltaTime, dist);
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
        }
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();
    }

    _findTarget(missiles, cramOnly) {
        const CRAM_TYPES  = new Set(['drone', 'loiter']);
        const VLS_TYPES   = new Set(['cruise', 'antiship']);
        const range = cramOnly ? this.cramRange : this.vlsRange;
        let best = null, bestScore = -Infinity;
        for (const m of missiles) {
            if (!m.isActive()) continue;
            if (m.isFriendly) continue;
            const eligible = cramOnly ? CRAM_TYPES.has(m.type) : VLS_TYPES.has(m.type);
            if (!eligible) continue;
            const dx = m.x - this.x, dy = m.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > range) continue;
            const score = (m.progress ?? 0) * 2 - dist * 3;
            if (score > bestScore) { bestScore = score; best = m; }
        }
        return best;
    }

    _fire(target, isCram) {
        if (isCram) {
            this.cramCooldown = this.cramInterval;
        } else {
            this.ammo--;
            this.engageCooldown = this.engageInterval;
        }
        // Request a real Interceptor from Game.js
        this._launchCallback?.({
            fromX: this.x, fromY: this.y,
            target,
            isCram,
            callsign: this.callsign,
        });
        // Visual: muzzle flash at ship
        this._flashes.push({ age: 0, maxAge: 0.25, isCram });
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    draw(ctx, radar) {
        if (!this.active) return;
        const sp = radar.worldToScreen(this.x, this.y);

        // Wake trail
        for (let i = 0; i < this.trail.length - 1; i++) {
            const alpha = (i / this.trail.length) * 0.40;
            const tp = radar.worldToScreen(this.trail[i].x, this.trail[i].y);
            ctx.fillStyle = `rgba(100,200,255,${alpha})`;
            ctx.beginPath(); ctx.arc(tp.x, tp.y, 1.8, 0, Math.PI * 2); ctx.fill();
        }

        // Radar glow
        const glow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 22);
        glow.addColorStop(0, 'rgba(0,180,255,0.28)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 22, 0, Math.PI * 2); ctx.fill();

        // Muzzle flashes
        for (const f of this._flashes) {
            const a = (1 - f.age / f.maxAge);
            const r = f.isCram ? 10 : 15;
            const col = f.isCram ? `rgba(255,140,0,${a.toFixed(2)})` : `rgba(255,240,120,${a.toFixed(2)})`;
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(sp.x, sp.y, r * a, 0, Math.PI * 2); ctx.fill();
        }

        // Ship body
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(this.heading);
        ctx.fillStyle = '#44aaff';  ctx.strokeStyle = '#0066cc';  ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(5, 3.5);  ctx.lineTo(-10, 3.5);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-10, -3.5);  ctx.lineTo(5, -3.5);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#88ccff';  ctx.fillRect(-4, -2, 8, 4);
        ctx.strokeStyle = '#fff';  ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(2, -6); ctx.stroke();
        ctx.restore();

        // Range rings
        if (this.state !== 'returning') {
            ctx.save();
            const cramPx = radar.worldToScreen(this.x + this.cramRange, this.y).x - sp.x;
            const vlsPx  = radar.worldToScreen(this.x + this.vlsRange,  this.y).x - sp.x;
            ctx.setLineDash([3, 5]);
            ctx.strokeStyle = 'rgba(255,120,30,0.30)';  ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(sp.x, sp.y, cramPx, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([5, 8]);
            ctx.strokeStyle = 'rgba(0,160,255,0.14)';  ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(sp.x, sp.y, vlsPx,  0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        // Labels
        ctx.fillStyle = '#44aaff';
        ctx.font = 'bold 7px monospace';  ctx.textAlign = 'left';
        ctx.fillText(this.callsign, sp.x + 14, sp.y - 3);
        ctx.fillStyle = this.ammo > 6 ? '#44aaff' : '#ff8800';
        ctx.font = '6px monospace';
        ctx.fillText(`VLS:${this.ammo}`, sp.x + 14, sp.y + 5);
        if (this.state === 'returning') {
            ctx.fillStyle = '#ff8800';
            ctx.fillText('RTB', sp.x + 14, sp.y + 12);
        }
    }

    isActive() { return this.active; }
}
