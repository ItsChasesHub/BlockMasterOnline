class SlidersMode extends GemGameCore {
    constructor() {
        super();
        this.gameMode = "SLIDERS";
        this.dragHandler = new SlidersDrag(this);
        this.updateScoreDisplay();
        this.updateBonusDisplay();
    }

    setupEventListeners() {
    }

    slideRowLeft(row) {
        const temp = this.grid[0][row];
        for (let x = 0; x < this.gridSize - 1; x++) {
            this.grid[x][row] = this.grid[x + 1][row];
            this.grid[x][row].offsetY = 0;
        }
        this.grid[this.gridSize - 1][row] = temp;
        this.grid[this.gridSize - 1][row].offsetY = 0;
    }

    slideRowRight(row) {
        const temp = this.grid[this.gridSize - 1][row];
        for (let x = this.gridSize - 1; x > 0; x--) {
            this.grid[x][row] = this.grid[x - 1][row];
            this.grid[x][row].offsetY = 0;
        }
        this.grid[0][row] = temp;
        this.grid[0][row].offsetY = 0;
    }

    slideColumnUp(col) {
        const temp = this.grid[col][0];
        for (let y = 0; y < this.gridSize - 1; y++) {
            this.grid[col][y] = this.grid[col][y + 1];
            this.grid[col][y].offsetY = 0;
        }
        this.grid[col][this.gridSize - 1] = temp;
        this.grid[col][this.gridSize - 1].offsetY = 0;
    }

    slideColumnDown(col) {
        const temp = this.grid[col][this.gridSize - 1];
        for (let y = this.gridSize - 1; y > 0; y--) {
            this.grid[col][y] = this.grid[col][y - 1];
            this.grid[col][y].offsetY = 0;
        }
        this.grid[col][0] = temp;
        this.grid[col][0].offsetY = 0;
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
        if (matches.length > 0) {
            this.gameController.playMatchSound();
        }
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

        if (this.selectedTile?.x === x && this.selectedTile?.y === y) {
            this.ctx.strokeStyle = "rgba(255,255,0,0.7)";
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

class SlidersDrag {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentTileX = 0;
        this.currentTileY = 0;
        this.dragThreshold = game.tileSize / 4;
        this.lastMoveX = 0;
        this.lastMoveY = 0;
        this.cooldown = 0;
        this.cooldownTime = 150;
        this.matchPauseTime = 1000;
        this.setupDragListeners();
    }

    setupDragListeners() {
        this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
        this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
        this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
        this.canvas.addEventListener("mouseleave", this.handleMouseUp.bind(this));
        
        this.canvas.addEventListener("touchstart", this.handleTouchStart.bind(this));
        this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this));
        this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this));
    }

    getTileCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const clientX = event.type.includes("touch") ? event.touches[0].clientX : event.clientX;
        const clientY = event.type.includes("touch") ? event.touches[0].clientY : event.clientY;

        const x = Math.floor(((clientX - rect.left) * scaleX) / this.game.tileSize);
        const y = Math.floor(((clientY - rect.top) * scaleY) / this.game.tileSize);
        
        return { x, y };
    }

    handleMouseDown(event) {
        if (this.game.isAnimating) return;
        this.startDrag(event);
    }

    handleTouchStart(event) {
        if (this.game.isAnimating) return;
        this.startDrag(event);
    }

    startDrag(event) {
        const { x, y } = this.getTileCoordinates(event);
        if (x < 0 || x >= this.game.gridSize || y < 0 || y >= this.game.gridSize) return;

        this.isDragging = true;
        this.startX = event.type.includes("touch") ? event.touches[0].clientX : event.clientX;
        this.startY = event.type.includes("touch") ? event.touches[0].clientY : event.clientY;
        this.lastMoveX = this.startX;
        this.lastMoveY = this.startY;
        this.currentTileX = x;
        this.currentTileY = y;
        this.game.selectedTile = { x, y };
        this.cooldown = 0;
    }

    handleMouseMove(event) {
        if (!this.isDragging || this.game.isAnimating) return;
        this.handleDrag(event);
    }

    handleTouchMove(event) {
        if (!this.isDragging || this.game.isAnimating) return;
        this.handleDrag(event);
    }

    handleDrag(event) {
        const currentX = event.type.includes("touch") ? event.touches[0].clientX : event.clientX;
        const currentY = event.type.includes("touch") ? event.touches[0].clientY : event.clientY;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const tileX = Math.floor(((currentX - rect.left) * scaleX) / this.game.tileSize);
        const tileY = Math.floor(((currentY - rect.top) * scaleY) / this.game.tileSize);
        
        if (tileX >= 0 && tileX < this.game.gridSize && tileY >= 0 && tileY < this.game.gridSize) {
            this.game.selectedTile = { x: tileX, y: tileY };
        }

        const dx = currentX - this.lastMoveX;
        const dy = currentY - this.lastMoveY;

        const currentTime = Date.now();
        if (currentTime < this.cooldown) return;

        let didSlide = false;

        if (Math.abs(dx) > this.dragThreshold) {
            this.game.isAnimating = true;
            if (dx > 0) {
                this.game.slideRowRight(this.currentTileY);
            } else {
                this.game.slideRowLeft(this.currentTileY);
            }
            didSlide = true;
            this.lastMoveX = currentX;
            this.cooldown = currentTime + this.cooldownTime;
        }
        else if (Math.abs(dy) > this.dragThreshold) {
            this.game.isAnimating = true;
            if (dy > 0) {
                this.game.slideColumnDown(this.currentTileX);
            } else {
                this.game.slideColumnUp(this.currentTileX);
            }
            didSlide = true;
            this.lastMoveY = currentY;
            this.cooldown = currentTime + this.cooldownTime;
        }

        if (didSlide) {
            this.afterSlide();
        }
    }

    afterSlide() {
        const matches = this.game.findMatches();
        let hasMatches = matches.length > 0;

        if (hasMatches) {
            this.game.removeMatches(matches);
            this.game.fillEmptySpaces();
            this.isDragging = false;
            this.game.selectedTile = null;

            this.cooldown = Date.now() + this.matchPauseTime;

            setTimeout(() => {
                this.game.isAnimating = false;
                const newMatches = this.game.findMatches();
                if (newMatches.length > 0) {
                    this.game.isAnimating = true;
                    this.game.removeMatches(newMatches);
                    this.game.fillEmptySpaces();
                    setTimeout(() => {
                        this.game.isAnimating = false;
                    }, this.cooldownTime);
                }
            }, this.matchPauseTime);
        } else {
            setTimeout(() => {
                this.game.isAnimating = false;
            }, this.cooldownTime);
        }
    }

    handleMouseUp(event) {
        if (!this.isDragging) return;
        this.finishDrag();
    }

    handleTouchEnd(event) {
        if (!this.isDragging) return;
        this.finishDrag();
    }

    finishDrag() {
        this.isDragging = false;
        this.game.selectedTile = null;
        this.cooldown = 0;

        const matches = this.game.findMatches();
        if (matches.length > 0) {
            this.game.isAnimating = true;
            this.game.removeMatches(matches);
            this.game.fillEmptySpaces();
            setTimeout(() => {
                this.game.isAnimating = false;
            }, this.cooldownTime);
        }
    }
}