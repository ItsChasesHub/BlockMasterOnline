class SlidersDrag {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentTileX = 0;
        this.currentTileY = 0;
        this.dragThreshold = this.game.tileSize / 4;
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
        if (this.game.gameMode !== "SLIDERS" || this.game.isAnimating) return;
        this.startDrag(event);
    }

    handleTouchStart(event) {
        if (this.game.gameMode !== "SLIDERS" || this.game.isAnimating) return;
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
        if (!this.isDragging || this.game.gameMode !== "SLIDERS" || this.game.isAnimating) return;
        this.handleDrag(event);
    }

    handleTouchMove(event) {
        if (!this.isDragging || this.game.gameMode !== "SLIDERS" || this.game.isAnimating) return;
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
        if (!this.isDragging || this.game.gameMode !== "SLIDERS") return;
        this.finishDrag();
    }

    handleTouchEnd(event) {
        if (!this.isDragging || this.game.gameMode !== "SLIDERS") return;
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

document.addEventListener("DOMContentLoaded", () => {
    const slidersDrag = new SlidersDrag(game);
});