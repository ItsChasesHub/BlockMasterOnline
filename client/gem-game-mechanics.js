class GemGame extends GemGameCore {
    constructor() {
        super();
        console.log("GemGame constructor completed, starting animation...");
        this.setupUpgradeCanvas();
        this.waterLevel = 0;
        this.targetWaterLevel = 0;
        this.maxMultiplier = 20;
        this.lastWaterLevel = -1;
        this.bombFlashStates = new Map();
        this.lastBombExplosionTime = 0;
        this.startNewGame();
        this.animate();
        this.startLeaderboardPolling();
        this.startWaterAnimation();
    }

    setupUpgradeCanvas() {
        this.upgradeCanvas = document.getElementById("upgradeCanvas");
        if (!this.upgradeCanvas) {
            console.error("Upgrade canvas not found!");
            return;
        }
        this.upgradeCtx = this.upgradeCanvas.getContext("2d");
        if (!this.upgradeCtx) {
            console.error("Failed to get 2D context for upgrade canvas!");
            return;
        }
        this.drawWaterLevel();
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

            if (this.gameMode === "EXPLOSIONS") {
                const currentTime = Date.now();
                if (currentTime - this.lastBombExplosionTime >= 15000) { /* 15 seconds */
                    const bombCount = Math.floor(Math.random() * 2) + 1; /* 1 or 2 bombs */
                    for (let i = 0; i < bombCount; i++) {
                        this.spawnRandomBomb();
                    }
                    this.lastBombExplosionTime = currentTime;
                }
            }
        }

        if (this.lastMatchTime && Date.now() - this.lastMatchTime > 5000 && this.bonusMultiplier > 1) {
            this.bonusMultiplier = 1;
            this.updateBonusDisplay();
        }

        requestAnimationFrame(() => this.animate());
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

    drawGem(x, y, gem) {
        const centerX = x * this.tileSize + this.tileSize / 2;
        const centerY = y * this.tileSize + this.tileSize / 2 + gem.offsetY;

        if (gem.isBomb) {
            let flashColor = "#000000";
            if (gem.flashStart) {
                const flashTime = Date.now() - gem.flashStart;
                const flashCycle = Math.sin(flashTime * 0.01) > 0 ? "#FFFFFF" : "#000000";
                flashColor = flashCycle;
                if (flashTime > 5000 && this.gameMode === "EXPLOSIONS") { /* 5000 (5 seconds) */
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

    startWaterAnimation() {
        this.waterAnimationInterval = setInterval(() => {
            this.updateWaterLevel();
            this.drawWaterLevel();
        }, 100);
    }

    stopWaterAnimation() {
        if (this.waterAnimationInterval) {
            clearInterval(this.waterAnimationInterval);
            this.waterAnimationInterval = null;
        }
    }

    updateWaterLevel() {
        this.targetWaterLevel = Math.min(this.bonusMultiplier / this.maxMultiplier, 1);
        const fillSpeed = 0.05;
        const emptySpeed = 0.02;
        const speed = this.waterLevel < this.targetWaterLevel ? fillSpeed : emptySpeed;

        this.waterLevel += (this.targetWaterLevel - this.waterLevel) * speed;
        this.waterLevel = Math.max(0, Math.min(1, this.waterLevel));
    }

    drawWaterLevel() {
        if (!this.upgradeCtx) return;

        if (Math.abs(this.waterLevel - this.lastWaterLevel) < 0.01) return;
        this.lastWaterLevel = this.waterLevel;

        const ctx = this.upgradeCtx;
        const width = this.upgradeCanvas.width;
        const height = this.upgradeCanvas.height;
        const radius = width / 2 - 5;
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.clearRect(0, 0, width, height);

        const waterHeight = height * this.waterLevel;
        ctx.beginPath();
        ctx.fillStyle = "rgba(0, 191, 255, 0.7)";
        ctx.rect(0, height - waterHeight, width, waterHeight);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        const waveOffset = Math.sin(Date.now() * 0.001) * 5;
        ctx.moveTo(0, height - waterHeight + waveOffset);
        ctx.lineTo(width, height - waterHeight - waveOffset);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.clip();
    }

    updateBonusDisplay() {
        const bonusElement = document.getElementById("bonusMultiplier");
        if (bonusElement) {
            let displayMultiplier = Math.round(this.bonusMultiplier);
            bonusElement.innerHTML = `Multiplier: x${displayMultiplier}`;
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
        this.waterLevel = 0;
        this.targetWaterLevel = 0;
        this.lastWaterLevel = -1;
        this.bombFlashStates.clear();
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
        this.stopWaterAnimation();
        this.startWaterAnimation();

        if (this.gameMode === "EXPLOSIONS") {
            for (let i = 0; i < 2; i++) {
                this.spawnRandomBomb();
            }
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

        let bombMatches = [...matches];
        let bombTriggered = false;

        matches.forEach(match => {
            if (this.grid[match.x][match.y]?.isBomb) {
                bombTriggered = true;
                this.addBombMatches(match, bombMatches);
            }
        });

        if (this.gameMode === "EXPLOSIONS") {
            matches.forEach(match => {
                if (matches.length >= 4 && Math.random() < 0.3) {
                    if (this.grid[match.x][match.y] && !this.grid[match.x][match.y].isBomb) {
                        this.grid[match.x][match.y].isBomb = true;
                        this.grid[match.x][match.y].flashStart = Date.now();
                        console.log(`Created bomb from match at (${match.x}, ${match.y})`);
                    }
                }
            });
        }

        bombMatches.forEach(({ x, y }) => {
            if (this.grid[x][y]) {
                this.grid[x][y] = null;
                this.score += (bombTriggered ? 20 : 10) * this.bonusMultiplier;
            }
        });

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

    setMode(mode) {
        this.gameMode = mode;
        this.startNewGame();
    }

    validateName(name) {
        const trimmedName = name.trim();
        const lowerName = trimmedName.toLowerCase();
    
        if (trimmedName.length < 1 || trimmedName.length > 32) {
            return { valid: false, message: "Name must be between 1 and 32 characters long." };
        }
        if (/\s/.test(trimmedName)) {
            return { valid: false, message: "Name cannot contain spaces." };
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
            return { valid: false, message: "Name can only contain letters (a-z, A-Z), numbers (0-9), hyphens (-), and underscores (_)." };
        }
    
        const bannedPatterns = [
            /[n][i1][g6]{1,2}[e3][r]/i,
            /[f][a@][g6]{1,2}[o0][t]/i,
            /[a@][s$][s$]/i,
            /[f][uü][c¢k][k]/i,
            /[s][h][i1][t]/i,
            /[b][i1][t][c¢][h]/i,
            /[c][uü][n][t]/i,
            /[p][uü][s$][s$][y]/i,
            /[d][i1][c¢][k]/i,
            /[c][o0][c¢][k]/i,
            /[w][h][o0][r][e]/i,
            /[s][l][uü][t]/i,
            /[d][a@][m][n]/i,
            /[b][a@][s$][t][a@][r][d]/i,
            /[r][e3][t][a@][r][d]/i
        ];
    
        for (let pattern of bannedPatterns) {
            if (pattern.test(lowerName)) {
                return { valid: false, message: "Name contains inappropriate content." };
            }
        }
    
        return { valid: true, message: "" };
    }

    endGame() {
        console.log("Ending game (auto-end)...");
        this.stopTimer();
        this.stopLeaderboardPolling();
        this.stopWaterAnimation();

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
        this.stopLeaderboardPolling();
        this.stopWaterAnimation();

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
        this.stopWaterAnimation();
        this.startNewGame();
    }

    startLeaderboardPolling() {
        this.stopLeaderboardPolling();
        this.leaderboardPollInterval = setInterval(() => {
            console.log("Polling for leaderboard updates...");
            this.fetchLeaderboard();
        }, 120000);
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