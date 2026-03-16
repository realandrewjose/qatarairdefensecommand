export class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.money = 2000; // Increased from 1200
        this.health = 200; // Increased from 100
        this.maxHealth = 200; // Increased from 100
        this.level = 1;
        this.score = 0;
        this.interceptionsCount = 0;
        this.gameTime = 0;
        this.waveCount = 0;
        this.levelTimer = 0;
        this.levelInterval = 45;
        this.gameOver = false;
        this._moneySpent = 0;
    }

    start() { this.reset(); }

    update(deltaTime) {
        if (this.gameOver) return;
        this.gameTime += deltaTime;
        this.levelTimer += deltaTime;

        if (this.levelTimer >= this.levelInterval) {
            this.levelTimer = 0;
            this.level++;
            this.money += 300 + this.level * 50; // Increased from 150 + level * 20
        }

        // Health regeneration (0.5 health per second)
        if (this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + deltaTime * 0.5);
        }

        if (this.health <= 0) {
            this.health = 0;
            this.gameOver = true;
        }
    }

    addMoney(amount) {
        this.money += amount;
        // score is NOT tied to money — it's awarded explicitly via addScore()
    }

    // Score based on interception distance — called from Game.js with computed points
    addScore(points) {
        this.score += Math.round(points);
    }

    spendMoney(amount) {
        if (this.money >= amount) { this._moneySpent += amount; this.money -= amount; return true; }
        return false;
    }

    getMoneySpent() { return this._moneySpent; }

    damaged(damage) {
        this.health = Math.max(0, this.health - damage);
        if (this.health <= 0) this.gameOver = true;
    }

    heal(amount)  { this.health = Math.min(this.maxHealth, this.health + amount); }
    resetHealth() { this.health = this.maxHealth; }
    addInterception() { this.interceptionsCount++; }
    addWave()         { this.waveCount++; }

    getMoney()             { return this.money; }
    getHealth()            { return this.health; }
    getMaxHealth()         { return this.maxHealth; }
    getLevel()             { return this.level; }
    getScore()             { return this.score; }
    getInterceptionsCount(){ return this.interceptionsCount; }
    getWaveCount()         { return this.waveCount; }
    isGameOver()           { return this.gameOver; }
}
