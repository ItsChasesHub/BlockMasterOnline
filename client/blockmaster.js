class GemGame {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");

        this.gridSize = 8;
        this.tileSize = this.canvas.width / this.gridSize;
        this.score = 0;
        this.gameMode = "SIMPLE";
        this.timeLeft = 300; // 5 minutes for TIMED mode
        this.timerInterval = null;
        this.bonusMultiplier = 1;
        this.lastMatchTime = null;

        this.gemColors = [
            "#8B0000", // Dark Red
            "#006400", // Dark Green
            "#00008B", // Dark Blue
            "#DAA520", // Goldenrod
            "#4B0082", // Indigo
            "#8B4513", // Saddle Brown
        ];

        this.gemStyles = this.gemColors.map((color) =>
            this.createGemGradient(color)
        );

        this.grid = this.createGrid();
        this.selectedGem = null;
        this.isAnimating = false;

        // Event listeners for buttons
        document
            .getElementById("newGameBtn")
            .addEventListener("click", () => this.startNewGame());
        document
            .getElementById("simpleBtn")
            .addEventListener("click", () => {
                this.setMode("SIMPLE");
                this.highlightButton("simpleBtn");
            });
        document
            .getElementById("timedBtn")
            .addEventListener("click", () => {
                this.setMode("TIMED");
                this.highlightButton("timedBtn");
            });
        document
            .getElementById("explosionsBtn")
            .addEventListener("click", () => {
                this.setMode("EXPLOSIONS");
                this.highlightButton("explosionsBtn");
            });
        document
            .getElementById("endGameBtn")
            .addEventListener("click", () => this.endGameWithName());

        this.canvas.addEventListener("click", this.handleClick.bind(this));
        this.updateScoreDisplay();
        this.updateTimerDisplay();
        this.updateBonusDisplay();
        this.fetchLeaderboard(); // Fetch leaderboard on initialization
        
        // Set initial highlight
        this.highlightButton("simpleBtn");
        
        this.animate();
    }

    highlightButton(buttonId) {
        const buttons = ["simpleBtn", "timedBtn", "explosionsBtn"];
        buttons.forEach(id => {
            document.getElementById(id).classList.remove("active");
        });
        document.getElementById(buttonId).classList.add("active");
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
        )
            .toString(16)
            .slice(1)}`;
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
        )
            .toString(16)
            .slice(1)}`;
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

    drawGem(x, y, gem) {
        const size = this.tileSize - 6;
        const centerX = x * this.tileSize + this.tileSize / 2;
        const centerY = y * this.tileSize + this.tileSize / 2 + gem.offsetY;

        const gradient = this.ctx.createLinearGradient(
            x * this.tileSize,
            y * this.tileSize,
            x * this.tileSize + this.tileSize,
            y * this.tileSize + this.tileSize
        );
        gradient.addColorStop(0, gem.style.highlight);
        gradient.addColorStop(0.5, gem.style.base);
        gradient.addColorStop(1, gem.style.shadow);

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.roundRect(
            x * this.tileSize + 2,
            y * this.tileSize + 2 + gem.offsetY,
            this.tileSize - 6,
            this.tileSize - 6,
            10
        );
        this.ctx.fill();

        if (gem.isExplosive) {
            this.ctx.fillStyle = "white";
            this.ctx.font = "bold 20px Arial";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText("✹", centerX, centerY);
        }

        if (
            this.selectedGem &&
            this.selectedGem.x === x &&
            this.selectedGem.y === y
        ) {
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
                    if (Math.abs(gem.targetOffsetY - gem.offsetY) < 0.1) {
                        gem.offsetY = gem.targetOffsetY;
                    }
                }

                this.drawGem(x, y, gem);
            }
        }

        if (!isAnimating && !this.isAnimating) {
            this.fillEmptySpaces();
            const matches = this.findMatches();
            if (matches.length > 0) {
                this.removeMatches(matches);
            }
        }

        requestAnimationFrame(() => this.animate());
    }

    fillEmptySpaces() {
        const columnsToFill = new Set();

        for (let x = 0; x < this.gridSize; x++) {
            let writeIndex = this.gridSize - 1;
            for (let y = this.gridSize - 1; y >= 0; y--) {
                if (this.grid[x][y] !== null) {
                    this.grid[x][writeIndex] = this.grid[x][y];
                    const fallDistance = writeIndex - y;
                    if (fallDistance > 0) {
                        this.grid[x][writeIndex].targetOffsetY = 0;
                        this.grid[x][writeIndex].offsetY =
                            -fallDistance * this.tileSize;
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
            setTimeout(() => {
                this.isAnimating = false;
            }, 500);
        }
    }

    handleClick(event) {
        if (
            this.isAnimating ||
            (this.gameMode === "TIMED" && this.timeLeft <= 0)
        )
            return;

        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = Math.floor((clickX * scaleX) / this.tileSize);
        const y = Math.floor((clickY * scaleY) / this.tileSize);

        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize)
            return;

        if (!this.selectedGem) {
            this.selectedGem = { x, y };
        } else {
            if (this.isAdjacent(this.selectedGem, { x, y })) {
                const origX1 = this.selectedGem.x;
                const origY1 = this.selectedGem.y;
                const origX2 = x;
                const origY2 = y;

                this.swapGems(origX1, origY1, origX2, origY2);
                const matches = this.findMatches();
                if (matches.length === 0) {
                    setTimeout(() => {
                        this.swapGems(origX1, origY1, origX2, origY2);
                    }, 200);
                } else {
                    this.isAnimating = true;
                    this.removeMatches(matches);
                    setTimeout(() => {
                        this.isAnimating = false;
                    }, 500);
                }
            }
            this.selectedGem = null;
        }
    }

    isAdjacent(gem1, gem2) {
        return Math.abs(gem1.x - gem2.x) + Math.abs(gem1.y - gem2.y) === 1;
    }

    swapGems(x1, y1, x2, y2) {
        const temp = this.grid[x1][y1];
        this.grid[x1][y1] = this.grid[x2][y2];
        this.grid[x2][y2] = temp;

        const tempOffset = this.grid[x1][y1].offsetY;
        this.grid[x1][y1].offsetY = this.grid[x2][y2].offsetY;
        this.grid[x2][y2].offsetY = tempOffset;
    }

    findMatches(customGrid = null) {
        const gridToCheck = customGrid || this.grid;
        const matches = [];

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize - 2; x++) {
                if (
                    gridToCheck[x][y] &&
                    gridToCheck[x + 1][y] &&
                    gridToCheck[x + 2][y] &&
                    gridToCheck[x][y].style.base ===
                        gridToCheck[x + 1][y].style.base &&
                    gridToCheck[x][y].style.base ===
                        gridToCheck[x + 2][y].style.base
                ) {
                    matches.push({ x, y }, { x: x + 1, y }, { x: x + 2, y });
                }
            }
        }

        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize - 2; y++) {
                if (
                    gridToCheck[x][y] &&
                    gridToCheck[x][y + 1] &&
                    gridToCheck[x][y + 2] &&
                    gridToCheck[x][y].style.base ===
                        gridToCheck[x][y + 1].style.base &&
                    gridToCheck[x][y].style.base ===
                        gridToCheck[x][y + 2].style.base
                ) {
                    matches.push({ x, y }, { x, y: y + 1 }, { x, y: y + 2 });
                }
            }
        }

        return Array.from(new Set(matches.map((m) => `${m.x},${m.y}`))).map(
            (key) => {
                const [x, y] = key.split(",").map(Number);
                return { x, y };
            }
        );
    }

    removeMatches(matches) {
        const currentTime = Date.now();
        if (this.lastMatchTime && currentTime - this.lastMatchTime <= 5000) {
            this.bonusMultiplier *= 1.75;
        } else {
            this.bonusMultiplier = 1;
        }
        this.lastMatchTime = currentTime;

        let explosionMatches = [...matches];

        if (this.gameMode === "EXPLOSIONS") {
            matches.forEach(match => {
                if (Math.random() < 0.3) {
                    this.grid[match.x][match.y].isExplosive = true;
                    const types = ['horizontal', 'vertical', 'both'];
                    this.grid[match.x][match.y].explosionType = 
                        types[Math.floor(Math.random() * types.length)];
                    
                    if (this.grid[match.x][match.y].explosionType === 'horizontal') {
                        for (let x = 0; x < this.gridSize; x++) {
                            if (x !== match.x && this.grid[x][match.y]) {
                                explosionMatches.push({ x, y: match.y });
                            }
                        }
                    } else if (this.grid[match.x][match.y].explosionType === 'vertical') {
                        for (let y = 0; y < this.gridSize; y++) {
                            if (y !== match.y && this.grid[match.x][y]) {
                                explosionMatches.push({ x: match.x, y });
                            }
                        }
                    } else {
                        for (let x = 0; x < this.gridSize; x++) {
                            if (x !== match.x && this.grid[x][match.y]) {
                                explosionMatches.push({ x, y: match.y });
                            }
                        }
                        for (let y = 0; y < this.gridSize; y++) {
                            if (y !== match.y && this.grid[match.x][y]) {
                                explosionMatches.push({ x: match.x, y });
                            }
                        }
                    }
                }
            });
        }

        explosionMatches.forEach(({ x, y }) => {
            if (this.grid[x][y]) {
                this.grid[x][y] = null;
                this.score += 10 * this.bonusMultiplier;
            }
        });

        this.updateScoreDisplay();
        this.updateBonusDisplay();
    }

    updateScoreDisplay() {
        const roundedScore = Math.round(this.score);
        document.getElementById("score").innerHTML = `SCORE<br>${roundedScore
            .toString()
            .padStart(8, "0")}`;
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = Math.floor(this.timeLeft % 60);
        document.getElementById("timer").innerHTML = `TIME<br>${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        if (this.timeLeft <= 0 && this.gameMode === "TIMED") {
            this.endGame();
        }
    }

    updateBonusDisplay() {
        let displayMultiplier = Math.round(this.bonusMultiplier);
        if (displayMultiplier > 99) displayMultiplier = 99;
        document.getElementById(
            "bonusMultiplier"
        ).innerHTML = `Multiplier: x${displayMultiplier}`;
    }

    async fetchLeaderboard() {
        try {
            const response = await fetch('http://localhost:3000/proxy/fetch-scores');
            if (!response.ok) throw new Error('Network response was not ok');
            const scores = await response.json();
            this.updateLeaderboardDisplay(scores);
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
            this.updateLeaderboardDisplay({ simple: [], timed: [], explosions: [] });
        }
    }

    async submitScore(name, score, mode) {
        try {
            const response = await fetch('http://localhost:3000/proxy/submit-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score, mode }),
            });
            if (!response.ok) throw new Error('Failed to submit score');
            await this.fetchLeaderboard(); // Refresh leaderboard after submission
        } catch (err) {
            console.error('Error submitting score:', err);
        }
    }

    updateLeaderboardDisplay(scores) {
        const simpleScores = scores.simple || [];
        const timedScores = scores.timed || [];
        const explosionsScores = scores.explosions || [];

        const simpleList = document.getElementById("simple-leaderboard");
        if (simpleList) {
            simpleList.innerHTML = "";
            simpleScores.forEach((entry, index) => {
                const entryDiv = document.createElement("div");
                entryDiv.className = "leaderboard-entry";
                entryDiv.innerHTML = `<span>${index + 1}. ${entry.name}</span><span>${entry.score}</span>`;
                simpleList.appendChild(entryDiv);
            });
        } else {
            console.error("Simple leaderboard element not found!");
        }

        const timedList = document.getElementById("timed-leaderboard");
        if (timedList) {
            timedList.innerHTML = "";
            timedScores.forEach((entry, index) => {
                const entryDiv = document.createElement("div");
                entryDiv.className = "leaderboard-entry";
                entryDiv.innerHTML = `<span>${index + 1}. ${entry.name}</span><span>${entry.score}</span>`;
                timedList.appendChild(entryDiv);
            });
        } else {
            console.error("Timed leaderboard element not found!");
        }

        const explosionsList = document.getElementById("explosions-leaderboard");
        if (explosionsList) {
            explosionsList.innerHTML = "";
            explosionsScores.forEach((entry, index) => {
                const entryDiv = document.createElement("div");
                entryDiv.className = "leaderboard-entry";
                entryDiv.innerHTML = `<span>${index + 1}. ${entry.name}</span><span>${entry.score}</span>`;
                explosionsList.appendChild(entryDiv);
            });
        } else {
            console.error("Explosions leaderboard element not found!");
        }
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.timeLeft > 0) {
                this.timeLeft -= 1;
                this.updateTimerDisplay();
            } else {
                clearInterval(this.timerInterval);
                this.endGame();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    startNewGame() {
        this.score = 0;
        this.grid = this.createGrid();
        this.selectedGem = null;
        this.isAnimating = false;
        this.timeLeft = 300;
        this.bonusMultiplier = 1;
        this.lastMatchTime = null;
        this.updateScoreDisplay();
        this.updateTimerDisplay();
        this.updateBonusDisplay();
        if (this.gameMode === "TIMED") {
            document.getElementById("timer").style.display = "block";
            this.startTimer();
        } else {
            document.getElementById("timer").style.display = "none";
            this.stopTimer();
        }
    }

    setMode(mode) {
        this.gameMode = mode;
        this.startNewGame();
    }

    endGame() {
        this.stopTimer();
        
        // For Timed mode auto-end
        let playerName = prompt("Game Over! Your score: " + Math.round(this.score) + "\nEnter your name for the leaderboard:");
        if (playerName === null || playerName.trim() === "") {
            playerName = "Anonymous";
        }
        this.submitScore(playerName.trim(), Math.round(this.score), this.gameMode);
        this.startNewGame();
    }

    endGameWithName() {
        this.stopTimer();
        
        // Prompt for player name 
        let playerName = prompt("Game Over! Your score: " + Math.round(this.score) + "\nEnter your name for the leaderboard:");
        if (playerName === null || playerName.trim() === "") {
            playerName = "Anonymous";
        }
        this.submitScore(playerName.trim(), Math.round(this.score), this.gameMode);
        this.startNewGame();
    }
}

const game = new GemGame();