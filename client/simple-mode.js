class SimpleMode extends GemGameCore {
    constructor() {
        super();
        this.gameMode = "SIMPLE";
        this.setupEventListeners();
        this.updateScoreDisplay();
        this.updateBonusDisplay();
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
            const origX1 = this.selectedGem.x, origY1 = this.selectedGem.y;
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
        }
    }

    removeMatches(matches) {
        const currentTime = Date.now();
        if (this.lastMatchTime && currentTime - this.lastMatchTime <= 5000) this.bonusMultiplier += 1;
        this.lastMatchTime = currentTime;

        matches.forEach(({ x, y }) => {
            if (this.grid[x][y]) {
                this.grid[x][y] = null;
                this.score += 10 * this.bonusMultiplier;
            }
        });

        this.updateScoreDisplay();
        this.updateBonusDisplay();
        this.fillEmptySpaces();
    }

    drawGem(x, y, gem) {
        const centerX = x * this.tileSize + this.tileSize / 2;
        const centerY = y * this.tileSize + this.tileSize / 2 + gem.offsetY;

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
        }

        if (this.lastMatchTime && Date.now() - this.lastMatchTime > 5000 && this.bonusMultiplier > 1) {
            this.bonusMultiplier = 1;
            this.updateBonusDisplay();
        }

        return isAnimating;
    }
}