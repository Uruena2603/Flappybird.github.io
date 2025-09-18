/**
 * main.js - Punto de entrada del juego moderno con clases ES6
 * Flappy Bird Enhanced Edition
 */

// Configuraciones del juego
const GAME_CONFIG = {
  // Dimensiones del canvas
  BOARD_WIDTH: 360,
  BOARD_HEIGHT: 640,

  // Configuración del pájaro
  BIRD: {
    WIDTH: 34,
    HEIGHT: 24,
    INITIAL_X: 45,
    INITIAL_Y: 320,
    JUMP_VELOCITY: -6,
    GRAVITY: 0.4,
    MAX_FALL_SPEED: 8,
  },

  // Configuración de tuberías
  PIPES: {
    WIDTH: 64,
    HEIGHT: 512,
    INITIAL_X: 360,
    VELOCITY_X: -2,
    GAP_SIZE: 106,
    SPAWN_INTERVAL: 1500,
  },

  // Sistema de puntuación
  SCORING: {
    POINTS_PER_PIPE: 1,
    LEVEL_2_THRESHOLD: 20,
  },

  // Rutas de assets
  ASSETS: {
    IMAGES: {
      BIRD: "./assets/images/flappybird.png",
      BACKGROUND_LEVEL_1: "./assets/images/flappybirdbg.png",
      BACKGROUND_LEVEL_2: "./assets/images/Hell.png",
      TOP_PIPE_LEVEL_1: "./assets/images/toppipe.png",
      BOTTOM_PIPE_LEVEL_1: "./assets/images/bottompipe.png",
      TOP_PIPE_LEVEL_2: "./assets/images/toppipe_infernal.png",
      BOTTOM_PIPE_LEVEL_2: "./assets/images/bottompipe_infernal.png",
    },
    AUDIO: {
      JUMP: "./assets/audio/jumpSound2.wav",
      GAME_OVER: "./assets/audio/gameOver.wav",
      SCORE: "./assets/audio/coinSound.wav",
    },
  },

  // Configuración de audio
  AUDIO: {
    DEFAULT_VOLUME: 0.7,
  },

  // Configuración de niveles
  LEVELS: {
    1: {
      name: "Sky World",
      pipes: {
        top: "TOP_PIPE_LEVEL_1",
        bottom: "BOTTOM_PIPE_LEVEL_1",
      },
      difficulty: {
        gapSize: 106,
      },
    },
    2: {
      name: "Infernal World",
      pipes: {
        top: "TOP_PIPE_LEVEL_2",
        bottom: "BOTTOM_PIPE_LEVEL_2",
      },
      difficulty: {
        gapSize: 90,
      },
    },
  },
};

// Managers globales
let assetManager;
let audioManager;
let storageManager;
let firebaseManager;

// Variable global para el juego
let game;

// Inicialización cuando se carga la página
window.addEventListener("load", async () => {
  console.log("🎮 Flappy Bird Enhanced Edition - Starting...");

  try {
    // Actualizar texto de carga
    updateLoadingText("Initializing managers...");

    // Inicializar managers
    await initializeManagers();

    // Actualizar texto de carga
    updateLoadingText("Loading assets...");

    // Precargar assets críticos
    await preloadAssets();

    // Actualizar texto de carga
    updateLoadingText("Starting game...");

    // Crear instancia del juego
    game = new Game("board", GAME_CONFIG);

    // Integrar managers con el juego
    integrateManagersWithGame();

    // Ocultar pantalla de carga con animación
    hideLoadingScreen();

    // Exponer funciones globales para debugging
    window.FlappyBirdGame = {
      // Control del juego
      restart: () => game.restart(),
      pause: () => game.pause(),
      resume: () => game.resume(),

      // Información del estado
      getState: () => game.getGameState(),
      getScore: () => game.score,
      getBestScore: () => game.bestScore,
      getLevel: () => game.currentLevel,

      // Debug
      toggleDebug: () => {
        window.DEBUG_MODE = !window.DEBUG_MODE;
        console.log("Debug mode:", window.DEBUG_MODE);
      },

      // Estadísticas
      getStats: () => game.stats,
      getBirdStats: () => game.bird.getStats(),
      getPipeStats: () => game.pipePool.getStats(),

      // Acceso directo a entidades
      bird: () => game.bird,
      pipes: () => game.pipePool,
      game: () => game,
    };

    console.log("✅ Game initialized successfully!");
    console.log("🎯 Available debug commands:");
    console.log("   FlappyBirdGame.toggleDebug() - Toggle debug mode");
    console.log("   FlappyBirdGame.getState() - Get game state");
    console.log("   FlappyBirdGame.getStats() - Get game statistics");
  } catch (error) {
    console.error("❌ Error initializing game:", error);

    // Mostrar error en pantalla
    const canvas = document.getElementById("board");
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "red";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Error loading game", canvas.width / 2, canvas.height / 2);
    ctx.fillText(
      "Check console for details",
      canvas.width / 2,
      canvas.height / 2 + 30
    );
  }
});

// Cleanup cuando se cierra la página
window.addEventListener("beforeunload", () => {
  if (game) {
    game.destroy();
  }
});

// Manejo de errores globales
window.addEventListener("error", (event) => {
  console.error("🚨 Global error:", event.error);
  showError(`Error: ${event.error.message}`);
});

// Manejo de errores de promesas no capturadas
window.addEventListener("unhandledrejection", (event) => {
  console.error("🚨 Unhandled promise rejection:", event.reason);
  showError(`Promise error: ${event.reason}`);
});

/**
 * Inicializa todos los managers
 */
async function initializeManagers() {
  try {
    console.log("🔧 Initializing managers...");

    // Crear managers básicos
    assetManager = new AssetManager();
    audioManager = new AudioManager();
    storageManager = new StorageManager("flappy-bird-enhanced");

    // Crear FirebaseManager (opcional)
    firebaseManager = new FirebaseManager();

    // Intentar inicializar Firebase si está configurado
    await initializeFirebase();

    // Cargar configuración guardada
    const savedConfig = storageManager.loadConfig();

    // Aplicar configuración de audio
    audioManager.setEffectsVolume(savedConfig.audio.effectsVolume);
    audioManager.setMusicVolume(savedConfig.audio.musicVolume);
    if (savedConfig.audio.muted) {
      audioManager.toggleMute();
    }

    console.log("✅ Managers initialized successfully!");
  } catch (error) {
    console.error("❌ Error initializing managers:", error);
    throw error;
  }
}

/**
 * Inicializar Firebase si está disponible
 */
async function initializeFirebase() {
  try {
    // Verificar si Firebase está disponible y configurado usando la nueva API
    if (
      typeof window.getFirebaseConfig !== "function" ||
      typeof window.isFirebaseConfigured !== "function"
    ) {
      console.log(
        "🔥 Firebase: firebase-config.js no cargado, continuando sin Firebase"
      );
      return false;
    }

    // Usar la nueva función de configuración
    const firebaseConfig = window.getFirebaseConfig();
    if (!firebaseConfig) {
      console.log(
        "🔥 Firebase: Configuración no válida, continuando en modo offline"
      );
      return false;
    }

    console.log("🔥 Firebase: Inicializando con configuración validada...");
    const success = await firebaseManager.initialize(firebaseConfig);

    if (success) {
      console.log("🔥 Firebase: ✅ Inicializado correctamente");

      // Configurar callbacks para eventos de Firebase
      firebaseManager.onAuthStateChanged((authState, user) => {
        console.log(`🔥 Firebase: Estado de auth cambió a ${authState}`);
        // TODO: Actualizar UI según estado de auth
      });

      firebaseManager.onConnectionStateChanged((isOnline) => {
        console.log(`🔥 Firebase: Conexión ${isOnline ? "online" : "offline"}`);
        // TODO: Mostrar indicador de estado de conexión
      });

      return true;
    } else {
      console.log(
        "🔥 Firebase: ⚠️ Error en inicialización, continuando sin Firebase"
      );
      return false;
    }
  } catch (error) {
    console.warn(
      "🔥 Firebase: ⚠️ Error inesperado, continuando sin Firebase:",
      error
    );
    return false;
  }
}

/**
 * Precarga los assets críticos del juego
 */
async function preloadAssets() {
  try {
    console.log("📦 Preloading assets...");

    // Configurar callbacks de progreso
    assetManager.setProgressCallbacks(
      (progress) => {
        updateLoadingProgress(progress);
      },
      () => {
        console.log("✅ All assets loaded!");
      }
    );

    // Lista de assets críticos
    const assetList = [
      // Imágenes esenciales
      { type: "image", key: "BIRD", src: GAME_CONFIG.ASSETS.IMAGES.BIRD },
      {
        type: "image",
        key: "BACKGROUND_LEVEL_1",
        src: GAME_CONFIG.ASSETS.IMAGES.BACKGROUND_LEVEL_1,
      },
      {
        type: "image",
        key: "TOP_PIPE_LEVEL_1",
        src: GAME_CONFIG.ASSETS.IMAGES.TOP_PIPE_LEVEL_1,
      },
      {
        type: "image",
        key: "BOTTOM_PIPE_LEVEL_1",
        src: GAME_CONFIG.ASSETS.IMAGES.BOTTOM_PIPE_LEVEL_1,
      },
      {
        type: "image",
        key: "BACKGROUND_LEVEL_2",
        src: GAME_CONFIG.ASSETS.IMAGES.BACKGROUND_LEVEL_2,
      },
      {
        type: "image",
        key: "TOP_PIPE_LEVEL_2",
        src: GAME_CONFIG.ASSETS.IMAGES.TOP_PIPE_LEVEL_2,
      },
      {
        type: "image",
        key: "BOTTOM_PIPE_LEVEL_2",
        src: GAME_CONFIG.ASSETS.IMAGES.BOTTOM_PIPE_LEVEL_2,
      },

      // Audio
      { type: "sound", key: "JUMP", src: GAME_CONFIG.ASSETS.AUDIO.JUMP },
      {
        type: "sound",
        key: "GAME_OVER",
        src: GAME_CONFIG.ASSETS.AUDIO.GAME_OVER,
      },
      { type: "sound", key: "SCORE", src: GAME_CONFIG.ASSETS.AUDIO.SCORE },
    ];

    // Cargar todos los assets
    await assetManager.loadAssets(assetList);

    console.log("✅ Assets preloaded successfully!");
  } catch (error) {
    console.error("❌ Error preloading assets:", error);
    // No bloqueamos el juego por errores de assets
  }
}

/**
 * Integra los managers con el juego
 */
function integrateManagersWithGame() {
  try {
    console.log("🔗 Integrating managers with game...");

    // NUEVO: Pasar managers a la clase Game
    if (game && typeof game.setManagers === "function") {
      game.setManagers({
        firebase: firebaseManager,
        audio: audioManager,
        storage: storageManager,
        asset: assetManager,
      });
      console.log("✅ Managers passed to Game class successfully!");
    } else {
      console.warn(
        "⚠️ Game instance not ready or setManagers method not found"
      );
    }

    // Registrar sonidos en el AudioManager
    if (assetManager.getSound("JUMP")) {
      audioManager.registerSound(
        "JUMP",
        assetManager.getSound("JUMP"),
        "effect"
      );
    }
    if (assetManager.getSound("GAME_OVER")) {
      audioManager.registerSound(
        "GAME_OVER",
        assetManager.getSound("GAME_OVER"),
        "effect"
      );
    }
    if (assetManager.getSound("SCORE")) {
      audioManager.registerSound(
        "SCORE",
        assetManager.getSound("SCORE"),
        "effect"
      );
    }

    // Agregar managers al objeto global de debugging (si existe)
    if (typeof window.FlappyBirdGame !== "undefined") {
      window.FlappyBirdGame.managers = {
        asset: assetManager,
        audio: audioManager,
        storage: storageManager,
        firebase: firebaseManager,
      };

      // Agregar funciones adicionales de debugging
      window.FlappyBirdGame.debug = {
        ...window.FlappyBirdGame.debug,
        getManagerStats: () => ({
          assets: assetManager.getStats(),
          audio: audioManager.getStats(),
          storage: storageManager.getStorageUsage(),
          firebase: firebaseManager ? firebaseManager.getDebugInfo() : null,
        }),
        exportSave: () => storageManager.exportData(),
        importSave: (data) => storageManager.importData(data),
        clearSave: () => storageManager.clearAll(),
        setVolume: (type, volume) => {
          if (type === "effects") audioManager.setEffectsVolume(volume);
          if (type === "music") audioManager.setMusicVolume(volume);
        },
        toggleMute: () => audioManager.toggleMute(),
      };
    } else {
      console.log(
        "⚠️ FlappyBirdGame object not yet available for debug integration"
      );
    }

    console.log("✅ Managers integrated successfully!");
  } catch (error) {
    console.error("❌ Error integrating managers:", error);
  }
}

/**
 * Actualiza el texto de la pantalla de carga
 */
function updateLoadingText(text) {
  const loadingText = document.getElementById("loading-text");
  if (loadingText) {
    loadingText.textContent = text;
  }
}

/**
 * Actualiza la barra de progreso
 */
function updateLoadingProgress(progress) {
  const loadingBar = document.getElementById("loading-bar");
  const loadingText = document.getElementById("loading-text");

  if (loadingBar) {
    loadingBar.style.width = `${progress * 100}%`;
  }

  if (loadingText) {
    const percentage = Math.round(progress * 100);
    loadingText.textContent = `Loading assets... ${percentage}%`;
  }
}

/**
 * Oculta la pantalla de carga con animación suave
 */
function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.opacity = "0";
    setTimeout(() => {
      loadingScreen.style.display = "none";
      console.log("✅ Loading screen hidden - Game ready!");
    }, 500);
  }
}

/**
 * Muestra un mensaje de error
 */
function showError(message) {
  console.error("❌ Error:", message);

  // Oculta la pantalla de carga
  hideLoadingScreen();

  // Crear elemento de error
  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ff4444;
    color: white;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    z-index: 10000;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  errorDiv.innerHTML = `
    <h3>⚠️ Error</h3>
    <p>${message}</p>
    <button onclick="location.reload()" style="
      margin-top: 10px;
      padding: 8px 16px;
      background: white;
      color: #ff4444;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    ">Reload Game</button>
  `;
  document.body.appendChild(errorDiv);
}

// Información de desarrollo
console.log("🎮 Flappy Bird Enhanced Edition");
console.log("📱 Version: 2.0.0 with Managers");
console.log("👨‍💻 Developer: Uruena2603");
console.log("🏗️ Architecture: Modern ES6 Classes with Professional Managers");
console.log("⚡ Features: Asset Management, Audio System, Data Persistence");
console.log("");
console.log("🎯 Controls:");
console.log("   SPACE / UP ARROW / X / CLICK - Jump");
console.log("   P / ESC - Pause");
console.log("   R - Restart");
console.log("   D - Toggle Debug Mode");
console.log("");
console.log("🔧 Debugging:");
console.log("   FlappyBirdGame.debug.getManagerStats() - Manager statistics");
console.log("   FlappyBirdGame.debug.setVolume('effects', 0.5) - Set volume");
console.log("   FlappyBirdGame.debug.toggleMute() - Toggle audio");
console.log("");
