/**
 * Game.js - Clase principal del juego
 * Controla todos los aspectos del juego: estados, física, renderizado, audio
 */

class Game {
  constructor(canvasId, config) {
    // Configuración básica
    this.config = config;
    this.canvas = document.getElementById(canvasId);
    this.context = this.canvas.getContext("2d");

    // Configurar canvas
    this.canvas.width = config.BOARD_WIDTH;
    this.canvas.height = config.BOARD_HEIGHT;

    // Estados del juego
    this.states = {
      LOADING: "loading",
      MENU: "menu",
      PLAYING: "playing",
      PAUSED: "paused",
      GAME_OVER: "gameOver",
    };
    this.currentState = this.states.LOADING;
    this.previousState = null;

    // Entidades del juego
    this.bird = new Bird(config, this.canvas);
    this.pipePool = new PipePool(config);

    // Sistema de puntuación
    this.score = 0;
    this.bestScore = this.loadBestScore();
    this.isNewRecord = false;

    // Sistema de niveles
    this.currentLevel = 1;
    this.levelTransitionTimer = 0;
    this.isLevelTransitioning = false;

    // Control de tiempo
    this.lastFrameTime = 0;
    this.deltaTime = 0;
    this.gameTime = 0;
    this.pausedTime = 0;

    // Generación de tuberías
    this.lastPipeTime = 0;
    this.pipeInterval = config.PIPES.SPAWN_INTERVAL;

    // Sistema de audio
    this.audio = {
      jump: new Audio(config.ASSETS.AUDIO.JUMP),
      gameOver: new Audio(config.ASSETS.AUDIO.GAME_OVER),
      score: new Audio(config.ASSETS.AUDIO.SCORE),
    };
    this.setupAudio();

    // Controles
    this.controls = {
      jump: false,
      pause: false,
      restart: false,
    };

    // Efectos visuales
    this.screenShake = 0;
    this.backgroundOffset = 0;

    // Estadísticas
    this.stats = {
      gamesPlayed: 0,
      totalScore: 0,
      totalTime: 0,
      bestTime: 0,
      totalJumps: 0,
    };
    this.loadStats();

    // Performance monitoring
    this.performance = {
      fps: 60,
      frameCount: 0,
      lastFpsUpdate: 0,
    };

    // Debug
    window.DEBUG_MODE = false;

    // Inicialización
    this.setupEventListeners();
    this.loadAssets().then(() => {
      this.changeState(this.states.MENU);
      this.start();
    });

    console.log("Game initialized");
  }

  /**
   * Configura el sistema de audio
   */
  setupAudio() {
    Object.values(this.audio).forEach((audio) => {
      audio.volume = this.config.AUDIO.DEFAULT_VOLUME;
      audio.preload = "auto";
    });
  }

  /**
   * Carga assets del juego
   */
  async loadAssets() {
    console.log("Loading game assets...");

    // Simular carga de assets (en una implementación real cargarías todos los recursos)
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("Assets loaded successfully");
        resolve();
      }, 1000);
    });
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Teclado
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
    document.addEventListener("keyup", (e) => this.handleKeyUp(e));

    // Mouse
    this.canvas.addEventListener("click", (e) => this.handleClick(e));

    // Touch
    this.canvas.addEventListener("touchstart", (e) => this.handleTouch(e));

    // Prevenir contexto de click derecho
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Visibilidad de la página
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.currentState === this.states.PLAYING) {
        this.pause();
      }
    });
  }

  /**
   * Maneja eventos de teclado (presionar)
   */
  handleKeyDown(e) {
    switch (e.code) {
      case "Space":
      case "ArrowUp":
      case "KeyX":
        e.preventDefault();
        this.handleJumpInput();
        break;
      case "KeyP":
      case "Escape":
        e.preventDefault();
        if (this.currentState === this.states.PLAYING) {
          this.pause();
        } else if (this.currentState === this.states.PAUSED) {
          this.resume();
        }
        break;
      case "KeyR":
        e.preventDefault();
        this.restart();
        break;
      case "KeyD":
        e.preventDefault();
        window.DEBUG_MODE = !window.DEBUG_MODE;
        console.log("Debug mode:", window.DEBUG_MODE);
        break;
    }
  }

  /**
   * Maneja eventos de teclado (soltar)
   */
  handleKeyUp(e) {
    switch (e.code) {
      case "Space":
      case "ArrowUp":
      case "KeyX":
        this.controls.jump = false;
        break;
      case "KeyP":
      case "Escape":
        this.controls.pause = false;
        break;
      case "KeyR":
        this.controls.restart = false;
        break;
    }
  }

  /**
   * Maneja clicks del mouse
   */
  handleClick(e) {
    e.preventDefault();
    this.handleJumpInput();
  }

  /**
   * Maneja eventos touch
   */
  handleTouch(e) {
    e.preventDefault();
    this.handleJumpInput();
  }

  /**
   * Procesa input de salto según el estado del juego
   */
  handleJumpInput() {
    switch (this.currentState) {
      case this.states.MENU:
        this.startGame();
        break;
      case this.states.PLAYING:
        this.bird.jump();
        this.playSound("jump");
        break;
      case this.states.GAME_OVER:
        this.restart();
        break;
      case this.states.PAUSED:
        this.resume();
        break;
    }
  }

  /**
   * Cambia el estado del juego
   */
  changeState(newState) {
    if (this.currentState === newState) return;

    this.previousState = this.currentState;
    this.currentState = newState;

    console.log(`State changed: ${this.previousState} -> ${this.currentState}`);

    // Acciones específicas por estado
    switch (newState) {
      case this.states.PLAYING:
        this.resumeGame();
        break;
      case this.states.PAUSED:
        this.pauseGame();
        break;
      case this.states.GAME_OVER:
        this.endGame();
        break;
    }
  }

  /**
   * Inicia el juego
   */
  startGame() {
    this.resetGame();
    this.changeState(this.states.PLAYING);
    this.stats.gamesPlayed++;
  }

  /**
   * Pausa el juego
   */
  pause() {
    if (this.currentState === this.states.PLAYING) {
      this.changeState(this.states.PAUSED);
    }
  }

  /**
   * Reanuda el juego
   */
  resume() {
    if (this.currentState === this.states.PAUSED) {
      this.changeState(this.states.PLAYING);
    }
  }

  /**
   * Reinicia el juego
   */
  restart() {
    this.resetGame();
    this.changeState(this.states.PLAYING);
    this.stats.gamesPlayed++;
  }

  /**
   * Reinicia todas las variables del juego
   */
  resetGame() {
    this.bird.reset();
    this.pipePool.clear();
    this.score = 0;
    this.currentLevel = 1;
    this.isNewRecord = false;
    this.gameTime = 0;
    this.lastPipeTime = 0;
    this.screenShake = 0;
    this.backgroundOffset = 0;
    this.isLevelTransitioning = false;
    this.levelTransitionTimer = 0;

    // Actualizar clase del canvas
    this.canvas.className = "level-1";

    console.log("Game reset");
  }

  /**
   * Acciones al reanudar el juego
   */
  resumeGame() {
    // Sincronizar timer
    this.lastFrameTime = performance.now();
  }

  /**
   * Acciones al pausar el juego
   */
  pauseGame() {
    // Incrementar tiempo pausado
    this.pausedTime += this.deltaTime;
  }

  /**
   * Acciones al terminar el juego
   */
  endGame() {
    this.playSound("gameOver");
    this.screenShake = 20;

    // Actualizar estadísticas
    this.stats.totalScore += this.score;
    this.stats.totalTime += this.gameTime;
    this.stats.totalJumps += this.bird.totalJumps;

    if (this.gameTime > this.stats.bestTime) {
      this.stats.bestTime = this.gameTime;
    }

    // Verificar nuevo record
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.isNewRecord = true;
      this.saveBestScore();
    }

    this.saveStats();
    console.log(
      `Game over! Score: ${this.score}, Time: ${(this.gameTime / 1000).toFixed(
        1
      )}s`
    );
  }

  /**
   * Bucle principal del juego
   */
  start() {
    const gameLoop = (currentTime) => {
      // Calcular delta time
      this.deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // Actualizar performance
      this.updatePerformance(currentTime);

      // Actualizar y renderizar según el estado
      this.update(this.deltaTime);
      this.render();

      // Continuar el bucle
      requestAnimationFrame(gameLoop);
    };

    this.lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  /**
   * Actualiza la lógica del juego
   */
  update(deltaTime) {
    switch (this.currentState) {
      case this.states.PLAYING:
        this.updateGameplay(deltaTime);
        break;
      case this.states.PAUSED:
        // No actualizar gameplay cuando está pausado
        break;
    }

    // Actualizar efectos visuales
    this.updateVisualEffects(deltaTime);
  }

  /**
   * Actualiza lógica de gameplay
   */
  updateGameplay(deltaTime) {
    this.gameTime += deltaTime;

    // Actualizar pájaro
    const birdAlive = this.bird.update(deltaTime / 16); // Normalizar a ~60fps
    if (!birdAlive) {
      this.changeState(this.states.GAME_OVER);
      return;
    }

    // Generar tuberías
    this.generatePipes();

    // Actualizar tuberías
    this.pipePool.updateActive(deltaTime / 16);

    // Verificar colisiones
    const collidedPipe = this.pipePool.checkCollisions(this.bird);
    if (collidedPipe) {
      this.changeState(this.states.GAME_OVER);
      return;
    }

    // Verificar puntuación
    const passedPipes = this.pipePool.checkPassed(this.bird);
    if (passedPipes.length > 0) {
      const points = this.pipePool.processScoring(passedPipes);
      if (points > 0) {
        this.score += points;
        this.playSound("score");
        console.log(`Score: ${this.score}`);
      }
    }

    // Verificar cambio de nivel
    this.checkLevelProgression();

    // Actualizar fondo
    this.backgroundOffset -= 0.5;
  }

  /**
   * Genera nuevas tuberías
   */
  generatePipes() {
    if (this.gameTime - this.lastPipeTime >= this.pipeInterval) {
      this.createPipePair();
      this.lastPipeTime = this.gameTime;
    }
  }

  /**
   * Crea un par de tuberías (superior e inferior)
   */
  createPipePair() {
    const pipeConfig = this.config.PIPES;
    const levelConfig = this.config.LEVELS[this.currentLevel];

    // Posición aleatoria
    const minY = -pipeConfig.HEIGHT / 2;
    const maxY = -pipeConfig.HEIGHT / 4;
    const randomY = minY + Math.random() * (maxY - minY);

    const gapSize = levelConfig.difficulty.gapSize;

    // Crear tubería superior
    const topPipe = this.pipePool.acquire(
      pipeConfig.INITIAL_X,
      randomY,
      "top",
      this.currentLevel
    );

    // Crear tubería inferior
    const bottomPipe = this.pipePool.acquire(
      pipeConfig.INITIAL_X,
      randomY + pipeConfig.HEIGHT + gapSize,
      "bottom",
      this.currentLevel
    );
  }

  /**
   * Verifica progresión de nivel
   */
  checkLevelProgression() {
    if (
      this.score >= this.config.SCORING.LEVEL_2_THRESHOLD &&
      this.currentLevel === 1
    ) {
      this.changeLevel(2);
    }
    // Agregar más niveles aquí en el futuro
  }

  /**
   * Cambia al siguiente nivel
   */
  changeLevel(newLevel) {
    if (this.currentLevel === newLevel) return;

    this.currentLevel = newLevel;
    this.isLevelTransitioning = true;
    this.levelTransitionTimer = 2000; // 2 segundos

    // Actualizar tuberías existentes
    this.pipePool.updateLevel(newLevel);

    // Actualizar clase del canvas
    this.canvas.className = `level-${newLevel}`;

    console.log(`Level changed to: ${newLevel}`);
  }

  /**
   * Actualiza efectos visuales
   */
  updateVisualEffects(deltaTime) {
    // Screen shake
    if (this.screenShake > 0) {
      this.screenShake *= 0.9;
      if (this.screenShake < 0.1) this.screenShake = 0;
    }

    // Level transition
    if (this.isLevelTransitioning) {
      this.levelTransitionTimer -= deltaTime;
      if (this.levelTransitionTimer <= 0) {
        this.isLevelTransitioning = false;
      }
    }
  }

  /**
   * Renderiza todo el juego
   */
  render() {
    // Limpiar canvas
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Aplicar screen shake
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      this.context.save();
      this.context.translate(shakeX, shakeY);
    }

    // Renderizar entidades
    this.pipePool.renderActive(this.context);
    this.bird.render(this.context);

    // Restaurar transformaciones
    if (this.screenShake > 0) {
      this.context.restore();
    }

    // Renderizar UI
    this.renderUI();

    // Renderizar información de debug
    if (window.DEBUG_MODE) {
      this.renderDebugInfo();
    }
  }

  /**
   * Renderiza la interfaz de usuario
   */
  renderUI() {
    const ctx = this.context;

    // Configurar texto
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.font = "bold 24px Arial";

    switch (this.currentState) {
      case this.states.LOADING:
        this.renderLoadingScreen(ctx);
        break;
      case this.states.MENU:
        this.renderMenuScreen(ctx);
        break;
      case this.states.PLAYING:
        this.renderGameplayUI(ctx);
        break;
      case this.states.PAUSED:
        this.renderPauseScreen(ctx);
        break;
      case this.states.GAME_OVER:
        this.renderGameOverScreen(ctx);
        break;
    }
  }

  /**
   * Renderiza pantalla de carga
   */
  renderLoadingScreen(ctx) {
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";

    const text = "Loading...";
    const x = this.canvas.width / 2;
    const y = this.canvas.height / 2;

    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);

    ctx.textAlign = "left";
  }

  /**
   * Renderiza menú principal
   */
  renderMenuScreen(ctx) {
    ctx.textAlign = "center";

    // Título
    ctx.font = "bold 48px Arial";
    const titleY = this.canvas.height / 3;
    ctx.strokeText("FLAPPY BIRD", this.canvas.width / 2, titleY);
    ctx.fillStyle = "#FFD700";
    ctx.fillText("FLAPPY BIRD", this.canvas.width / 2, titleY);

    // Subtítulo
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "white";
    const subtitleY = titleY + 60;
    ctx.strokeText("Enhanced Edition", this.canvas.width / 2, subtitleY);
    ctx.fillText("Enhanced Edition", this.canvas.width / 2, subtitleY);

    // Instrucciones
    ctx.font = "bold 20px Arial";
    const instructY = (this.canvas.height * 2) / 3;
    ctx.strokeText(
      "Click or Press SPACE to Start",
      this.canvas.width / 2,
      instructY
    );
    ctx.fillText(
      "Click or Press SPACE to Start",
      this.canvas.width / 2,
      instructY
    );

    // Best score
    if (this.bestScore > 0) {
      ctx.font = "bold 18px Arial";
      const bestY = instructY + 40;
      ctx.strokeText(
        `Best Score: ${this.bestScore}`,
        this.canvas.width / 2,
        bestY
      );
      ctx.fillText(
        `Best Score: ${this.bestScore}`,
        this.canvas.width / 2,
        bestY
      );
    }

    ctx.textAlign = "left";
  }

  /**
   * Renderiza UI durante gameplay
   */
  renderGameplayUI(ctx) {
    // Puntuación
    const scoreText = this.isNewRecord
      ? `Score: ${this.score}   NEW RECORD!`
      : `Score: ${this.score}   Best: ${this.bestScore}`;

    ctx.strokeText(scoreText, 10, 30);
    ctx.fillText(scoreText, 10, 30);

    // Nivel
    ctx.strokeText(`Level: ${this.currentLevel}`, 10, 60);
    ctx.fillText(`Level: ${this.currentLevel}`, 10, 60);

    // Transición de nivel
    if (this.isLevelTransitioning) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "bold 36px Arial";
      ctx.fillStyle = "#FFD700";

      const alpha = Math.sin(this.levelTransitionTimer / 200) * 0.5 + 0.5;
      ctx.globalAlpha = alpha;

      const levelName = this.config.LEVELS[this.currentLevel].name;
      ctx.strokeText(
        `LEVEL ${this.currentLevel}`,
        this.canvas.width / 2,
        this.canvas.height / 2 - 20
      );
      ctx.fillText(
        `LEVEL ${this.currentLevel}`,
        this.canvas.width / 2,
        this.canvas.height / 2 - 20
      );

      ctx.font = "bold 24px Arial";
      ctx.strokeText(
        levelName,
        this.canvas.width / 2,
        this.canvas.height / 2 + 20
      );
      ctx.fillText(
        levelName,
        this.canvas.width / 2,
        this.canvas.height / 2 + 20
      );

      ctx.restore();
    }
  }

  /**
   * Renderiza pantalla de pausa
   */
  renderPauseScreen(ctx) {
    // Overlay semi-transparente
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Texto de pausa
    ctx.textAlign = "center";
    ctx.font = "bold 48px Arial";
    ctx.fillStyle = "white";

    ctx.strokeText("PAUSED", this.canvas.width / 2, this.canvas.height / 2);
    ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2);

    ctx.font = "bold 20px Arial";
    ctx.strokeText(
      "Click or Press SPACE to Resume",
      this.canvas.width / 2,
      this.canvas.height / 2 + 50
    );
    ctx.fillText(
      "Click or Press SPACE to Resume",
      this.canvas.width / 2,
      this.canvas.height / 2 + 50
    );

    ctx.restore();
  }

  /**
   * Renderiza pantalla de game over
   */
  renderGameOverScreen(ctx) {
    // Game Over principal
    ctx.textAlign = "center";
    ctx.font = "bold 48px Arial";
    ctx.fillStyle = "#FF6347";

    const gameOverY = this.canvas.height / 2 - 60;
    ctx.strokeText("GAME OVER", this.canvas.width / 2, gameOverY);
    ctx.fillText("GAME OVER", this.canvas.width / 2, gameOverY);

    // Puntuación final
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "white";
    const scoreY = gameOverY + 50;

    if (this.isNewRecord) {
      ctx.fillStyle = "#FFD700";
      ctx.strokeText(
        `NEW RECORD: ${this.score}!`,
        this.canvas.width / 2,
        scoreY
      );
      ctx.fillText(`NEW RECORD: ${this.score}!`, this.canvas.width / 2, scoreY);
    } else {
      ctx.strokeText(
        `Final Score: ${this.score}`,
        this.canvas.width / 2,
        scoreY
      );
      ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, scoreY);
    }

    // Instrucciones
    ctx.font = "bold 18px Arial";
    ctx.fillStyle = "white";
    const instructY = scoreY + 40;
    ctx.strokeText(
      "Click or Press SPACE to Restart",
      this.canvas.width / 2,
      instructY
    );
    ctx.fillText(
      "Click or Press SPACE to Restart",
      this.canvas.width / 2,
      instructY
    );

    ctx.textAlign = "left";
  }

  /**
   * Renderiza información de debug
   */
  renderDebugInfo() {
    const ctx = this.context;

    ctx.save();
    ctx.fillStyle = "lime";
    ctx.font = "12px monospace";

    const debugInfo = [
      `FPS: ${this.performance.fps}`,
      `State: ${this.currentState}`,
      `Bird Y: ${this.bird.y.toFixed(1)}`,
      `Bird VelY: ${this.bird.velocityY.toFixed(1)}`,
      `Score: ${this.score}`,
      `Level: ${this.currentLevel}`,
      `Game Time: ${(this.gameTime / 1000).toFixed(1)}s`,
      `Pipes Active: ${this.pipePool.activeObjects.length}`,
    ];

    debugInfo.forEach((text, index) => {
      ctx.fillText(text, 10, this.canvas.height - 150 + index * 14);
    });

    ctx.restore();

    // Renderizar debug del pool
    this.pipePool.renderDebugInfo(ctx);
  }

  /**
   * Actualiza métricas de performance
   */
  updatePerformance(currentTime) {
    this.performance.frameCount++;

    if (currentTime - this.performance.lastFpsUpdate >= 1000) {
      this.performance.fps = this.performance.frameCount;
      this.performance.frameCount = 0;
      this.performance.lastFpsUpdate = currentTime;
    }
  }

  /**
   * Reproduce un sonido
   */
  playSound(soundName) {
    try {
      const audio = this.audio[soundName];
      if (audio) {
        audio.currentTime = 0;
        audio.play();
      }
    } catch (error) {
      console.warn(`Error playing sound ${soundName}:`, error);
    }
  }

  /**
   * Carga la mejor puntuación
   */
  loadBestScore() {
    try {
      const saved = localStorage.getItem("flappybird_best_score");
      return saved ? parseInt(saved) : 0;
    } catch (error) {
      console.warn("Error loading best score:", error);
      return 0;
    }
  }

  /**
   * Guarda la mejor puntuación
   */
  saveBestScore() {
    try {
      localStorage.setItem("flappybird_best_score", this.bestScore.toString());
    } catch (error) {
      console.warn("Error saving best score:", error);
    }
  }

  /**
   * Carga estadísticas
   */
  loadStats() {
    try {
      const saved = localStorage.getItem("flappybird_stats");
      if (saved) {
        this.stats = { ...this.stats, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn("Error loading stats:", error);
    }
  }

  /**
   * Guarda estadísticas
   */
  saveStats() {
    try {
      localStorage.setItem("flappybird_stats", JSON.stringify(this.stats));
    } catch (error) {
      console.warn("Error saving stats:", error);
    }
  }

  /**
   * Obtiene información del estado actual del juego
   */
  getGameState() {
    return {
      state: this.currentState,
      score: this.score,
      bestScore: this.bestScore,
      level: this.currentLevel,
      gameTime: this.gameTime,
      bird: this.bird.getStats(),
      pipes: this.pipePool.getStats(),
      performance: this.performance,
      stats: this.stats,
    };
  }

  /**
   * Destruye el juego y libera recursos
   */
  destroy() {
    this.pipePool.destroy();
    this.saveStats();
    this.saveBestScore();
    console.log("Game destroyed");
  }
}
