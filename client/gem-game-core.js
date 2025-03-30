class GemGameCore {
    constructor() {
        console.log("Starting GemGame constructor...");
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

        this.gemColors = [
            "#8B0000", "#006400", "#00008B", 
            "#DAA520", "#4B0082", "#8B4513"
        ];

        this.gemStyles = this.gemColors.map((color) => this.createGemGradient(color));
        this.grid = this.createGrid();

        this.setupEventListeners();
        this.updateScoreDisplay();
        this.updateTimerDisplay();
        this.updateBonusDisplay();
        this.fetchLeaderboard();
        this.highlightButton("simpleBtn");
    }

    setupEventListeners() {
        const buttons = {
            newGameBtn: () => this.startNewGame(),
            simpleBtn: () => { this.setMode("SIMPLE"); this.highlightButton("simpleBtn"); },
            timedBtn: () => { this.setMode("TIMED"); this.highlightButton("timedBtn"); },
            explosionsBtn: () => { this.setMode("EXPLOSIONS"); this.highlightButton("explosionsBtn"); },
            slidersBtn: () => { this.setMode("SLIDERS"); this.highlightButton("slidersBtn"); },
            endGameBtn: () => this.endGameWithName(),
            discardGameBtn: () => this.discardGame()
        };

        for (const [id, handler] of Object.entries(buttons)) {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener("click", handler);
            else console.error(`${id} not found!`);
        }

        this.canvas.addEventListener("click", this.handleClick.bind(this));
    }

    highlightButton(buttonId) {
        console.log("Highlighting button:", buttonId);
        const buttons = ["simpleBtn", "timedBtn", "explosionsBtn", "slidersBtn"];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.classList.remove("active");
        });
        const targetBtn = document.getElementById(buttonId);
        if (targetBtn) targetBtn.classList.add("active");
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
            isExplosive: false,
            explosionType: null
        };
    }

    updateScoreDisplay() {
        const scoreElement = document.getElementById("score");
        if (scoreElement) {
            const roundedScore = Math.round(this.score);
            scoreElement.innerHTML = `SCORE<br>${roundedScore.toString().padStart(8, "0")}`;
        }
    }

    updateTimerDisplay() {
        const timerElement = document.getElementById("timer");
        if (timerElement) {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = Math.floor(this.timeLeft % 60);
            timerElement.innerHTML = `TIME<br>${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
            if (this.timeLeft <= 0 && this.gameMode === "TIMED") this.endGame();
        }
    }

    updateBonusDisplay() {
        const bonusElement = document.getElementById("bonusMultiplier");
        if (bonusElement) {
            let displayMultiplier = Math.round(this.bonusMultiplier);
            bonusElement.innerHTML = `Multiplier: x${displayMultiplier}`;
        }
    }
}