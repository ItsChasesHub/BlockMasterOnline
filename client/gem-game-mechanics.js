class GemGame extends GemGameCore {
    constructor() {
        super();
        console.log("GemGame constructor completed, starting animation...");
        this.startNewGame();
        this.animate();
        this.startLeaderboardPolling(); 
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

        requestAnimationFrame(() => this.animate());
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
        this.ctx.roundRect(x * this.tileSize + 2, y * this.tileSize + 2 + gem.offsetY, this.tileSize - 6, this.tileSize - 6, 10);
        this.ctx.fill();

        if (gem.isExplosive) {
            this.ctx.fillStyle = "white";
            this.ctx.font = "bold 20px Arial";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText("✹", centerX, centerY);
        }

        if (this.gameMode !== "SLIDERS" && this.selectedGem?.x === x && this.selectedGem?.y === y) {
            this.ctx.strokeStyle = "rgba(255,255,255,0.7)";
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
        } else if (this.gameMode === "SLIDERS" && this.selectedTile?.x === x && this.selectedTile?.y === y) {
            this.ctx.strokeStyle = "rgba(255,255,0,0.7)";
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
        }
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
            setTimeout(() => this.isAnimating = false, 500);
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

        if (this.gameMode === "SLIDERS") {
            this.handleSlidersClick(x, y);
        } else {
            this.handleNormalClick(x, y);
        }
    }

    handleSlidersClick(x, y) {
        if (!this.selectedTile) {
            this.selectedTile = { x, y };
        } else if (this.isAdjacent(this.selectedTile, { x, y })) {
            const dx = x - this.selectedTile.x;
            const dy = y - this.selectedTile.y;
            if (dx === 1) this.slideRowRight(this.selectedTile.y);
            else if (dx === -1) this.slideRowLeft(this.selectedTile.y);
            else if (dy === 1) this.slideColumnDown(this.selectedTile.x);
            else if (dy === -1) this.slideColumnUp(this.selectedTile.x);
            this.isAnimating = true;
            this.fillEmptySpaces();
            const matches = this.findMatches();
            if (matches.length > 0) this.removeMatches(matches);
            setTimeout(() => this.isAnimating = false, 500);
            this.selectedTile = null;
        }
    }

    handleNormalClick(x, y) {
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

    removeMatches(matches) {
        const currentTime = Date.now();
        if (this.lastMatchTime && currentTime - this.lastMatchTime <= 5000) this.bonusMultiplier += 1;
        this.lastMatchTime = currentTime;

        let explosionMatches = [...matches];
        if (this.gameMode === "EXPLOSIONS") {
            matches.forEach(match => {
                if (Math.random() < 0.3) {
                    this.grid[match.x][match.y].isExplosive = true;
                    const types = ['horizontal', 'vertical', 'both'];
                    this.grid[match.x][match.y].explosionType = types[Math.floor(Math.random() * types.length)];
                    this.addExplosionMatches(match, explosionMatches);
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

    addExplosionMatches(match, explosionMatches) {
        const { x, y } = match;
        if (this.grid[x][y].explosionType === 'horizontal') {
            for (let i = 0; i < this.gridSize; i++) {
                if (i !== x && this.grid[i][y]) explosionMatches.push({ x: i, y });
            }
        } else if (this.grid[x][y].explosionType === 'vertical') {
            for (let i = 0; i < this.gridSize; i++) {
                if (i !== y && this.grid[x][i]) explosionMatches.push({ x, y: i });
            }
        } else if (this.grid[x][y].explosionType === 'both') {
            for (let i = 0; i < this.gridSize; i++) {
                if (i !== x && this.grid[i][y]) explosionMatches.push({ x: i, y });
                if (i !== y && this.grid[x][i]) explosionMatches.push({ x, y: i });
            }
        }
    }

    async fetchLeaderboard() {
        try {
            const response = await fetch('/proxy/fetch-scores');
            if (!response.ok) throw new Error(`Failed to fetch leaderboard: ${response.status}`);
            const scores = await response.json();
            this.updateLeaderboardDisplay(scores);
        } catch (err) {
            console.error('Error fetching leaderboard:', err.message);
            this.updateLeaderboardDisplay({ simple: [], timed: [], explosions: [], sliders: [] });
            alert('Failed to fetch leaderboard.');
        }
    }

    async submitScore(name, score, mode) {
        try {
            const response = await fetch('/proxy/submit-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score, mode })
            });
            if (!response.ok) throw new Error(`Failed to submit score: ${response.status}`);
            await this.fetchLeaderboard();
            alert('Score submitted successfully!');
        } catch (err) {
            console.error('Error submitting score:', err.message);
            alert('Failed to submit score.');
        }
    }

    updateLeaderboardDisplay(scores) {
        const modes = ['simple', 'timed', 'explosions', 'sliders'];
        modes.forEach(mode => {
            const list = document.getElementById(`${mode}-leaderboard`);
            if (list) {
                list.innerHTML = "";
                (scores[mode] || []).forEach((entry, index) => {
                    const div = document.createElement("div");
                    div.className = "leaderboard-entry";
                    div.innerHTML = `<span>${index + 1}. ${entry.name}</span><span>${entry.score}</span>`;
                    list.appendChild(div);
                });
            }
        });
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
        this.selectedTile = null;
        this.isAnimating = false;
        this.timeLeft = 300;
        this.bonusMultiplier = 1;
        this.lastMatchTime = null;
        this.updateScoreDisplay();
        this.updateTimerDisplay();
        this.updateBonusDisplay();
        const timerElement = document.getElementById("timer");
        if (timerElement) {
            if (this.gameMode === "TIMED") {
                timerElement.style.display = "block";
                this.startTimer();
            } else {
                timerElement.style.display = "none";
                this.stopTimer();
            }
        }
        this.startLeaderboardPolling();
    }

    setMode(mode) {
        this.gameMode = mode;
        this.startNewGame();
    }

    validateName(name) {
        console.log("Validating name:", name);

        const trimmedName = name.trim();
        const lowerName = trimmedName.toLowerCase();

        if (trimmedName.length < 1 || trimmedName.length > 32) {
            return {
                valid: false,
                message: "Name must be between 1 and 32 characters long."
            };
        }

        if (/\s/.test(trimmedName)) {
            return {
                valid: false,
                message: "Name cannot contain spaces."
            };
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
            return {
                valid: false,
                message: "Name can only contain letters (a-z, A-Z), numbers (0-9), hyphens (-), and underscores (_)."
            };
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
            /\br[e3][t][a@][r][d]/i
        ];

        for (let pattern of bannedPatterns) {
            if (pattern.test(lowerName)) {
                return {
                    valid: false,
                    message: "Name contains inappropriate content."
                };
            }
        }

        return {
            valid: true,
            message: ""
        };
    }

    async submitScore(name, score, mode) {
        console.log("Entering submitScore with name:", name, "score:", score, "mode:", mode);
        try {
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

    endGame() {
        console.log("Ending game (auto-end)...");
        this.stopTimer();
        this.stopLeaderboardPolling();

        if (this.score > 0) {
            let playerName = null;
            let isValidName = false;
            let promptMessage = "Game Over! Your score: " + Math.round(this.score) + "\n" +
                                "Enter your name for the leaderboard:\n" +
                                "- Click OK to submit with your name\n" +
                                "- Click Cancel to submit as Anonymous\n" +
                                "- Type 'Discard' and click OK to discard your score";

            while (!isValidName) {
                playerName = prompt(promptMessage);
                console.log("Player entered name:", playerName);

                if (playerName && playerName.trim().toLowerCase() === 'discard') {
                    console.log("User chose to discard the game.");
                    this.discardGame();
                    return;
                }

                if (playerName === null || playerName.trim() === "") {
                    playerName = "Anonymous";
                    console.log("Name was null or empty, set to 'Anonymous'");
                    isValidName = true;
                } else {
                    playerName = playerName.trim();
                    const validation = this.validateName(playerName);
                    if (validation.valid) {
                        console.log("Name is valid:", playerName);
                        isValidName = true;
                    } else {
                        console.log("Name validation failed:", validation.message);
                        promptMessage = "Game Over! Your score: " + Math.round(this.score) + "\n" +
                                        "Invalid name: " + validation.message + "\n" +
                                        "Allowed: a-z, A-Z, 0-9, hyphens (-), underscores (_), no spaces, max 32 characters\n" +
                                        "Enter your name for the leaderboard:\n" +
                                        "- Click OK to submit with your name\n" +
                                        "- Click Cancel to submit as Anonymous\n" +
                                        "- Type 'Discard' and click OK to discard your score";
                    }
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
        this.stopLeaderboardPolling(); // Stop polling when game ends

        if (this.score > 0) {
            let playerName = null;
            let isValidName = false;
            let promptMessage = "Game Over! Your score: " + Math.round(this.score) + "\n" +
                                "Enter your name for the leaderboard:\n" +
                                "- Click OK to submit with your name\n" +
                                "- Click Cancel to submit as Anonymous\n" +
                                "- Type 'Discard' and click OK to discard your score";

            while (!isValidName) {
                playerName = prompt(promptMessage);
                console.log("Player entered name:", playerName);

                if (playerName && playerName.trim().toLowerCase() === 'discard') {
                    console.log("User chose to discard the game.");
                    this.discardGame();
                    return;
                }

                if (playerName === null || playerName.trim() === "") {
                    playerName = "Anonymous";
                    console.log("Name was null or empty, set to 'Anonymous'");
                    isValidName = true;
                } else {
                    playerName = playerName.trim();
                    const validation = this.validateName(playerName);
                    if (validation.valid) {
                        console.log("Name is valid:", playerName);
                        isValidName = true;
                    } else {
                        console.log("Name validation failed:", validation.message);
                        promptMessage = "Game Over! Your score: " + Math.round(this.score) + "\n" +
                                        "Invalid name: " + validation.message + "\n" +
                                        "Allowed: a-z, A-Z, 0-9, hyphens (-), underscores (_), no spaces, max 32 characters\n" +
                                        "Enter your name for the leaderboard:\n" +
                                        "- Click OK to submit with your name\n" +
                                        "- Click Cancel to submit as Anonymous\n" +
                                        "- Type 'Discard' and click OK to discard your score";
                    }
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
        this.stopLeaderboardPolling();
        this.startNewGame();
    }

    startLeaderboardPolling() {
        this.stopLeaderboardPolling();

        this.leaderboardPollInterval = setInterval(() => {
            console.log("Polling for leaderboard updates...");
            this.fetchLeaderboard();
        }, 300000);
    }

    stopLeaderboardPolling() {
        if (this.leaderboardPollInterval) {
            clearInterval(this.leaderboardPollInterval);
            this.leaderboardPollInterval = null;
            console.log("Stopped leaderboard polling");
        }
    }
}

const game = new GemGame();