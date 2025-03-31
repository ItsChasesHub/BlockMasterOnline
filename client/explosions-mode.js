class ExplosionsMode extends GemGameCore {
    constructor() {
        super();
        this.gameMode = "EXPLOSIONS";
        this.lastBombExplosionTime = 0;
        this.setupEventListeners();
        this.updateScoreDisplay();
        this.updateBonusDisplay();
        for (let i = 0; i < 2; i++) {
            this.spawnRandomBomb();
        }
    }

    setupEventListeners() {
        this.canvas.addEventListener("click", this.handleClick.bind(this));
    }

    handleClick(event) {
        if (this.isAnimating) return;
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = Math.floor((clickX * scaleX) / this.tileSize);
        const y = Math.floor((clickY * scaleY) / this.tileSize);

        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;

        if (!this.selectedGem) {
            this.selectedGem = { x, y };
        } else if (this.isAdjacent(this.selectedGem, { x, y })) {
            const origX1 = this.selectedGem.x;
            const origY1 = this.selectedGem.y;
            this.swapGems(origX1, origY1, x, y);
            const matches = this.findMatches();
            if (matches.length === 0) {
                setTimeout(() => this.swapGems(origX1, origY1, x, y), 200);
            } else {
                this.isAnimating = true;
                this.removeMatches(matches);
                setTimeout(() => this.isAnimating = false, 500);
            }
            this.selectedGem = null;
        } else {
            this.selectedGem = { x, y };
        }
    }

    spawnRandomBomb() {
        const x = Math.floor(Math.random() * this.gridSize);
        const y = Math.floor(Math.random() * this.gridSize);
        if (this.grid[x][y] && !this.grid[x][y].isBomb) {
            this.grid[x][y].isBomb = true;
            this.grid[x][y].flashStart = Date.now();
            console.log(`Spawned bomb at (${x}, ${y})`);
        }
    }

    explodeBomb(x, y) {
        console.log(`Bomb exploding at (${x}, ${y})`);
        let bombMatches = [{ x, y }];
        this.addBombMatches({ x, y }, bombMatches);
        bombMatches.forEach(({ x: bx, y: by }) => {
            if (this.grid[bx][by]) {
                this.grid[bx][by] = null;
                this.score += 20 * this.bonusMultiplier;
            }
        });
        this.isAnimating = true;
        setTimeout(() => this.isAnimating = false, 500);
        this.updateScoreDisplay();
        this.updateBonusDisplay();
    }

    addBombMatches(match, bombMatches) {
        const { x, y } = match;
        const directions = [
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
        ];
        
        directions.forEach(dir => {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            if (newX >= 0 && newX < this.gridSize && newY >= 0 && newY < this.gridSize) {
                bombMatches.push({ x: newX, y: newY });
            }
        });
    }

    removeMatches(matches) {
        const currentTime = Date.now();
        if (this.lastMatchTime && currentTime - this.lastMatchTime <= 5000) this.bonusMultiplier += 1;
        this.lastMatchTime = currentTime;

        let bombMatches = [...matches];
        let bombTriggered = false;

        matches.forEach(match => {
            if (this.grid[match.x][match.y]?.isBomb) {
                bombTriggered = true;
                this.addBombMatches(match, bombMatches);
            }
        });

        matches.forEach(match => {
            if (matches.length >= 4 && Math.random() < 0.3) {
                if (this.grid[match.x][match.y] && !this.grid[match.x][match.y].isBomb) {
                    this.grid[match.x][match.y].isBomb = true;
                    this.grid[match.x][match.y].flashStart = Date.now();
                    console.log(`Created bomb from match at (${match.x}, ${match.y})`);
                }
            }
        });

        bombMatches.forEach(({ x, y }) => {
            if (this.grid[x][y]) {
                this.grid[x][y] = null;
                this.score += (bombTriggered ? 20 : 10) * this.bonusMultiplier;
            }
        });

        this.updateScoreDisplay();
        this.updateBonusDisplay();
        this.fillEmptySpaces();
    }

    drawGem(x, y, gem) {
        const centerX = x * this.tileSize + this.tileSize / 2;
        const centerY = y * this.tileSize + this.tileSize / 2 + gem.offsetY;

        if (gem.isBomb) {
            let flashColor = "#000000";
            if (gem.flashStart) {
                const flashTime = Date.now() - gem.flashStart;
                const flashCycle = Math.sin(flashTime * 0.01) > 0 ? "#FFFFFF" : "#000000";
                flashColor = flashCycle;
                if (flashTime > 5000) {
                    this.explodeBomb(x, y);
                    return;
                }
            }

            this.ctx.fillStyle = flashColor;
            this.ctx.beginPath();
            this.ctx.roundRect(x * this.tileSize + 2, y * this.tileSize + 2 + gem.offsetY, 
                this.tileSize - 6, this.tileSize - 6, 10);
            this.ctx.fill();

            this.ctx.fillStyle = "#FF4500";
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY - this.tileSize/4, 4, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            const gradient = this.ctx.createLinearGradient(
                x * this.tileSize, y * this.tileSize,
                x * this.tileSize + this.tileSize, y * this.tileSize + this.tileSize
            );
            gradient.addColorStop(0, gem.style.highlight);
            gradient.addColorStop(0.5, gem.style.base);
            gradient.addColorStop(1, gem.style.shadow);

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.roundRect(x * this.tileSize + 2, y * this.tileSize + 2 + gem.offsetY, 
                this.tileSize - 6, this.tileSize - 6, 10);
            this.ctx.fill();
        }

        if (this.selectedGem?.x === x && this.selectedGem?.y === y) {
            this.ctx.strokeStyle = "rgba(255,255,255,0.7)";
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        let isAnimating = false;

        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const gem = this.grid[x][y];
                if (!gem) continue;

                if (gem.offsetY !== gem.targetOffsetY) {
                    isAnimating = true;
                    gem.offsetY += (gem.targetOffsetY - gem.offsetY) * 0.3;
                    if (Math.abs(gem.targetOffsetY - gem.offsetY) < 0.1) gem.offsetY = gem.targetOffsetY;
                }
                this.drawGem(x, y, gem);
            }
        }

        if (!isAnimating && !this.isAnimating) {
            this.fillEmptySpaces();
            const matches = this.findMatches();
            if (matches.length > 0) this.removeMatches(matches);

            const currentTime = Date.now();
            if (currentTime - this.lastBombExplosionTime >= 15000) {
                const bombCount = Math.floor(Math.random() * 2) + 1;
                for (let i = 0; i < bombCount; i++) {
                    this.spawnRandomBomb();
                }
                this.lastBombExplosionTime = currentTime;
            }
        }

        if (this.lastMatchTime && Date.now() - this.lastMatchTime > 5000 && this.bonusMultiplier > 1) {
            this.bonusMultiplier = 1;
            this.updateBonusDisplay();
        }

        return isAnimating;
    }
}