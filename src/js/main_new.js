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

// Variable global para el juego
let game;

// Inicialización cuando se carga la página
window.addEventListener("load", () => {
  console.log("🎮 Flappy Bird Enhanced Edition - Starting...");

  try {
    // Crear instancia del juego
    game = new Game("board", GAME_CONFIG);

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
});

// Manejo de errores de promesas no capturadas
window.addEventListener("unhandledrejection", (event) => {
  console.error("🚨 Unhandled promise rejection:", event.reason);
});

// Información de desarrollo
console.log("🎮 Flappy Bird Enhanced Edition");
console.log("📱 Version: 2.0.0");
console.log("👨‍💻 Developer: Uruena2603");
console.log("🏗️ Architecture: Modern ES6 Classes with Object Pooling");
console.log("⚡ Features: Multi-level, Advanced Physics, Visual Effects");
console.log("");
console.log("🎯 Controls:");
console.log("   SPACE / UP ARROW / X / CLICK - Jump");
console.log("   P / ESC - Pause");
console.log("   R - Restart");
console.log("   D - Toggle Debug Mode");
console.log("");
