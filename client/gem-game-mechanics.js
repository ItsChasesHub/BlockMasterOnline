class GameController {
    constructor() {
        this.currentMode = null;
        this.waterLevel = 0;
        this.targetWaterLevel = 0;
        this.maxMultiplier = 20;
        this.lastWaterLevel = -1;
        this.leaderboardPollInterval = null;
        this.playlist = [
            'sunsetcafe.mp3',
            'tokyocafe.mp3',
            'oceanbreeze.mp3',
            'musicchill.mp3'
        ];
        this.currentSongIndex = 0;
        this.backgroundMusic = new Audio(this.playlist[this.currentSongIndex]);
        this.backgroundMusic.loop = false;
        this.backgroundMusic.volume = 0.5;
        this.isMusicPlaying = true;
        this.wasMusicPlaying = false;

        this.handleSongEnd = () => {
            this.nextSong();
        };
        this.backgroundMusic.addEventListener('ended', this.handleSongEnd);

        this.matchSound = new Audio('uipop.mp3');
        this.matchSound.volume = 0.5;
        this.isSoundEnabled = true;

        this.setupUpgradeCanvas();
        this.setupButtons();
        this.setupSettings();
        this.setMode("SIMPLE");
        this.startWaterAnimation();
        this.fetchLeaderboard();
        this.startLeaderboardPolling();
        this.animate();
        this.playMusic();

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.wasMusicPlaying = this.isMusicPlaying && !this.backgroundMusic.paused;
                if (this.isMusicPlaying && !this.backgroundMusic.paused) {
                    this.backgroundMusic.pause();
                }
            } else if (document.visibilityState === 'visible') {
                if (this.isMusicPlaying && this.wasMusicPlaying) {
                    this.backgroundMusic.play().catch(error => {
                        console.error("Error resuming background music:", error);
                    });
                }
            }
        });

        const playMusicOnInteraction = () => {
            if (this.isMusicPlaying) {
                this.backgroundMusic.play().catch(error => {
                    console.error("Error playing background music on interaction:", error);
                });
            }
            document.removeEventListener('click', playMusicOnInteraction);
            document.removeEventListener('touchstart', playMusicOnInteraction);
        };
        document.addEventListener('click', playMusicOnInteraction);
        document.addEventListener('touchstart', playMusicOnInteraction);
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

    setupButtons() {
        const buttons = {
            newGameBtn: () => this.startNewGame(this.currentMode.gameMode),
            simpleBtn: () => this.setMode("SIMPLE"),
            timedBtn: () => this.setMode("TIMED"),
            explosionsBtn: () => this.setMode("EXPLOSIONS"),
            slidersBtn: () => this.setMode("SLIDERS"),
            endGameBtn: () => this.endGameWithName(),
            discardGameBtn: () => this.discardGame()
        };

        for (const [id, handler] of Object.entries(buttons)) {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener("click", () => {
                    handler();
                    this.highlightButton(id);
                });
            } else {
                console.error(`${id} not found!`);
            }
        }

        this.highlightButton("simpleBtn");
    }

    highlightButton(buttonId) {
        const modeButtons = ["simpleBtn", "timedBtn", "explosionsBtn", "slidersBtn"];
        const actionButtons = ["newGameBtn", "endGameBtn", "discardGameBtn"];
        const targetBtn = document.getElementById(buttonId);
    
        if (!targetBtn) {
            console.error(`Button ${buttonId} not found!`);
            return;
        }
    
        if (modeButtons.includes(buttonId)) {
            modeButtons.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.classList.remove("active");
            });
            targetBtn.classList.add("active");
        } 
        else if (actionButtons.includes(buttonId)) {
            targetBtn.classList.add("active");
            setTimeout(() => {
                targetBtn.classList.remove("active");
            }, 150);
        }
    }

    setupSettings() {
        const settingsBtn = document.getElementById("settingsBtn");
        const settingsModal = document.getElementById("settingsModal");
        const closeBtn = document.getElementById("settingsCloseBtn");
        const blockDesignSelect = document.getElementById("blockDesignSelect");
        const blockColorSelect = document.getElementById("blockColorSelect");
        const musicToggle = document.getElementById("musicToggle");
        const musicVolume = document.getElementById("musicVolume");
        const soundToggle = document.getElementById("soundToggle");
        const soundVolume = document.getElementById("soundVolume");
        const nextSongBtn = document.getElementById("nextSongBtn");
        
        settingsBtn.addEventListener("click", () => {
            settingsModal.style.display = settingsModal.style.display === "flex" ? "none" : "flex";
        });
        
        closeBtn.addEventListener("click", () => {
            settingsModal.style.display = "none";
        });
        
        blockDesignSelect.addEventListener("change", (e) => {
            const design = e.target.value;
            this.updateBlockDesign(design);
        });
        
        blockColorSelect.addEventListener("change", (e) => {
            const color = e.target.value;
            this.updateBlockColor(color);
        });
        
        musicToggle.addEventListener("change", (e) => {
            const enabled = e.target.checked;
            this.toggleMusic(enabled);
        });
    
        musicVolume.addEventListener("input", (e) => {
            const volume = e.target.value / 100;
            this.setMusicVolume(volume);
        });
        musicVolume.addEventListener("change", (e) => {
            const volume = e.target.value / 100;
            this.setMusicVolume(volume);
        });
    
        soundToggle.addEventListener("change", (e) => {
            const enabled = e.target.checked;
            this.toggleSound(enabled);
        });
    
        soundVolume.addEventListener("input", (e) => {
            const volume = e.target.value / 100;
            this.setSoundVolume(volume);
        });
        soundVolume.addEventListener("change", (e) => {
            const volume = e.target.value / 100;
            this.setSoundVolume(volume);
        });
    
        if (nextSongBtn) {
            nextSongBtn.addEventListener("click", () => {
                this.nextSong();
                this.highlightButton("nextSongBtn");
                setTimeout(() => {
                    nextSongBtn.classList.remove("active");
                }, 1000);
            });
        }
    
        musicToggle.checked = this.isMusicPlaying;
        musicVolume.value = this.backgroundMusic.volume * 100;
        soundToggle.checked = this.isSoundEnabled;
        soundVolume.value = this.matchSound.volume * 100;
    }

    updateBlockDesign(design) {
        /* Placeholder: Implement logic to change block design */
    }

    updateBlockColor(color) {
        /* Placeholder: Implement logic to change block colors */
    }

    toggleMusic(enabled) {
        this.isMusicPlaying = enabled;
        if (enabled) {
            this.playMusic();
        } else {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
    }

    playMusic() {
        if (this.isMusicPlaying) {
            this.backgroundMusic.play().catch(error => {
                console.error("Error playing background music:", error);
            });
        }
    }

    setMusicVolume(volume) {
        this.backgroundMusic.volume = volume;
    }

    nextSong() {
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;

        this.backgroundMusic.removeEventListener('ended', this.handleSongEnd);

        this.currentSongIndex = (this.currentSongIndex + 1) % this.playlist.length;

        this.backgroundMusic.src = this.playlist[this.currentSongIndex];

        this.backgroundMusic.addEventListener('ended', this.handleSongEnd);

        if (this.isMusicPlaying) {
            this.backgroundMusic.play().catch(error => {
                console.error("Error playing next song:", error);
            });
        }
    }

    toggleSound(enabled) {
        this.isSoundEnabled = enabled;
    }

    playMatchSound() {
        if (this.isSoundEnabled && document.visibilityState === 'visible') {
            this.matchSound.currentTime = 0;
            this.matchSound.play().catch(error => {
                console.error("Error playing match sound:", error);
            });
        }
    }

    setSoundVolume(volume) {
        this.matchSound.volume = volume;
    }

    setMode(mode) {
        if (this.currentMode) {
            const canvas = this.currentMode.canvas;
            if (this.currentMode.gameMode !== "SLIDERS") {
                canvas.removeEventListener("click", this.currentMode.handleClick);
            } else if (this.currentMode.dragHandler) {
                canvas.removeEventListener("mousedown", this.currentMode.dragHandler.handleMouseDown);
                canvas.removeEventListener("mousemove", this.currentMode.dragHandler.handleMouseMove);
                canvas.removeEventListener("mouseup", this.currentMode.dragHandler.handleMouseUp);
                canvas.removeEventListener("mouseleave", this.currentMode.dragHandler.handleMouseUp);
                canvas.removeEventListener("touchstart", this.currentMode.dragHandler.handleTouchStart);
                canvas.removeEventListener("touchmove", this.currentMode.dragHandler.handleTouchMove);
                canvas.removeEventListener("touchend", this.currentMode.dragHandler.handleTouchEnd);
            }
            this.currentMode.stopTimer?.();
            this.currentMode.isAnimating = false;
            this.currentMode.score = 0;
            this.currentMode.grid = null;
            this.currentMode = null;
        }

        try {
            switch (mode) {
                case "SIMPLE":
                    if (typeof SimpleMode === "undefined") throw new Error("SimpleMode is not defined");
                    this.currentMode = new SimpleMode();
                    this.currentMode.setupEventListeners();
                    break;
                case "TIMED":
                    if (typeof TimedMode === "undefined") throw new Error("TimedMode is not defined");
                    this.currentMode = new TimedMode();
                    this.currentMode.setupEventListeners();
                    break;
                case "EXPLOSIONS":
                    if (typeof ExplosionsMode === "undefined") throw new Error("ExplosionsMode is not defined");
                    this.currentMode = new ExplosionsMode();
                    this.currentMode.setupEventListeners();
                    break;
                case "SLIDERS":
                    if (typeof SlidersMode === "undefined") throw new Error("SlidersMode is not defined");
                    this.currentMode = new SlidersMode();
                    this.currentMode.dragHandler.setupDragListeners();
                    break;
                default:
                    if (typeof SimpleMode === "undefined") throw new Error("SimpleMode is not defined");
                    this.currentMode = new SimpleMode();
                    this.currentMode.setupEventListeners();
            }
            this.currentMode.gameController = this;
            this.currentMode.reset();
            this.currentMode.score = 0;
            this.currentMode.updateScoreDisplay();
        } catch (error) {
            console.error(`Failed to set mode ${mode}: ${error.message}`);
            this.showCustomAlert(`Error: ${error.message}. Falling back to Simple mode.`);
            this.currentMode = new SimpleMode();
            this.currentMode.setupEventListeners();
            this.currentMode.gameController = this;
            this.currentMode.reset();
            this.currentMode.score = 0;
            this.currentMode.updateScoreDisplay();
        }

        this.startNewGame(mode);
    }

    startNewGame(mode) {
        if (this.currentMode) {
            this.currentMode.stopTimer?.();
            this.currentMode.reset();
            this.currentMode.score = 0;
            this.currentMode.grid = this.currentMode.createGrid();
            this.currentMode.selectedGem = null;
            this.currentMode.selectedTile = null;
            this.currentMode.isAnimating = false;
            this.currentMode.timeLeft = 300;
            this.currentMode.bonusMultiplier = 1;
            this.currentMode.lastMatchTime = null;
            this.waterLevel = 0;
            this.targetWaterLevel = 0;
            this.lastWaterLevel = -1;
            this.currentMode.updateScoreDisplay();
            this.currentMode.updateTimerDisplay();
            this.currentMode.updateBonusDisplay();
    
            if (mode === "TIMED") {
                this.currentMode.startTimer();
            }
    
            const timerElement = document.getElementById("timer");
            if (timerElement) {
                timerElement.style.display = mode === "TIMED" ? "block" : "none";
            }
            this.currentMode.ctx.clearRect(0, 0, this.currentMode.canvas.width, this.currentMode.canvas.height);
        }
    }

    animate() {
        if (this.currentMode) {
            const isAnimating = this.currentMode.animate();
            this.updateWaterLevel();
            this.drawWaterLevel();
        }
        requestAnimationFrame(() => this.animate());
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
        this.targetWaterLevel = Math.min(this.currentMode.bonusMultiplier / this.maxMultiplier, 1);
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

    async fetchLeaderboard() {
        try {
            const response = await fetch('/proxy/fetch-scores');
            if (!response.ok) throw new Error(`Failed to fetch leaderboard: ${response.status}`);
            const scores = await response.json();
            this.updateLeaderboardDisplay(scores);
        } catch (err) {
            console.error('Error fetching leaderboard:', err.message);
            this.updateLeaderboardDisplay({ simple: [], timed: [], explosions: [], sliders: [] });
            console.log('Displaying empty leaderboard as fallback.');
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
            this.showCustomAlert('Score submitted successfully!');
        } catch (err) {
            console.error('Error submitting score:', err.message);
            this.showCustomAlert('Failed to submit score.');
        }
    }

    showCustomAlert(message) {
        const modal = document.getElementById("customAlertModal");
        const messageDisplay = document.getElementById("customAlertMessage");
        const okBtn = document.getElementById("customAlertOkBtn");

        messageDisplay.textContent = message;
        modal.style.display = "flex";

        okBtn.onclick = () => {
            modal.style.display = "none";
        };

        document.addEventListener('keydown', function handler(e) {
            if (e.key === "Enter" && modal.style.display === "flex") {
                modal.style.display = "none";
                document.removeEventListener('keydown', handler);
            }
        });
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
                if ((scores[mode] || []).length === 0) {
                    const div = document.createElement("div");
                    div.className = "leaderboard-entry";
                    div.innerHTML = "<span>No scores yet</span>";
                    list.appendChild(div);
                }
            }
        });
    }

    startLeaderboardPolling() {
        this.stopLeaderboardPolling();
        console.log("Starting leaderboard polling...");
        this.fetchLeaderboard();
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

    validateName(name) {
        const trimmedName = name.trim();
        const lowerName = trimmedName.toLowerCase();
    
        if (trimmedName.length < 1 || trimmedName.length > 16) {
            return { valid: false, message: "Name must be between 1 and 16 characters long." };
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
            /[r][e3][t][a@][r][d]/i,
            /[h][o0][e3]/i,
            /[f][a4][g6]/i,
            /[v][i1][r][g6][i1][n]/i,
            /[c][r][a4][c][k][e3][r]/i
        ];
    
        for (let pattern of bannedPatterns) {
            if (pattern.test(lowerName)) {
                return { valid: false, message: "Name contains inappropriate content." };
            }
        }
    
        return { valid: true, message: "" };
    }

    endGameWithName() {
        this.currentMode.stopTimer?.();
        this.stopLeaderboardPolling();
        this.stopWaterAnimation();

        if (this.currentMode.score <= 0) {
            this.startNewGame(this.currentMode.gameMode);
            this.startLeaderboardPolling();
            return;
        }

        const modal = document.getElementById("scoreSubmitModal");
        const scoreDisplay = document.getElementById("modalScore");
        const nameInput = document.getElementById("playerNameInput");
        const errorDisplay = document.getElementById("nameError");
        const submitBtn = document.getElementById("submitNameBtn");
        const anonymousBtn = document.getElementById("anonymousBtn");
        const discardBtn = document.getElementById("discardBtn");

        scoreDisplay.textContent = `Your score: ${Math.round(this.currentMode.score)}`;
        nameInput.value = "";
        errorDisplay.textContent = "";
        modal.style.display = "flex";

        const submitScoreHandler = () => {
            const playerName = nameInput.value.trim();
            if (playerName.toLowerCase() === "discard") {
                console.log("User chose to discard the game.");
                this.discardGame();
                modal.style.display = "none";
                return;
            }

            if (playerName === "") {
                console.log("Name was empty, submitting as Anonymous");
                this.submitScore("Anonymous", Math.round(this.currentMode.score), this.currentMode.gameMode);
                modal.style.display = "none";
                this.startNewGame(this.currentMode.gameMode);
                this.startLeaderboardPolling();
            } else {
                const validation = this.validateName(playerName);
                if (validation.valid) {
                    console.log("Name is valid:", playerName);
                    this.submitScore(playerName, Math.round(this.currentMode.score), this.currentMode.gameMode);
                    modal.style.display = "none";
                    this.startNewGame(this.currentMode.gameMode);
                    this.startLeaderboardPolling();
                } else {
                    console.log("Name validation failed:", validation.message);
                    errorDisplay.textContent = validation.message;
                }
            }
        };

        submitBtn.onclick = submitScoreHandler;
        anonymousBtn.onclick = () => {
            console.log("Submitting as Anonymous");
            this.submitScore("Anonymous", Math.round(this.currentMode.score), this.currentMode.gameMode);
            modal.style.display = "none";
            this.startNewGame(this.currentMode.gameMode);
            this.startLeaderboardPolling();
        };
        discardBtn.onclick = () => {
            console.log("User chose to discard the game.");
            this.discardGame();
            modal.style.display = "none";
        };

        nameInput.onkeydown = (e) => {
            if (e.key === "Enter") {
                submitScoreHandler();
            }
        };

        nameInput.focus();
    }

    discardGame() {
        this.currentMode.stopTimer?.();
        this.stopLeaderboardPolling();
        this.stopWaterAnimation();
        this.currentMode.reset();
        this.currentMode.score = 0;
        this.currentMode.updateScoreDisplay();
        this.startNewGame(this.currentMode.gameMode);
        this.startLeaderboardPolling();
    }
}

const gameController = new GameController();