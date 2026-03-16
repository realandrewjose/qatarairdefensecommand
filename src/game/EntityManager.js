import { Explosion } from '../entities/Explosion.js';

export class EntityManager {
    constructor() {
        this.missiles        = [];
        this.interceptors    = [];
        this.explosions      = [];
        this.fighterJets     = [];
        this.hornetDrones    = [];
        this.frigates        = [];
        this.bombers         = [];
        this.enemyFighters   = [];
        this.civilianAircraft = [];
        this.radarGhosts     = [];
        this.powerups        = [];
        this.radar           = null;
    }

    update(deltaTime, killEvents = [], impactEvents = []) {
        // Missiles
        const nextMissiles = [];
        for (const m of this.missiles) {
            m.update(deltaTime);
            if (!m.isActive()) {
                if (m.reachedTarget) {
                    let damage = m.damage, targetName = m.targetName;
                    if (this.radar) {
                        const crit = this.radar.getCriticalTargetsAtRisk(m);
                        if (crit.length > 0) {
                            damage = Math.round(m.damage * (crit[0].weight / 5.0));
                            targetName = crit[0].name;
                        }
                    }
                    impactEvents.push({ damage, missileType: m.type, targetName, x: m.targetX, y: m.targetY });
                    this.explosions.push(new Explosion(m.targetX, m.targetY, 'impact', m.color));
                }
                m.targeted = false;
            } else {
                nextMissiles.push(m);
            }
        }
        this.missiles = nextMissiles;

        // Bombers
        this.bombers = this.bombers.filter(b => {
            b.update(deltaTime);
            return b.isActive();
        });

        // Enemy fighters
        this.enemyFighters = this.enemyFighters.filter(f => {
            f.update(deltaTime);
            return f.isActive();
        });

        // Interceptors — hornets re-assign targets each frame before update
        const nextInterceptors = [];
        for (const ic of this.interceptors) {
            // Loitering hornet: find a drone/loiter target if it has none
            if (ic.isLoitering && (!ic.targetMissile || !ic.targetMissile.isActive())) {
                let best = null, bestDist = 0.40;
                for (const m of this.missiles) {
                    if (!m.isActive() || m.targeted) continue;
                    if (m.type !== 'drone' && m.type !== 'loiter') continue;
                    const dx = m.x - ic.x, dy = m.y - ic.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < bestDist) { bestDist = d; best = m; }
                }
                if (best) { ic.targetMissile = best; best.targeted = true; }
            }

            ic.update(deltaTime);

            if (ic.isLoitering) {
                if (ic.killedTarget && ic._killedMissile) {
                    const m = ic._killedMissile;
                    killEvents.push({ reward: m.reward, missileType: m.type, x: ic.x, y: ic.y });
                    this.explosions.push(new Explosion(ic.x, ic.y, 'intercept', ic.color));
                    const idx = this.missiles.indexOf(m);
                    if (idx !== -1) this.missiles.splice(idx, 1);
                    ic.killedTarget = false;
                    ic._killedMissile = null;
                }
                if (ic.isActive()) nextInterceptors.push(ic);
            } else if (!ic.isActive()) {
                if (ic.killedTarget && ic.targetMissile) {
                    const tgt = ic.targetMissile;
                    // Bomber/EnemyFighter: dealt damage via damage() — credit kill only if destroyed
                    if (typeof tgt.damage === 'function') {
                        if (!tgt.isActive()) {
                            killEvents.push({ reward: tgt.reward, missileType: tgt.type, x: ic.x, y: ic.y });
                            this.explosions.push(new Explosion(ic.x, ic.y, 'intercept', '#ffcc44'));
                        } else {
                            // Just a hit — small explosion to show impact
                            this.explosions.push(new Explosion(ic.x, ic.y, 'intercept', ic.color));
                        }
                    } else if (tgt.isCivilian) {
                        // Civilian airliner hit — trigger incident callback, no kill reward
                        tgt.onIntercepted?.();
                        const cidx = this.civilianAircraft.indexOf(tgt);
                        if (cidx !== -1) this.civilianAircraft.splice(cidx, 1);
                        this.explosions.push(new Explosion(ic.x, ic.y, 'impact', '#ff4444'));
                    } else {
                        // Normal missile kill
                        if (!tgt.isGhost) {
                            killEvents.push({ reward: tgt.reward, missileType: tgt.type, x: ic.x, y: ic.y });
                            this.explosions.push(new Explosion(ic.x, ic.y, 'intercept', ic.color));
                        }
                        const idx = this.missiles.indexOf(tgt);
                        if (idx !== -1) this.missiles.splice(idx, 1);
                        const gidx = this.radarGhosts.indexOf(tgt);
                        if (gidx !== -1) this.radarGhosts.splice(gidx, 1);
                    }
                }
            } else {
                nextInterceptors.push(ic);
            }
        }
        this.interceptors = nextInterceptors;

        // Fighter jets (target missiles + bombers + enemy fighters)
        const allTargets = [...this.missiles, ...this.bombers, ...this.enemyFighters];
        this.fighterJets = this.fighterJets.filter(jet => {
            jet.update(deltaTime, allTargets);
            return jet.isActive();
        });

        // Hornet drones (target drones + loiter only)
        this.hornetDrones = this.hornetDrones.filter(uav => {
            uav.update(deltaTime, this.missiles);
            if (!uav.isActive()) return false;
            return true;
        });

        // Frigates (naval — target cruise/anti-ship/ballistic/drone; not hypersonic)
        this.frigates = this.frigates.filter(f => {
            f.update(deltaTime, this.missiles);
            return f.isActive();
        });

        // Explosions
        this.explosions = this.explosions.filter(e => {
            e.update(deltaTime);
            return e.isActive();
        });

        // Civilian aircraft
        this.civilianAircraft = this.civilianAircraft.filter(c => { c.update(deltaTime); return c.isActive(); });
        // Radar ghosts
        this.radarGhosts = this.radarGhosts.filter(g => { g.update(deltaTime); return g.isActive(); });
        // Powerups
        this.powerups = this.powerups.filter(p => { p.update(deltaTime); return p.isActive(); });
    }

    draw(ctx, radar) {
        this.civilianAircraft.forEach(c => c.draw(ctx, radar));
        this.radarGhosts.forEach(g => g.draw(ctx, radar));
        this.bombers.forEach(b => b.draw(ctx, radar));
        this.enemyFighters.forEach(f => f.draw(ctx, radar));
        this.missiles.forEach(m => m.draw(ctx, radar));
        this.interceptors.forEach(ic => ic.draw(ctx, radar));
        this.fighterJets.forEach(jet => jet.draw(ctx, radar));
        this.hornetDrones.forEach(uav => uav.draw(ctx, radar));
        this.frigates.forEach(f => f.draw(ctx, radar));
        this.explosions.forEach(e => e.draw(ctx, radar));
        this.powerups.forEach(p => p.draw(ctx, radar));  // drawn on top
    }

    addMissile(m)          { this.missiles.push(m); }
    addInterceptor(ic)     { this.interceptors.push(ic); }
    addExplosion(e)        { this.explosions.push(e); }
    addFighterJet(jet)     { this.fighterJets.push(jet); }
    addHornetDrone(uav)    { this.hornetDrones.push(uav); }
    addFrigate(f)          { this.frigates.push(f); }
    addBomber(b)           { this.bombers.push(b); }
    addEnemyFighter(f)     { this.enemyFighters.push(f); }
    addCivilian(c)         { this.civilianAircraft.push(c); }
    addGhost(g)            { this.radarGhosts.push(g); }
    addPowerup(p)          { this.powerups.push(p); }
    clearGhosts()          { this.radarGhosts = []; }

    removeMissile(m) {
        const i = this.missiles.indexOf(m);
        if (i !== -1) this.missiles.splice(i, 1);
    }

    getMissiles()          { return this.missiles; }
    getInterceptors()      { return this.interceptors; }
    getFighterJets()       { return this.fighterJets; }
    getHornetDrones()      { return this.hornetDrones; }
    getFrigates()          { return this.frigates; }
    getBombers()           { return this.bombers; }
    getEnemyFighters()     { return this.enemyFighters; }
    getCivilians()         { return this.civilianAircraft; }
    getRadarGhosts()       { return this.radarGhosts; }
    getPowerups()          { return this.powerups; }

    countMissiles()        { return this.missiles.length; }
    countInterceptors()    { return this.interceptors.length; }
    countFighterJets()     { return this.fighterJets.length; }
    countHornetDrones()    { return this.hornetDrones.length; }
    countFrigates()        { return this.frigates.length; }
    countBombers()         { return this.bombers.length; }
    countEnemyFighters()   { return this.enemyFighters.length; }
    countCivilians()       { return this.civilianAircraft.length; }

    clear() {
        this.missiles         = [];
        this.interceptors     = [];
        this.explosions       = [];
        this.fighterJets      = [];
        this.hornetDrones     = [];
        this.frigates         = [];
        this.bombers          = [];
        this.enemyFighters    = [];
        this.civilianAircraft = [];
        this.radarGhosts      = [];
        this.powerups         = [];
    }
}
