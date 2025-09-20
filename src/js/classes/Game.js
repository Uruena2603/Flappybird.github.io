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

    // Referencias a managers externos
    this.firebaseManager = null;
    this.audioManager = null;
    this.storageManager = null;
    this.assetManager = null;

    // NUEVO: Estados para Game Over (evitar loop infinito)
    this.gameOverStateChecked = false;
    this.gameOverUserState = null; // 'permanent', 'anonymous', 'offline'

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

    // Control de logs para evitar spam
    this.gameOverLogged = false;
    this.gameOverStateLogged = false;
    this.gameOverPromptLogged = false;
    this.gameOverFallbackLogged = false;
    this.registrationPromptLogged = false;
    this.registrationPromptRenderedLogged = false;

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
   * Configura los managers externos
   * @param {Object} managers - Objeto con todos los managers
   */
  setManagers(managers) {
    console.log("🔗 Game: Configurando managers...");

    this.firebaseManager = managers.firebase;
    this.audioManager = managers.audio;
    this.storageManager = managers.storage;
    this.assetManager = managers.asset;

    // NUEVO: Configurar callback para cambios de estado de autenticación
    if (
      this.firebaseManager &&
      typeof this.firebaseManager.onAuthStateChanged === "function"
    ) {
      this.firebaseManager.onAuthStateChanged((authState, user) => {
        console.log("🔗 Game: Estado de auth cambió:", authState);
        console.log(
          "🔗 Game: Usuario:",
          user ? user.displayName || user.email || "anónimo" : "ninguno"
        );

        // Resetear flags de logging cuando cambia el estado de auth
        this.gameOverStateLogged = false;
        this.gameOverPromptLogged = false;
      });
    }

    console.log("🔗 Game: Managers configurados:", {
      firebase: !!this.firebaseManager,
      audio: !!this.audioManager,
      storage: !!this.storageManager,
      asset: !!this.assetManager,
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
   * Verifica si hay un modal activo (NUEVO)
   * @returns {boolean}
   */
  isModalActive() {
    // Verificar si existe algún modal en el DOM
    const modals = [
      document.querySelector(".nickname-modal-overlay"),
      document.querySelector(".registration-modal-overlay"),
      // Agregar otros modales aquí en el futuro
    ];

    return modals.some((modal) => modal !== null);
  }

  /**
   * Configura event listeners (MEJORADO PARA MODALES)
   */
  setupEventListeners() {
    // Prevenir comportamiento por defecto en teclas de juego
    document.addEventListener("keydown", (e) => {
      // NUEVO: Verificar si hay un modal activo
      if (this.isModalActive()) {
        // Si hay modal activo, NO procesar controles de juego
        return;
      }

      // Solo procesar controles de juego si NO hay modal
      this.handleKeyDown(e);
    });

    document.addEventListener("keyup", (e) => {
      // NUEVO: Verificar si hay un modal activo
      if (this.isModalActive()) {
        return;
      }

      this.handleKeyUp(e);
    });

    // Touch/Click events - también verificar modales
    this.canvas.addEventListener("click", (e) => {
      if (this.isModalActive()) {
        return;
      }
      this.handleClick(e);
    });

    this.canvas.addEventListener("touchstart", (e) => {
      if (this.isModalActive()) {
        return;
      }
      this.handleTouch(e);
    });

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
   * Maneja eventos de teclado (presionar) - MEJORADO CON VERIFICACIÓN DE MODAL
   */
  handleKeyDown(e) {
    // CRÍTICO: No procesar si hay modal activo
    if (this.isModalActive()) {
      return;
    }

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
        // NUEVO: Solo reiniciar si NO hay modal activo
        if (!this.isModalActive()) {
          this.restart();
        }
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
        console.log("🔥 Game: handleJumpInput in GAME_OVER state");
        // ACTUALIZADO: Usar getUserInfo para detección precisa
        if (this.firebaseManager && this.firebaseManager.isReady()) {
          const userInfo = this.firebaseManager.getUserInfo();
          console.log("🔥 Game: Firebase listo, verificando estado real...");
          console.log("🔥 Game: Info de usuario:", userInfo);

          if (userInfo && userInfo.isPermanent) {
            // Usuario registrado permanentemente - mostrar leaderboard
            console.log("🔥 Game: Usuario permanente - mostrando leaderboard");
            this.showLeaderboard();
            return; // IMPORTANTE: No continuar con restart
          } else if (userInfo && userInfo.isAnonymous) {
            // Usuario anónimo - mostrar modal de registro
            console.log(
              "🔥 Game: Usuario anónimo - mostrando modal de registro"
            );
            this.showRegistrationModal();
            return; // IMPORTANTE: No continuar con restart
          }
        }

        // Fallback - reiniciar juego si no hay Firebase o hay error
        console.log(
          "🔥 Game: Firebase no disponible o error, reiniciando juego"
        );
        this.restart();
        break;
      case this.states.PAUSED:
        this.resume();
        break;
    }
  }

  /**
   * Muestra el modal de registro para usuarios anónimos
   */
  async showRegistrationModal() {
    try {
      console.log("🔥 Game: Iniciando proceso de registro...");

      // Crear modal DOM para registro
      const modal = this.createRegistrationModal();
      document.body.appendChild(modal);

      // Pausar el juego mientras se muestra el modal
      this.previousGameState = this.currentState;
    } catch (error) {
      console.error("🔥 Game: Error mostrando modal de registro:", error);
      // Fallback - reiniciar juego si hay error
      this.restart();
    }
  }

  /**
   * Muestra el leaderboard (ACTUALIZADO CON NICKNAME INTELIGENTE)
   */
  async showLeaderboard() {
    console.log("🔥 Game: Abriendo leaderboard...");

    try {
      // Verificar si el usuario necesita configurar nickname
      const needsSetup = await this.firebaseManager.needsNicknameSetup();

      if (needsSetup) {
        console.log(
          "🔥 Game: Usuario necesita configurar nickname personalizado"
        );

        try {
          const nickname = await this.showNicknameModal();
          console.log("🔥 Game: ✅ Nickname configurado:", nickname);
        } catch (error) {
          console.log("🔥 Game: Configuración de nickname cancelada");
          this.restart(); // Volver al juego
          return;
        }
      }

      // Obtener datos del leaderboard usando el nuevo backend
      console.log("🔥 Game: Obteniendo datos del leaderboard...");

      const [globalLeaderboard, userRanking] = await Promise.all([
        this.firebaseManager.getGlobalLeaderboard(10),
        this.firebaseManager.getUserRanking(),
      ]);

      console.log("🔥 Game: ✅ Datos del leaderboard obtenidos");
      console.log("📊 Global Leaderboard:", globalLeaderboard);
      console.log("👤 User Ranking:", userRanking);

      // Temporal: Mostrar información en consola hasta implementar UI en Etapa 6
      const currentNickname = await this.firebaseManager.getUserNickname();

      let leaderboardInfo = `🎮 ¡Hola, ${currentNickname}!\n\n`;

      if (userRanking && userRanking.bestScore > 0) {
        leaderboardInfo += `🏆 Tu mejor puntuación: ${userRanking.bestScore}\n`;
        leaderboardInfo += `📍 Tu posición: #${userRanking.rank}\n`;
        leaderboardInfo += `🎮 Juegos totales: ${userRanking.totalGames}\n`;
        leaderboardInfo += `📊 Promedio: ${userRanking.averageScore}\n\n`;
      }

      leaderboardInfo += `� TOP 10 GLOBAL:\n`;
      globalLeaderboard.forEach((entry, index) => {
        const indicator = entry.isCurrentUser ? "👤" : "🏅";
        leaderboardInfo += `${indicator} #${entry.rank} ${entry.nickname}: ${entry.score}\n`;
      });

      leaderboardInfo += `\n🔄 UI del leaderboard se implementará en Etapa 6`;

      this.showTemporaryMessage(
        "📋 Leaderboard Backend Activo",
        leaderboardInfo.replace(/\n/g, "<br>")
      );

      setTimeout(() => {
        this.restart();
      }, 8000); // Más tiempo para ver los datos
    } catch (error) {
      console.error("🔥 Game: Error mostrando leaderboard:", error);
      this.restart();
    }
  }

  /**
   * Muestra modal para configurar nickname
   * @returns {Promise<string>} Nickname configurado
   */
  async showNicknameModal() {
    return new Promise((resolve, reject) => {
      // Crear overlay del modal
      const overlay = document.createElement("div");
      overlay.className = "nickname-modal-overlay";
      overlay.innerHTML = `
        <div class="nickname-modal">
          <div class="nickname-header">
            <h2>🎮 ¡Personaliza tu Nickname!</h2>
            <p>Elige un nombre único para aparecer en el leaderboard</p>
          </div>
          
          <div class="nickname-form">
            <input 
              type="text" 
              id="nickname-input" 
              placeholder="Ingresa tu nickname..." 
              maxlength="20"
              autocomplete="off"
              autofocus
            >
            <div class="nickname-counter">
              <span id="char-counter">0/20</span>
            </div>
            <div class="nickname-suggestions">
              <small>Sugerencia: Usa letras, números y guiones</small>
            </div>
            <div class="nickname-error" id="nickname-error" style="display: none;"></div>
          </div>
          
          <div class="nickname-actions">
            <button id="cancel-nickname" class="btn-secondary">Cancelar</button>
            <button id="confirm-nickname" class="btn-primary" disabled>Confirmar</button>
          </div>
        </div>
      `;

      // Agregar estilos al modal
      this.addNicknameModalStyles();

      // Referencias a elementos
      document.body.appendChild(overlay);
      const input = overlay.querySelector("#nickname-input");
      const confirmBtn = overlay.querySelector("#confirm-nickname");
      const cancelBtn = overlay.querySelector("#cancel-nickname");
      const errorDiv = overlay.querySelector("#nickname-error");
      const counter = overlay.querySelector("#char-counter");

      // CRÍTICO: Función de limpieza
      const cleanup = () => {
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
      };

      // Validación en tiempo real
      input.addEventListener("input", (e) => {
        // NUEVO: Prevenir que el evento llegue al juego
        e.stopPropagation();

        const value = input.value.trim();
        const length = value.length;

        counter.textContent = `${length}/20`;

        // Validación de caracteres
        const validChars = /^[a-zA-Z0-9\s\-_]*$/;
        const isValidChars = validChars.test(value);

        if (length >= 2 && length <= 20 && isValidChars) {
          confirmBtn.disabled = false;
          confirmBtn.classList.remove("disabled");
          input.classList.remove("error");
          errorDiv.style.display = "none";

          // Cambiar color del contador a verde
          counter.style.color = "#2ecc71";
        } else {
          confirmBtn.disabled = true;
          confirmBtn.classList.add("disabled");
          counter.style.color = length > 20 ? "#e74c3c" : "#95a5a6";

          if (!isValidChars && value.length > 0) {
            this.showNicknameError(
              errorDiv,
              "Solo se permiten letras, números, espacios y guiones"
            );
          }
        }
      });

      // NUEVO: Manejar eventos de teclado específicamente para el modal
      input.addEventListener("keydown", (e) => {
        // CRÍTICO: Prevenir que lleguen al listener global del juego
        e.stopPropagation();

        if (e.key === "Enter" && !confirmBtn.disabled) {
          e.preventDefault();
          confirmBtn.click();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelBtn.click();
        }
        // Para cualquier otra tecla (incluida 'r'), permitir comportamiento normal del input
      });

      // Prevenir eventos en todo el modal
      overlay.addEventListener("keydown", (e) => {
        e.stopPropagation();
      });

      overlay.addEventListener("keyup", (e) => {
        e.stopPropagation();
      });

      // Confirmar nickname
      confirmBtn.addEventListener("click", async () => {
        const nickname = input.value.trim();

        if (nickname.length < 2) {
          this.showNicknameError(
            errorDiv,
            "El nickname debe tener al menos 2 caracteres"
          );
          return;
        }

        confirmBtn.textContent = "Verificando...";
        confirmBtn.disabled = true;

        try {
          await this.firebaseManager.setUserNickname(nickname);
          cleanup();
          resolve(nickname);
        } catch (error) {
          confirmBtn.textContent = "Confirmar";
          confirmBtn.disabled = false;
          this.showNicknameError(errorDiv, error.message);
        }
      });

      // Cancelar
      cancelBtn.addEventListener("click", () => {
        cleanup();
        reject(new Error("Configuración de nickname cancelada"));
      });

      // Enter para confirmar, Escape para cancelar
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !confirmBtn.disabled) {
          confirmBtn.click();
        } else if (e.key === "Escape") {
          cancelBtn.click();
        }
      });

      // Focus automático con delay
      setTimeout(() => {
        input.focus();
        // NUEVO: Seleccionar todo el texto si hay contenido previo
        input.select();
      }, 100);
    });
  }

  /**
   * Muestra error en el modal de nickname
   */
  showNicknameError(errorDiv, message) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
    errorDiv.classList.add("shake");

    setTimeout(() => {
      errorDiv.classList.remove("shake");
    }, 500);
  }

  /**
   * Muestra mensaje temporal en pantalla
   */
  showTemporaryMessage(title, subtitle) {
    const overlay = document.createElement("div");
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex; align-items: center; justify-content: center;
        z-index: 10000; font-family: Arial;
      ">
        <div style="
          background: linear-gradient(145deg, #2c3e50, #34495e);
          color: white; text-align: center; padding: 30px;
          border-radius: 15px; max-width: 400px;
          border: 2px solid #3498db;
        ">
          <h2 style="color: #FFD700; margin-bottom: 15px;">${title}</h2>
          <p style="margin-bottom: 20px;">${subtitle}</p>
          <div style="font-size: 32px;">✨</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 3000);
  }

  /**
   * Agrega estilos CSS para el modal de nickname
   */
  addNicknameModalStyles() {
    if (document.getElementById("nickname-modal-styles")) return;

    const style = document.createElement("style");
    style.id = "nickname-modal-styles";
    style.textContent = `
      .nickname-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
        
        /* NUEVO: Asegurar que capture todos los eventos */
        pointer-events: all;
      }

      .nickname-modal {
        background: linear-gradient(145deg, #2c3e50, #34495e);
        border-radius: 15px;
        padding: 30px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        animation: slideIn 0.4s ease-out;
        border: 2px solid #3498db;
        
        /* NUEVO: Evitar que eventos atraviesen el modal */
        pointer-events: all;
        position: relative;
      }

      .nickname-header h2 {
        color: #ecf0f1;
        margin-bottom: 10px;
        text-align: center;
        font-size: 1.5em;
        user-select: none;
      }

      .nickname-header p {
        color: #bdc3c7;
        text-align: center;
        margin-bottom: 20px;
        font-size: 0.9em;
        user-select: none;
      }

      .nickname-form input {
        width: 100%;
        padding: 12px;
        border: 2px solid #3498db;
        border-radius: 8px;
        font-size: 16px;
        background: #ecf0f1;
        color: #2c3e50;
        font-family: inherit;
        transition: border-color 0.3s;
        box-sizing: border-box;
        
        /* NUEVO: Asegurar que el input sea interactivo */
        pointer-events: all;
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
      }

      .nickname-form input:focus {
        outline: none;
        border-color: #2ecc71;
        box-shadow: 0 0 10px rgba(46, 204, 113, 0.3);
        background: #fff;
      }

      .nickname-form input.error {
        border-color: #e74c3c;
        box-shadow: 0 0 10px rgba(231, 76, 60, 0.3);
      }

      /* NUEVO: Estilo especial cuando el input está activo */
      .nickname-form input:focus::placeholder {
        opacity: 0.5;
      }

      .nickname-counter {
        text-align: right;
        margin-top: 5px;
        color: #95a5a6;
        font-size: 0.8em;
        transition: color 0.3s;
        user-select: none;
      }

      .nickname-suggestions {
        text-align: center;
        margin-top: 5px;
        color: #7f8c8d;
        font-size: 0.75em;
        user-select: none;
      }

      .nickname-error {
        color: #e74c3c;
        text-align: center;
        margin-top: 10px;
        padding: 8px;
        background: rgba(231, 76, 60, 0.1);
        border-radius: 5px;
        border: 1px solid rgba(231, 76, 60, 0.3);
        font-size: 0.85em;
        user-select: none;
      }

      .nickname-error.shake {
        animation: shake 0.5s ease-in-out;
      }

      .nickname-actions {
        display: flex;
        gap: 15px;
        margin-top: 25px;
      }

      .nickname-actions button {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
        font-family: inherit;
        user-select: none;
      }

      .btn-primary {
        background: linear-gradient(145deg, #3498db, #2980b9);
        color: white;
      }

      .btn-primary:hover:not(.disabled) {
        background: linear-gradient(145deg, #2980b9, #1abc9c);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(52, 152, 219, 0.3);
      }

      .btn-primary.disabled {
        background: #95a5a6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .btn-secondary {
        background: linear-gradient(145deg, #95a5a6, #7f8c8d);
        color: white;
      }

      .btn-secondary:hover {
        background: linear-gradient(145deg, #7f8c8d, #95a5a6);
        transform: translateY(-2px);
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideIn {
        from { 
          opacity: 0; 
          transform: translateY(-50px) scale(0.9); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0) scale(1); 
        }
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }

      /* Responsive mejorado */
      @media (max-width: 480px) {
        .nickname-modal {
          width: 95%;
          padding: 20px;
          margin: 10px;
        }
        
        .nickname-actions {
          flex-direction: column;
          gap: 10px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Crea el modal DOM para registro de usuario
   * @returns {HTMLElement} - Elemento modal
   */
  createRegistrationModal() {
    // Crear overlay del modal
    const modalOverlay = document.createElement("div");
    modalOverlay.id = "registration-modal-overlay";
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;

    // Crear contenedor del modal
    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 15px;
      padding: 30px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      max-width: 400px;
      min-width: 320px;
      border: 3px solid #FFD700;
      animation: modalSlideIn 0.3s ease-out;
    `;

    // Agregar animación CSS
    const style = document.createElement("style");
    style.textContent = `
      @keyframes modalSlideIn {
        from { transform: translateY(-50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // Título
    const title = document.createElement("h2");
    title.textContent = "🏆 ¡Regístrate y Compite!";
    title.style.cssText = `
      color: #FFD700;
      margin-bottom: 15px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      font-size: 24px;
    `;

    // Descripción
    const description = document.createElement("p");
    description.textContent =
      "Guarda tu puntuación y compite en el ranking global";
    description.style.cssText = `
      color: white;
      margin-bottom: 25px;
      font-size: 16px;
    `;

    // Botón de Google
    const googleBtn = document.createElement("button");
    googleBtn.innerHTML = "🚀 Registrarse con Google";
    googleBtn.style.cssText = `
      background: #4285F4;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      margin: 10px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;

    googleBtn.onmouseover = () => {
      googleBtn.style.background = "#3367D6";
      googleBtn.style.transform = "translateY(-2px)";
    };

    googleBtn.onmouseout = () => {
      googleBtn.style.background = "#4285F4";
      googleBtn.style.transform = "translateY(0)";
    };

    // Botón cancelar
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Ahora No";
    cancelBtn.style.cssText = `
      background: transparent;
      color: #FFD700;
      border: 2px solid #FFD700;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      margin: 10px;
      transition: all 0.3s ease;
    `;

    cancelBtn.onmouseover = () => {
      cancelBtn.style.background = "#FFD700";
      cancelBtn.style.color = "#333";
    };

    cancelBtn.onmouseout = () => {
      cancelBtn.style.background = "transparent";
      cancelBtn.style.color = "#FFD700";
    };

    // Event listeners
    googleBtn.onclick = () => this.handleGoogleSignIn(modalOverlay);
    cancelBtn.onclick = () => this.closeModal(modalOverlay);

    // Cerrar al hacer click fuera del modal
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) {
        this.closeModal(modalOverlay);
      }
    };

    // Agregar elementos al modal
    modalContent.appendChild(title);
    modalContent.appendChild(description);
    modalContent.appendChild(googleBtn);
    modalContent.appendChild(cancelBtn);
    modalOverlay.appendChild(modalContent);

    return modalOverlay;
  }

  /**
   * Maneja el proceso de registro con Google (MEJORADO PARA PRODUCCIÓN)
   * @param {HTMLElement} modal - Modal a cerrar
   */
  async handleGoogleSignIn(modal) {
    try {
      const isProduction =
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1";

      // Mostrar loading apropiado según el entorno
      const loadingDiv = document.createElement("div");
      const loadingText = isProduction
        ? "🚀 Redirigiendo a Google..."
        : "⏳ Conectando con Google...";

      loadingDiv.textContent = loadingText;
      loadingDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-size: 16px;
        text-align: center;
      `;

      // Agregar información adicional para producción
      if (isProduction) {
        const infoDiv = document.createElement("div");
        infoDiv.textContent = "Se abrirá una nueva pestaña para autenticación";
        infoDiv.style.cssText = `
          font-size: 12px;
          color: #ccc;
          margin-top: 10px;
        `;
        loadingDiv.appendChild(infoDiv);
      }

      modal.appendChild(loadingDiv);

      console.log("🔥 Game: Iniciando autenticación con Google...");

      // Llamar al FirebaseManager
      const success = await this.firebaseManager.upgradeAnonymousToGoogle();

      // Remover loading
      if (loadingDiv && loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }

      if (success) {
        if (isProduction) {
          // En producción, el redirect manejará el cierre del modal
          console.log("🔥 Game: Redirect iniciado - esperando resultado...");

          // Mostrar mensaje temporal
          const redirectMsg = document.createElement("div");
          redirectMsg.textContent =
            "Si no se redirige automáticamente, recarga la página";
          redirectMsg.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: #FFD700;
            padding: 15px;
            border-radius: 10px;
            font-size: 14px;
            text-align: center;
          `;
          modal.appendChild(redirectMsg);

          // Auto-remover después de 5 segundos
          setTimeout(() => {
            if (redirectMsg && redirectMsg.parentNode) {
              redirectMsg.parentNode.removeChild(redirectMsg);
            }
          }, 5000);
        } else {
          console.log("🔥 Game: ✅ Registro/Login exitoso");
          this.showSuccessMessage(modal);
        }
      } else {
        console.log("🔥 Game: ❌ Error en proceso");
        this.showErrorMessage(
          modal,
          "Error inesperado en el proceso de registro"
        );
      }
    } catch (error) {
      console.error("🔥 Game: Error en handleGoogleSignIn:", error);

      // Remover loading si aún está presente
      const loadingDiv = modal.querySelector("div");
      if (loadingDiv && loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }

      // Mostrar mensaje de error específico
      this.showErrorMessage(
        modal,
        error.message || "Error en el proceso de registro"
      );
    }
  }

  /**
   * Muestra mensaje de éxito y cierra modal
   * @param {HTMLElement} modal - Modal a cerrar
   */
  showSuccessMessage(modal) {
    // Limpiar el modal
    const modalContent = modal.querySelector("div");
    modalContent.innerHTML = "";

    // Crear mensaje de éxito elegante
    modalContent.style.cssText = `
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      border-radius: 15px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      max-width: 400px;
      min-width: 320px;
      border: 3px solid #FFD700;
      animation: successPulse 0.6s ease-out;
    `;

    // Agregar animación CSS
    const style = document.createElement("style");
    style.textContent = `
      @keyframes successPulse {
        0% { transform: scale(0.8); opacity: 0; }
        50% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // Contenido del mensaje de éxito
    modalContent.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
      <h2 style="color: #FFD700; margin-bottom: 15px; font-size: 24px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
        ¡Registro Exitoso!
      </h2>
      <p style="color: white; margin-bottom: 20px; font-size: 16px;">
        Tu cuenta de Google ha sido vinculada correctamente.<br>
        ¡Tus puntuaciones se guardarán automáticamente!
      </p>
      <div style="font-size: 32px; margin-bottom: 20px;">🏆</div>
      <button id="success-continue-btn" style="
        background: #FFD700;
        color: #333;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      ">Continuar Jugando</button>
    `;

    // Event listener para el botón
    const continueBtn = modal.querySelector("#success-continue-btn");
    continueBtn.addEventListener("mouseover", () => {
      continueBtn.style.background = "#FFC107";
      continueBtn.style.transform = "translateY(-2px)";
    });
    continueBtn.addEventListener("mouseout", () => {
      continueBtn.style.background = "#FFD700";
      continueBtn.style.transform = "translateY(0)";
    });
    continueBtn.addEventListener("click", () => {
      this.closeModal(modal);
    });

    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
      if (modal && modal.parentNode) {
        this.closeModal(modal);
      }
    }, 5000);
  }

  /**
   * Muestra mensaje de error
   * @param {HTMLElement} modal - Modal a cerrar
   * @param {string} customMessage - Mensaje personalizado de error (opcional)
   */
  showErrorMessage(modal, customMessage = null) {
    // Limpiar el modal
    const modalContent = modal.querySelector("div");
    modalContent.innerHTML = "";

    // Definir mensaje según el contexto
    let errorTitle = "Error en el Registro";
    let errorMessage =
      "No se pudo completar el registro con Google.<br>Por favor, inténtalo de nuevo más tarde.";

    if (customMessage) {
      if (
        customMessage.includes("already associated") ||
        customMessage.includes("credential-already-in-use")
      ) {
        errorTitle = "Cuenta Ya Registrada";
        errorMessage =
          "Esta cuenta de Google ya está en uso.<br>Serás conectado automáticamente.";
      } else if (
        customMessage.includes("popup") ||
        customMessage.includes("cancelled")
      ) {
        errorTitle = "Proceso Cancelado";
        errorMessage =
          "El proceso de registro fue cancelado.<br>Puedes intentarlo de nuevo cuando gustes.";
      } else if (customMessage.includes("blocked")) {
        errorTitle = "Popup Bloqueado";
        errorMessage =
          "Tu navegador bloqueó la ventana de Google.<br>Permite popups para este sitio e intenta de nuevo.";
      } else {
        errorMessage =
          customMessage + "<br>Intenta nuevamente en unos momentos.";
      }
    }

    // Crear mensaje de error elegante
    modalContent.style.cssText = `
      background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
      border-radius: 15px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      max-width: 400px;
      min-width: 320px;
      border: 3px solid #FF5722;
      animation: errorShake 0.6s ease-out;
    `;

    // Agregar animación CSS
    const style = document.createElement("style");
    style.textContent = `
      @keyframes errorShake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
    `;
    document.head.appendChild(style);

    // Contenido del mensaje de error
    modalContent.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">😞</div>
      <h2 style="color: #FFD700; margin-bottom: 15px; font-size: 24px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
        ${errorTitle}
      </h2>
      <p style="color: white; margin-bottom: 20px; font-size: 16px;">
        ${errorMessage}
      </p>
      <div style="font-size: 32px; margin-bottom: 20px;">🔄</div>
      <button id="error-retry-btn" style="
        background: #FF9800;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        margin-right: 10px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      ">Reintentar</button>
      <button id="error-continue-btn" style="
        background: transparent;
        color: #FFD700;
        border: 2px solid #FFD700;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
      ">Continuar sin Registro</button>
    `;

    // Event listeners para los botones
    const retryBtn = modal.querySelector("#error-retry-btn");
    const continueBtn = modal.querySelector("#error-continue-btn");

    retryBtn.addEventListener("mouseover", () => {
      retryBtn.style.background = "#F57C00";
      retryBtn.style.transform = "translateY(-2px)";
    });
    retryBtn.addEventListener("mouseout", () => {
      retryBtn.style.background = "#FF9800";
      retryBtn.style.transform = "translateY(0)";
    });
    retryBtn.addEventListener("click", () => {
      // Reiniciar el proceso de registro
      this.closeModal(modal);
      setTimeout(() => this.showRegistrationModal(), 500);
    });

    continueBtn.addEventListener("mouseover", () => {
      continueBtn.style.background = "#FFD700";
      continueBtn.style.color = "#333";
    });
    continueBtn.addEventListener("mouseout", () => {
      continueBtn.style.background = "transparent";
      continueBtn.style.color = "#FFD700";
    });
    continueBtn.addEventListener("click", () => {
      this.closeModal(modal);
    });

    // Auto-cerrar después de 8 segundos
    setTimeout(() => {
      if (modal && modal.parentNode) {
        this.closeModal(modal);
      }
    }, 8000);
  }

  /**
   * Cierra el modal y continúa el juego
   * @param {HTMLElement} modal - Modal a cerrar
   */
  closeModal(modal) {
    if (modal && modal.parentNode) {
      modal.remove();
    }
    // Reiniciar el juego después de cerrar el modal
    this.restart();
  }

  /**
   * Verifica el estado del usuario UNA SOLA VEZ al entrar a Game Over
   */
  checkUserStateForGameOver() {
    console.log("🔥 Game: Verificando estado de usuario para Game Over...");

    if (!this.firebaseManager || !this.firebaseManager.isReady()) {
      console.log("🔥 Game: Firebase no disponible");
      this.gameOverUserState = "offline";
      return;
    }

    try {
      const userInfo = this.firebaseManager.getUserInfo();
      console.log("🔥 Game: Estado de usuario detectado:", userInfo);

      if (userInfo && userInfo.isPermanent) {
        console.log("🔥 Game: Usuario permanente - mostrando leaderboard");
        this.gameOverUserState = "permanent";
      } else if (userInfo && userInfo.isAnonymous) {
        console.log("🔥 Game: Usuario anónimo - mostrando registro");
        this.gameOverUserState = "anonymous";
      } else {
        console.log("🔥 Game: Estado desconocido - fallback");
        this.gameOverUserState = "offline";
      }
    } catch (error) {
      console.error("🔥 Game: Error verificando estado:", error);
      this.gameOverUserState = "offline";
    }
  }

  /**
   * Cambia el estado del juego
   */
  changeState(newState) {
    if (this.currentState === newState) return;

    this.previousState = this.currentState;
    this.currentState = newState;

    // CRÍTICO: Resetear estados de game over
    if (newState === this.states.GAME_OVER) {
      this.gameOverStateChecked = false;
      this.gameOverUserState = null;
    }

    // Resetear flags de logging solo en cambios de estado
    if (newState !== this.states.GAME_OVER) {
      this.gameOverLogged = false;
      this.gameOverStateLogged = false;
      this.gameOverPromptLogged = false;
      this.gameOverFallbackLogged = false;
      this.registrationPromptLogged = false;
      this.registrationPromptRenderedLogged = false;
    }

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
  /**
   * Finaliza el juego y guarda estadísticas (ACTUALIZADO CON LEADERBOARD)
   */
  async endGame() {
    this.playSound("gameOver");
    this.screenShake = 20;

    // Calcular tiempo de juego en segundos
    const gameTimeInSeconds = this.gameTime / 1000;

    // Actualizar estadísticas locales
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

    // Calcular estadísticas del juego para Firebase
    const gameStats = {
      totalJumps: this.bird?.totalJumps || 0,
      accuracy: this.calculateAccuracy(),
      survivalTime: gameTimeInSeconds,
      maxHeight: this.bird?.maxHeight || 0,
      averageHeight: this.bird?.averageHeight || 0,
    };

    // Guardar estadísticas locales
    this.saveStats();

    // Intentar guardar en Firebase si el usuario está registrado
    if (
      this.firebaseManager &&
      this.firebaseManager.isUserPermanentlyRegistered()
    ) {
      try {
        console.log("🔥 Game: Guardando puntuación en Firebase...");
        const saveSuccess = await this.firebaseManager.saveScore(
          this.score,
          this.currentLevel,
          gameTimeInSeconds,
          gameStats
        );

        if (saveSuccess) {
          console.log("🔥 Game: ✅ Puntuación guardada en Firebase");
        } else {
          console.warn(
            "🔥 Game: ⚠️ No se pudo guardar la puntuación en Firebase"
          );
        }
      } catch (error) {
        console.error("🔥 Game: ❌ Error guardando puntuación:", error);
      }
    }

    console.log(
      `Game over! Score: ${this.score}, Time: ${gameTimeInSeconds.toFixed(1)}s`
    );
  }

  /**
   * Calcula precisión de saltos
   * @returns {number} Porcentaje de precisión (0-100)
   */
  calculateAccuracy() {
    if (!this.bird || !this.bird.totalJumps) return 0;

    const totalJumps = this.bird.totalJumps;
    const effectiveJumps = Math.max(1, this.score * 2); // Estimación de saltos efectivos

    return Math.min(100, Math.round((effectiveJumps / totalJumps) * 100));
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
   * Renderiza pantalla de game over (SIN LOOP INFINITO)
   */
  renderGameOverScreen(ctx) {
    // Overlay semi-transparente
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Configurar estilo de texto
    ctx.textAlign = "center";
    ctx.font = "bold 48px Arial";
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;

    // Título Game Over
    const titleY = this.canvas.height / 3;
    ctx.strokeText("GAME OVER", this.canvas.width / 2, titleY);
    ctx.fillText("GAME OVER", this.canvas.width / 2, titleY);

    // Puntuación final
    ctx.font = "bold 24px Arial";
    const scoreY = titleY + 60;

    if (this.isNewRecord) {
      ctx.fillStyle = "#FFD700";
      ctx.strokeText(
        "🎉 ¡NUEVO RECORD! 🎉",
        this.canvas.width / 2,
        scoreY - 30
      );
      ctx.fillText("🎉 ¡NUEVO RECORD! 🎉", this.canvas.width / 2, scoreY - 30);
    }

    ctx.fillStyle = "white";
    ctx.strokeText(
      `Puntuación Final: ${this.score}`,
      this.canvas.width / 2,
      scoreY
    );
    ctx.fillText(
      `Puntuación Final: ${this.score}`,
      this.canvas.width / 2,
      scoreY
    );

    // CORREGIDO: Verificar Firebase solo UNA VEZ por game over
    let instructY = scoreY + 60;

    // CRÍTICO: Solo verificar estado una vez cuando entra a game over
    if (!this.gameOverStateChecked) {
      this.gameOverStateChecked = true;
      this.checkUserStateForGameOver();
    }

    // Renderizar UI según estado detectado (SIN verificar Firebase cada frame)
    if (this.gameOverUserState === "permanent") {
      this.renderLeaderboardPrompt(ctx, instructY);
      instructY += 100;
    } else if (this.gameOverUserState === "anonymous") {
      this.renderRegistrationPrompt(ctx, instructY);
      instructY += 100;
    }

    // Instrucciones básicas
    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "white";
    ctx.strokeText(
      "Presiona R para Reiniciar",
      this.canvas.width / 2,
      instructY
    );
    ctx.fillText("Presiona R para Reiniciar", this.canvas.width / 2, instructY);

    ctx.restore();
  }

  /**
   * Renderiza el prompt de registro para usuarios anónimos
   * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
   * @param {number} startY - Posición Y inicial
   */
  renderRegistrationPrompt(ctx, startY) {
    // Solo log una vez por sesión
    if (!this.registrationPromptLogged) {
      console.log("🔥 Game: Rendering registration prompt at Y:", startY);
      this.registrationPromptLogged = true;
    }

    // Fondo del prompt con mejor dimensionado
    ctx.fillStyle = "rgba(255, 165, 0, 0.4)";
    ctx.strokeStyle = "#FFA500";
    ctx.lineWidth = 3;
    const promptWidth = 400;
    const promptHeight = 90;
    const promptX = (this.canvas.width - promptWidth) / 2;
    const promptY = startY - 20;

    ctx.fillRect(promptX, promptY, promptWidth, promptHeight);
    ctx.strokeRect(promptX, promptY, promptWidth, promptHeight);

    // Texto del prompt - Ajustado al tamaño del cuadro
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 16px Arial";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    // Texto principal dividido en dos líneas para que quepa
    ctx.strokeText(
      "🏆 ¡Regístrate para guardar",
      this.canvas.width / 2,
      startY + 8
    );
    ctx.fillText(
      "🏆 ¡Regístrate para guardar",
      this.canvas.width / 2,
      startY + 8
    );

    ctx.strokeText("tu puntuación!", this.canvas.width / 2, startY + 26);
    ctx.fillText("tu puntuación!", this.canvas.width / 2, startY + 26);

    // Instrucción de acción - Más pequeña y dentro del cuadro
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.lineWidth = 1;
    ctx.strokeText(
      "Presiona SPACE para registrarte",
      this.canvas.width / 2,
      startY + 48
    );
    ctx.fillText(
      "Presiona SPACE para registrarte",
      this.canvas.width / 2,
      startY + 48
    );

    if (!this.registrationPromptRenderedLogged) {
      console.log("🔥 Game: Registration prompt rendered successfully");
      this.registrationPromptRenderedLogged = true;
    }
  }
  /**
   * Renderiza el prompt de leaderboard para usuarios registrados
   * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
   * @param {number} startY - Posición Y inicial
   */
  renderLeaderboardPrompt(ctx, startY) {
    // Fondo del prompt
    ctx.fillStyle = "rgba(0, 191, 255, 0.2)";
    ctx.strokeStyle = "#00BFFF";
    ctx.lineWidth = 2;
    const promptWidth = 260;
    const promptHeight = 45;
    const promptX = (this.canvas.width - promptWidth) / 2;
    const promptY = startY - 5;

    ctx.fillRect(promptX, promptY, promptWidth, promptHeight);
    ctx.strokeRect(promptX, promptY, promptWidth, promptHeight);

    // Texto del prompt
    ctx.textAlign = "center";
    ctx.fillStyle = "#87CEEB";
    ctx.font = "bold 16px Arial";
    ctx.strokeText("🥇 Ver Ranking Global", this.canvas.width / 2, startY + 15);
    ctx.fillText("🥇 Ver Ranking Global", this.canvas.width / 2, startY + 15);

    // Instrucción de acción
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.strokeText(
      "Presiona SPACE para ver leaderboard",
      this.canvas.width / 2,
      startY + 30
    );
    ctx.fillText(
      "Presiona SPACE para ver leaderboard",
      this.canvas.width / 2,
      startY + 30
    );
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
