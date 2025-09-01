/**
 * Constants.js - Configuraciones globales del juego
 */

export const GAME_CONFIG = {
  // Dimensiones del canvas
  BOARD_WIDTH: 360,
  BOARD_HEIGHT: 640,

  // Configuración del pájaro
  BIRD: {
    WIDTH: 34,
    HEIGHT: 24,
    INITIAL_X: 45, // BOARD_WIDTH / 8
    INITIAL_Y: 320, // BOARD_HEIGHT / 2
    JUMP_VELOCITY: -6,
    GRAVITY: 0.4,
    MAX_FALL_SPEED: 8,
  },

  // Configuración de tuberías
  PIPES: {
    WIDTH: 64,
    HEIGHT: 512,
    INITIAL_X: 360, // BOARD_WIDTH
    VELOCITY_X: -2,
    GAP_SIZE: 106, // BOARD_HEIGHT / 6
    SPAWN_INTERVAL: 1500, // milisegundos
    MIN_HEIGHT: 50,
    MAX_HEIGHT: 350,
  },

  // Sistema de puntuación
  SCORING: {
    POINTS_PER_PIPE: 0.5, // Se duplicará por par de tuberías
    LEVEL_2_THRESHOLD: 20,
    LEVEL_3_THRESHOLD: 50,
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

  // Estados del juego
  STATES: {
    MENU: "menu",
    PLAYING: "playing",
    PAUSED: "paused",
    GAME_OVER: "gameOver",
    LOADING: "loading",
  },

  // Configuración de audio
  AUDIO: {
    DEFAULT_VOLUME: 0.7,
    SOUND_ENABLED: true,
    MUSIC_ENABLED: true,
  },

  // Configuración de controles
  CONTROLS: {
    KEYBOARD: {
      JUMP: ["Space", "ArrowUp", "KeyX"],
      PAUSE: ["KeyP", "Escape"],
      RESTART: ["KeyR"],
    },
    TOUCH: {
      ENABLED: true,
      GESTURES: ["tap", "swipeUp"],
    },
  },

  // Configuración de niveles
  LEVELS: {
    1: {
      name: "Sky World",
      background: "BACKGROUND_LEVEL_1",
      pipes: {
        top: "TOP_PIPE_LEVEL_1",
        bottom: "BOTTOM_PIPE_LEVEL_1",
      },
      difficulty: {
        pipeSpeed: -2,
        spawnInterval: 1500,
        gapSize: 106,
      },
    },
    2: {
      name: "Infernal World",
      background: "BACKGROUND_LEVEL_2",
      pipes: {
        top: "TOP_PIPE_LEVEL_2",
        bottom: "BOTTOM_PIPE_LEVEL_2",
      },
      difficulty: {
        pipeSpeed: -2.5,
        spawnInterval: 1300,
        gapSize: 90,
      },
    },
  },

  // Configuración de performance
  PERFORMANCE: {
    MAX_PIPES: 10,
    TARGET_FPS: 60,
    ENABLE_DEBUG: false,
  },
};

// Eventos personalizados del juego
export const GAME_EVENTS = {
  BIRD_JUMP: "bird:jump",
  BIRD_COLLISION: "bird:collision",
  PIPE_PASSED: "pipe:passed",
  SCORE_UPDATE: "score:update",
  LEVEL_CHANGE: "level:change",
  GAME_START: "game:start",
  GAME_PAUSE: "game:pause",
  GAME_RESUME: "game:resume",
  GAME_OVER: "game:over",
  GAME_RESTART: "game:restart",
};

// Teclas del juego
export const KEYS = {
  SPACE: 32,
  UP_ARROW: 38,
  X: 88,
  P: 80,
  ESC: 27,
  R: 82,
};

// Configuración de almacenamiento local
export const STORAGE_KEYS = {
  HIGH_SCORE: "flappybird_high_score",
  SETTINGS: "flappybird_settings",
  STATS: "flappybird_stats",
};
