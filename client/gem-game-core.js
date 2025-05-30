class GemGameCore {
    constructor() {
        console.log("Starting GemGameCore constructor...");
        this.canvas = document.getElementById("gameCanvas");
        if (!this.canvas) {
            console.error("Canvas element not found! Check your HTML for id='gameCanvas'.");
            return;
        }
        this.ctx = this.canvas.getContext("2d");
        if (!this.ctx) {
            console.error("Failed to get 2D context from canvas!");
            return;
        }

        this.gridSize = 8;
        this.tileSize = this.canvas.width / this.gridSize;
        this.score = 0;
        this.gameMode = "SIMPLE";
        this.timeLeft = 300;
        this.timerInterval = null;
        this.bonusMultiplier = 1;
        this.lastMatchTime = null;
        this.selectedTile = null;
        this.selectedGem = null;
        this.isAnimating = false;
        this.isGameActive = true;

        this.gemColors = [
            "#8B0000", "#006400", "#00008B",
            "#DAA520", "#4B0082", "#8B4513"
        ];

        this.gemStyles = this.gemColors.map((color) => this.createGemGradient(color));
        this.grid = this.createGrid();
    }

    reset() {
        this.score = 0;
        this.grid = this.createGrid();
        this.selectedTile = null;
        this.selectedGem = null;
        this.isAnimating = false;
        this.isGameActive = true;
        this.timeLeft = 300;
        this.bonusMultiplier = 1;
        this.lastMatchTime = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.updateScoreDisplay();
        this.updateTimerDisplay();
        this.updateBonusDisplay();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    createGemGradient(baseColor) {
        return {
            base: baseColor,
            highlight: this.lightenColor(baseColor, 20),
            shadow: this.darkenColor(baseColor, 20),
        };
    }

    lightenColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const B = ((num >> 8) & 0x00ff) + amt;
        const G = (num & 0x0000ff) + amt;
        return `#${(
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
            (G < 255 ? (G < 1 ? 0 : G) : 255)
        ).toString(16).slice(1)}`;
    }

    darkenColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const B = ((num >> 8) & 0x00ff) - amt;
        const G = (num & 0x0000ff) - amt;
        return `#${(
            0x1000000 +
            (R < 0 ? 0 : R) * 0x10000 +
            (B < 0 ? 0 : B) * 0x100 +
            (G < 0 ? 0 : G)
        ).toString(16).slice(1)}`;
    }

    createGrid() {
        let grid;
        do {
            grid = [];
            for (let x = 0; x < this.gridSize; x++) {
                grid[x] = [];
                for (let y = 0; y < this.gridSize; y++) {
                    grid[x][y] = this.getRandomGem();
                }
            }
        } while (this.findMatches(grid).length > 0);
        return grid;
    }

    getRandomGem() {
        return {
            style: this.gemStyles[Math.floor(Math.random() * this.gemStyles.length)],
            offsetY: 0,
            targetOffsetY: 0,
            isBomb: false,
            flashStart: null
        };
    }

    updateScoreDisplay() {
        const scoreElement = document.getElementById("score");
        if (scoreElement) {
            const roundedScore = Math.round(this.score);
            scoreElement.innerHTML = `SCORE<br>${roundedScore.toString().padStart(10, "0")}`;
        }
    }

    updateTimerDisplay() {
        const timerElement = document.getElementById("timer");
        if (timerElement) {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = Math.floor(this.timeLeft % 60);
            timerElement.innerHTML = `TIME<br>${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
    }

    updateBonusDisplay() {
        const bonusElement = document.getElementById("bonusMultiplier");
        if (bonusElement) {
            let displayMultiplier = Math.round(this.bonusMultiplier);
            bonusElement.innerHTML = `Multiplier: x${displayMultiplier}`;
            if (this.gameController) {
                this.gameController.updateHighestMultiplier(displayMultiplier);
            }
        }
    }

    findMatches(customGrid = null) {
        const gridToCheck = customGrid || this.grid;
        if (!gridToCheck) return [];
        const matches = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize - 2; x++) {
                if (
                    gridToCheck[x][y] && gridToCheck[x + 1][y] && gridToCheck[x + 2][y] &&
                    gridToCheck[x][y].style.base === gridToCheck[x + 1][y].style.base &&
                    gridToCheck[x][y].style.base === gridToCheck[x + 2][y].style.base
                ) {
                    matches.push({ x, y }, { x: x + 1, y }, { x: x + 2, y });
                }
            }
        }
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize - 2; y++) {
                if (
                    gridToCheck[x][y] && gridToCheck[x][y + 1] && gridToCheck[x][y + 2] &&
                    gridToCheck[x][y].style.base === gridToCheck[x][y + 1].style.base &&
                    gridToCheck[x][y].style.base === gridToCheck[x][y + 2].style.base
                ) {
                    matches.push({ x, y }, { x, y: y + 1 }, { x, y: y + 2 });
                }
            }
        }
        return Array.from(new Set(matches.map(m => `${m.x},${m.y}`))).map(key => {
            const [x, y] = key.split(",").map(Number);
            return { x, y };
        });
    }

    fillEmptySpaces() {
        if (!this.grid) return;
        const columnsToFill = new Set();
        for (let x = 0; x < this.gridSize; x++) {
            let writeIndex = this.gridSize - 1;
            for (let y = this.gridSize - 1; y >= 0; y--) {
                if (this.grid[x][y] !== null) {
                    this.grid[x][writeIndex] = this.grid[x][y];
                    const fallDistance = writeIndex - y;
                    if (fallDistance > 0) {
                        this.grid[x][writeIndex].targetOffsetY = 0;
                        this.grid[x][writeIndex].offsetY = -fallDistance * this.tileSize;
                        columnsToFill.add(x);
                    }
                    writeIndex--;
                }
            }
            while (writeIndex >= 0) {
                const newGem = this.getRandomGem();
                newGem.targetOffsetY = 0;
                newGem.offsetY = -(writeIndex + 1) * this.tileSize;
                this.grid[x][writeIndex] = newGem;
                columnsToFill.add(x);
                writeIndex--;
            }
        }
        if (columnsToFill.size > 0) {
            this.isAnimating = true;
            setTimeout(() => this.isAnimating = false, 500);
        }
    }

    swapGems(x1, y1, x2, y2) {
        if (!this.grid) return;
        const temp = this.grid[x1][y1];
        this.grid[x1][y1] = this.grid[x2][y2];
        this.grid[x2][y2] = temp;
        const tempOffset = this.grid[x1][y1].offsetY;
        this.grid[x1][y1].offsetY = this.grid[x2][y2].offsetY;
        this.grid[x2][y2].offsetY = tempOffset;
    }

    isAdjacent(gem1, gem2) {
        return Math.abs(gem1.x - gem2.x) + Math.abs(gem1.y - gem2.y) === 1;
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
        if (matches.length > 0 && this.gameController) {
            this.gameController.playMatchSound();
        }
    }

    animate() {
        if (!this.isGameActive || !this.grid) return false;
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