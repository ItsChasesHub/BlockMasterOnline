class GemGame {
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
        this.timeLeft = 300; //5 minutes for TIMED mode
        this.timerInterval = null;
        this.bonusMultiplier = 1;
        this.lastMatchTime = null;

        this.gemColors = [
            "#8B0000", //Dark Red
            "#006400", //Dark Green
            "#00008B", //Dark Blue
            "#DAA520", //Goldenrod
            "#4B0082", //Indigo
            "#8B4513", //Saddle Brown
        ];

        this.gemStyles = this.gemColors.map((color) => this.createGemGradient(color));

        this.grid = this.createGrid();
        this.selectedGem = null;
        this.isAnimating = false;

        const newGameBtn = document.getElementById("newGameBtn");
        if (newGameBtn) {
            newGameBtn.addEventListener("click", () => this.startNewGame());
        } else {
            console.error("newGameBtn not found!");
        }

        const simpleBtn = document.getElementById("simpleBtn");
        if (simpleBtn) {
            simpleBtn.addEventListener("click", () => {
                this.setMode("SIMPLE");
                this.highlightButton("simpleBtn");
            });
        } else {
            console.error("simpleBtn not found!");
        }

        const timedBtn = document.getElementById("timedBtn");
        if (timedBtn) {
            timedBtn.addEventListener("click", () => {
                this.setMode("TIMED");
                this.highlightButton("timedBtn");
            });
        } else {
            console.error("timedBtn not found!");
        }

        const explosionsBtn = document.getElementById("explosionsBtn");
        if (explosionsBtn) {
            explosionsBtn.addEventListener("click", () => {
                this.setMode("EXPLOSIONS");
                this.highlightButton("explosionsBtn");
            });
        } else {
            console.error("explosionsBtn not found!");
        }

        const endGameBtn = document.getElementById("endGameBtn");
        if (endGameBtn) {
            endGameBtn.addEventListener("click", () => this.endGameWithName());
        } else {
            console.error("endGameBtn not found!");
        }

        const discardGameBtn = document.getElementById("discardGameBtn");
        if (discardGameBtn) {
            discardGameBtn.addEventListener("click", () => this.discardGame());
        } else {
            console.error("discardGameBtn not found!");
        }

        this.canvas.addEventListener("click", this.handleClick.bind(this));
        this.updateScoreDisplay();
        this.updateTimerDisplay();
        this.updateBonusDisplay();
        this.fetchLeaderboard();

        this.highlightButton("simpleBtn");

        this.animate();
        console.log("GemGame constructor completed.");
    }

    highlightButton(buttonId) {
        console.log("Highlighting button:", buttonId);
        const buttons = ["simpleBtn", "timedBtn", "explosionsBtn"];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.classList.remove("active");
            }
        });
        const targetBtn = document.getElementById(buttonId);
        if (targetBtn) {
            targetBtn.classList.add("active");
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

        if (this.lastMatchTime) {
            const currentTime = Date.now();
            if (currentTime - this.lastMatchTime > 5000 && this.bonusMultiplier > 1) {
                console.log("Multiplier reset to 1x due to time elapsed.");
                this.bonusMultiplier = 1;
                this.updateBonusDisplay();
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
            setTimeout(() => {
                this.isAnimating = false;
            }, 500);
        }
    }

    handleClick(event) {
        if (this.isAnimating || (this.gameMode === "TIMED" && this.timeLeft <= 0)) return;

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
                    gridToCheck[x][y] &&
                    gridToCheck[x][y + 1] &&
                    gridToCheck[x][y + 2] &&
                    gridToCheck[x][y].style.base === gridToCheck[x][y + 1].style.base &&
                    gridToCheck[x][y].style.base === gridToCheck[x][y + 2].style.base
                ) {
                    matches.push({ x, y }, { x, y: y + 1 }, { x, y: y + 2 });
                }
            }
        }

        return Array.from(new Set(matches.map((m) => `${m.x},${m.y}`))).map((key) => {
            const [x, y] = key.split(",").map(Number);
            return { x, y };
        });
    }

    removeMatches(matches) {
        const currentTime = Date.now();
        //Increment multiplier by 1 for consecutive matches within 5 seconds
        if (this.lastMatchTime && currentTime - this.lastMatchTime <= 5000) {
            this.bonusMultiplier += 1; //Increment by 1
        }
        this.lastMatchTime = currentTime;

        let explosionMatches = [...matches];

        if (this.gameMode === "EXPLOSIONS") {
            matches.forEach(match => {
                if (Math.random() < 0.3) {
                    this.grid[match.x][match.y].isExplosive = true;
                    const types = ['horizontal', 'vertical', 'both'];
                    this.grid[match.x][match.y].explosionType = types[Math.floor(Math.random() * types.length)];

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
        const scoreElement = document.getElementById("score");
        if (scoreElement) {
            const roundedScore = Math.round(this.score);
            scoreElement.innerHTML = `SCORE<br>${roundedScore.toString().padStart(8, "0")}`;
        } else {
            console.error("Score element not found!");
        }
    }

    updateTimerDisplay() {
        const timerElement = document.getElementById("timer");
        if (timerElement) {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = Math.floor(this.timeLeft % 60);
            timerElement.innerHTML = `TIME<br>${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
            if (this.timeLeft <= 0 && this.gameMode === "TIMED") {
                this.endGame();
            }
        } else {
            console.error("Timer element not found!");
        }
    }

    updateBonusDisplay() {
        const bonusElement = document.getElementById("bonusMultiplier");
        if (bonusElement) {
            let displayMultiplier = Math.round(this.bonusMultiplier);
            bonusElement.innerHTML = `Multiplier: x${displayMultiplier}`;
        } else {
            console.error("Bonus multiplier element not found!");
        }
    }

    async fetchLeaderboard() {
        console.log("Fetching leaderboard...");
        try {
            const response = await fetch('/proxy/fetch-scores');
            if (!response.ok) {
                throw new Error(`Failed to fetch leaderboard: ${response.status} ${response.statusText}`);
            }
            const scores = await response.json();
            this.updateLeaderboardDisplay(scores);
            console.log("Leaderboard fetched successfully:", scores);
        } catch (err) {
            console.error('Error fetching leaderboard:', err.message);
            this.updateLeaderboardDisplay({ simple: [], timed: [], explosions: [] });
            alert('Failed to fetch leaderboard. Please try again later.');
        }
    }

    filterName(name) {
        console.log("Entering filterName with name:", name);

        const trimmedName = name.trim();
        const lowerName = trimmedName.toLowerCase();
        console.log("Trimmed and lowercased name:", lowerName);

        if (trimmedName.length < 1 || trimmedName.length > 32) {
            console.log("Name rejected: Length out of bounds (1-32 characters)");
            return false;
        }

        const bannedPatterns = [
            /\bn[i1][g6]{1,2}[e3][r]/i,
            /\bf[a@][g6]{1,2}[o0][t]/i,
            /\b[a@][s$][s$]/i,
            /\bf[uü][c¢k][k]/i,
            /\bsh[i1][t]/i,
            /\bb[i1][t][c¢][h]/i,
            /\bc[uü][n][t]/i,
            /\bp[uü][s$][s$][y]/i,
            /\bd[i1][c¢][k]/i,
            /\bc[o0][c¢][k]/i,
            /\bwh[o0][r][e]/i,
            /\bsl[uü][t]/i,
            /\bd[a@][m][n]/i,
            /\bb[a@][s$][t][a@][r][d]/i,
            /\br[e3][t][a@][r][d]/i,
            /[^\w\s-]/,
            /\s{2,}/
        ];

        for (let pattern of bannedPatterns) {
            const matchesPattern = pattern.test(lowerName);
            console.log(`Testing pattern ${pattern}: ${matchesPattern}`);
            if (matchesPattern) {
                console.log(`Name rejected: Matches pattern ${pattern}`);
                return false;
            }
        }

        console.log("Name accepted: No issues found");
        return true;
    }

    async submitScore(name, score, mode) {
        console.log("Entering submitScore with name:", name, "score:", score, "mode:", mode);
        try {
            if (!this.filterName(name)) {
                console.warn("Inappropriate name detected, using 'Anonymous'");
                name = "Anonymous";
            }
            console.log("Submitting score with name:", name);

            const response = await fetch('/proxy/submit-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score, mode }),
            });
            if (!response.ok) {
                throw new Error(`Failed to submit score: ${response.status} ${response.statusText}`);
            }
            await this.fetchLeaderboard();
            console.log("Score submitted successfully");
            alert('Score submitted successfully!');
        } catch (err) {
            console.error('Error submitting score:', err.message);
            alert('Failed to submit score. Please try again later.');
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
        console.log("Starting new game...");
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
            const timerElement = document.getElementById("timer");
            if (timerElement) {
                timerElement.style.display = "block";
                this.startTimer();
            }
        } else {
            const timerElement = document.getElementById("timer");
            if (timerElement) {
                timerElement.style.display = "none";
                this.stopTimer();
            }
        }
        console.log("New game started.");
    }

    setMode(mode) {
        console.log("Setting game mode to:", mode);
        this.gameMode = mode;
        this.startNewGame();
    }

    endGame() {
        console.log("Ending game (auto-end)...");
        this.stopTimer();

        if (this.score > 0) {
            let playerName = prompt(
                "Game Over! Your score: " + Math.round(this.score) + "\n" +
                "Enter your name for the leaderboard:\n" +
                "- Click OK to submit with your name\n" +
                "- Click Cancel to submit as Anonymous\n" +
                "- Type 'Discard' and click OK to discard your score"
            );
            console.log("Player entered name:", playerName);

            if (playerName && playerName.trim().toLowerCase() === 'discard') {
                console.log("User chose to discard the game.");
                this.discardGame();
                return; 
            }

            if (playerName === null || playerName.trim() === "") {
                playerName = "Anonymous";
                console.log("Name was null or empty, set to 'Anonymous'");
            } else {
                playerName = playerName.trim();
                if (!this.filterName(playerName)) {
                    console.log("Name failed filter, alerting user...");
                    alert("That name is not allowed. Using 'Anonymous' instead.");
                    playerName = "Anonymous";
                }
            }

            this.submitScore(playerName, Math.round(this.score), this.gameMode);
        } else {
            console.log("Score is 0, skipping username prompt and submission.");
        }
        this.startNewGame();
    }

    endGameWithName() {
        console.log("Ending game (manual end)...");
        this.stopTimer();

        if (this.score > 0) {
            let playerName = prompt(
                "Game Over! Your score: " + Math.round(this.score) + "\n" +
                "Enter your name for the leaderboard:\n" +
                "- Click OK to submit with your name\n" +
                "- Click Cancel to submit as Anonymous\n" +
                "- Type 'Discard' and click OK to discard your score"
            );
            console.log("Player entered name:", playerName);

            if (playerName && playerName.trim().toLowerCase() === 'discard') {
                console.log("User chose to discard the game.");
                this.discardGame();
                return;
            }

            if (playerName === null || playerName.trim() === "") {
                playerName = "Anonymous";
                console.log("Name was null or empty, set to 'Anonymous'");
            } else {
                playerName = playerName.trim();
                if (!this.filterName(playerName)) {
                    console.log("Name failed filter, alerting user...");
                    alert("That name is not allowed. Using 'Anonymous' instead.");
                    playerName = "Anonymous";
                }
            }

            this.submitScore(playerName, Math.round(this.score), this.gameMode);
        } else {
            console.log("Score is 0, skipping username prompt and submission.");
        }
        this.startNewGame();
    }

    discardGame() {
        console.log("Discarding game...");
        this.stopTimer();
        this.startNewGame();
    }
}

const game = new GemGame();