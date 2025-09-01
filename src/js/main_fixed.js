/**
 * main.js - Versión corregida del juego
 * Funcional sin módulos ES6 para evitar problemas de importación
 */

// Configuraciones del juego (inline para evitar problemas de módulos)
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
    POINTS_PER_PIPE: 0.5,
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

  // Configuración de controles
  CONTROLS: {
    KEYBOARD: {
      JUMP: ["Space", "ArrowUp", "KeyX"],
    },
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

// Función de detección de colisiones
function detectCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

// Variables globales del juego
let board;
let context;
let gameLoop;

// Configuración del juego
let boardWidth = GAME_CONFIG.BOARD_WIDTH;
let boardHeight = GAME_CONFIG.BOARD_HEIGHT;

// Configuración del pájaro
let birdWidth = GAME_CONFIG.BIRD.WIDTH;
let birdHeight = GAME_CONFIG.BIRD.HEIGHT;
let birdX = GAME_CONFIG.BIRD.INITIAL_X;
let birdY = GAME_CONFIG.BIRD.INITIAL_Y;
let birdImg;

let bird = {
  x: birdX,
  y: birdY,
  width: birdWidth,
  height: birdHeight,
};

// Configuración de tuberías
let pipeArray = [];
let pipeWidth = GAME_CONFIG.PIPES.WIDTH;
let pipeHeight = GAME_CONFIG.PIPES.HEIGHT;
let pipeX = GAME_CONFIG.PIPES.INITIAL_X;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

// Física del juego
let velocityX = GAME_CONFIG.PIPES.VELOCITY_X;
let velocityY = 0;
let gravity = GAME_CONFIG.BIRD.GRAVITY;

let gameOver = false;
let score = 0;
let bestScore = 0;
let isNewRecord = false;
let level = 1;

// Audio
let jumpSound;
let gameOverSound;
let passPipeSound;

// Inicialización del juego
window.onload = function () {
  console.log("Iniciando juego...");
  initializeGame();
};

function initializeGame() {
  console.log("Configurando canvas...");

  // Configurar canvas
  board = document.getElementById("board");
  board.height = boardHeight;
  board.width = boardWidth;
  context = board.getContext("2d");

  console.log("Canvas configurado:", board.width, "x", board.height);

  // Cargar audio
  loadAudio();

  // Cargar imágenes
  loadImages();

  // Cargar puntuación guardada
  loadSavedData();

  // Configurar controles
  setupControls();

  // Iniciar bucle del juego
  console.log("Iniciando bucle del juego...");
  gameLoop = requestAnimationFrame(update);
  setInterval(placePipes, GAME_CONFIG.PIPES.SPAWN_INTERVAL);
}

function loadAudio() {
  console.log("Cargando audio...");
  try {
    jumpSound = new Audio(GAME_CONFIG.ASSETS.AUDIO.JUMP);
    gameOverSound = new Audio(GAME_CONFIG.ASSETS.AUDIO.GAME_OVER);
    passPipeSound = new Audio(GAME_CONFIG.ASSETS.AUDIO.SCORE);

    // Configurar volumen
    [jumpSound, gameOverSound, passPipeSound].forEach((audio) => {
      audio.volume = GAME_CONFIG.AUDIO.DEFAULT_VOLUME;
    });

    console.log("Audio cargado correctamente");
  } catch (error) {
    console.warn("Error cargando audio:", error);
  }
}

function loadImages() {
  console.log("Cargando imágenes...");

  // Imagen del pájaro
  birdImg = new Image();
  birdImg.src = GAME_CONFIG.ASSETS.IMAGES.BIRD;
  birdImg.onload = function () {
    console.log("Imagen del pájaro cargada");
  };
  birdImg.onerror = function () {
    console.error(
      "Error cargando imagen del pájaro:",
      GAME_CONFIG.ASSETS.IMAGES.BIRD
    );
  };

  // Imágenes de tuberías iniciales
  updatePipeImages();
}

function updatePipeImages() {
  console.log("Actualizando imágenes de tuberías para nivel:", level);

  const levelConfig = GAME_CONFIG.LEVELS[level];

  topPipeImg = new Image();
  topPipeImg.src = GAME_CONFIG.ASSETS.IMAGES[levelConfig.pipes.top];
  topPipeImg.onload = function () {
    console.log("Tubería superior cargada para nivel", level);
  };

  bottomPipeImg = new Image();
  bottomPipeImg.src = GAME_CONFIG.ASSETS.IMAGES[levelConfig.pipes.bottom];
  bottomPipeImg.onload = function () {
    console.log("Tubería inferior cargada para nivel", level);
  };
}

function loadSavedData() {
  try {
    const savedScore = localStorage.getItem("flappybird_high_score");
    if (savedScore) {
      bestScore = parseInt(savedScore);
      console.log("Mejor puntuación cargada:", bestScore);
    }
  } catch (error) {
    console.warn("Error cargando datos guardados:", error);
  }
}

function saveData() {
  try {
    localStorage.setItem("flappybird_high_score", bestScore.toString());
    console.log("Datos guardados - Mejor puntuación:", bestScore);
  } catch (error) {
    console.warn("Error guardando datos:", error);
  }
}

function setupControls() {
  console.log("Configurando controles...");

  document.addEventListener("keydown", handleKeyPress);

  // Controles táctiles
  if ("ontouchstart" in window) {
    board.addEventListener("touchstart", handleTouch, { passive: false });
  }

  // Controles de mouse
  board.addEventListener("click", handleMouseClick);

  console.log("Controles configurados");
}

function handleKeyPress(e) {
  console.log("Tecla presionada:", e.code);
  if (GAME_CONFIG.CONTROLS.KEYBOARD.JUMP.includes(e.code)) {
    e.preventDefault();
    handleJump();
  }
}

function handleTouch(e) {
  console.log("Touch detectado");
  e.preventDefault();
  handleJump();
}

function handleMouseClick(e) {
  console.log("Click detectado");
  e.preventDefault();
  handleJump();
}

function handleJump() {
  console.log(
    "handleJump llamado - gameOver:",
    gameOver,
    "velocityY antes:",
    velocityY
  );

  if (gameOver) {
    console.log("Reiniciando juego...");
    resetGame();
    return;
  }

  // Reproducir sonido de salto
  try {
    jumpSound.currentTime = 0;
    jumpSound.play();
    console.log("Sonido de salto reproducido");
  } catch (error) {
    console.warn("Error reproduciendo sonido de salto:", error);
  }

  // Aplicar velocidad de salto
  velocityY = GAME_CONFIG.BIRD.JUMP_VELOCITY;
  console.log("Velocidad de salto aplicada - velocityY después:", velocityY);
}

function update() {
  gameLoop = requestAnimationFrame(update);

  // Verificar cambio de nivel
  checkLevelProgression();

  if (gameOver) {
    return;
  }

  // Limpiar canvas
  context.clearRect(0, 0, board.width, board.height);

  // Actualizar pájaro
  updateBird();

  // Actualizar tuberías
  updatePipes();

  // Actualizar puntuación
  updateScore();

  // Renderizar UI
  renderUI();
}

function checkLevelProgression() {
  if (score >= GAME_CONFIG.SCORING.LEVEL_2_THRESHOLD && level === 1) {
    level = 2;
    board.className = "level-2";
    updatePipeImages();
    console.log("¡Nivel 2 desbloqueado!");
  }
}

function updateBird() {
  // Aplicar gravedad
  velocityY += gravity;
  velocityY = Math.min(velocityY, GAME_CONFIG.BIRD.MAX_FALL_SPEED);

  // Actualizar posición
  bird.y = Math.max(bird.y + velocityY, 0);

  // Debug de posición del pájaro
  if (Math.random() < 0.01) {
    // Log ocasional para debugging
    console.log("Bird position - y:", bird.y, "velocityY:", velocityY);
  }

  // Dibujar pájaro
  if (birdImg.complete && birdImg.naturalWidth > 0) {
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
  } else {
    // Dibujar rectángulo temporal si la imagen no está cargada
    context.fillStyle = "yellow";
    context.fillRect(bird.x, bird.y, bird.width, bird.height);
  }

  // Verificar colisión con el suelo
  if (bird.y > board.height - bird.height) {
    console.log("Colisión con el suelo detectada");
    triggerGameOver();
  }
}

function updatePipes() {
  for (let i = pipeArray.length - 1; i >= 0; i--) {
    let pipe = pipeArray[i];
    pipe.x += velocityX;

    // Dibujar tubería
    if (pipe.img && pipe.img.complete && pipe.img.naturalWidth > 0) {
      context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
    } else {
      // Dibujar rectángulo temporal si la imagen no está cargada
      context.fillStyle = "green";
      context.fillRect(pipe.x, pipe.y, pipe.width, pipe.height);
    }

    // Verificar si el pájaro pasó la tubería
    if (!pipe.passed && bird.x > pipe.x + pipe.width) {
      score += GAME_CONFIG.SCORING.POINTS_PER_PIPE;
      pipe.passed = true;

      // Reproducir sonido de puntuación (solo una vez por par)
      if (pipe.isBottom) {
        try {
          passPipeSound.currentTime = 0;
          passPipeSound.play();
        } catch (error) {
          console.warn("Error reproduciendo sonido de puntuación:", error);
        }
      }
    }

    // Verificar colisión
    if (detectCollision(bird, pipe)) {
      console.log("Colisión con tubería detectada");
      triggerGameOver();
    }

    // Remover tuberías fuera de pantalla
    if (pipe.x + pipe.width < 0) {
      pipeArray.splice(i, 1);
    }
  }
}

function updateScore() {
  if (score > bestScore) {
    bestScore = score;
    isNewRecord = true;
    saveData();
  } else {
    isNewRecord = false;
  }
}

function renderUI() {
  // Configurar texto
  context.fillStyle = "white";
  context.font = "24px sans-serif";
  context.strokeStyle = "black";
  context.lineWidth = 2;

  // Mostrar puntuación
  const scoreText = isNewRecord
    ? `Score: ${score}   NEW RECORD!`
    : `Score: ${score}   Best: ${bestScore}`;

  context.strokeText(scoreText, 5, 30);
  context.fillText(scoreText, 5, 30);

  // Mostrar nivel
  const levelText = `Level: ${level}`;
  context.strokeText(levelText, 5, 60);
  context.fillText(levelText, 5, 60);

  if (gameOver) {
    context.font = "32px sans-serif";
    context.strokeText("GAME OVER", 50, boardHeight / 2);
    context.fillText("GAME OVER", 50, boardHeight / 2);

    context.font = "18px sans-serif";
    context.strokeText(
      "Click or Press SPACE to restart",
      30,
      boardHeight / 2 + 40
    );
    context.fillText(
      "Click or Press SPACE to restart",
      30,
      boardHeight / 2 + 40
    );
  }
}

function placePipes() {
  if (gameOver) {
    return;
  }

  const levelConfig = GAME_CONFIG.LEVELS[level] || GAME_CONFIG.LEVELS[1];
  const randomPipeY = pipeY - pipeHeight / 4 - Math.random() * (pipeHeight / 2);
  const openingSpace = levelConfig.difficulty.gapSize;

  // Tubería superior
  let topPipe = {
    img: topPipeImg,
    x: pipeX,
    y: randomPipeY,
    width: pipeWidth,
    height: pipeHeight,
    passed: false,
    isBottom: false,
  };
  pipeArray.push(topPipe);

  // Tubería inferior
  let bottomPipe = {
    img: bottomPipeImg,
    x: pipeX,
    y: randomPipeY + pipeHeight + openingSpace,
    width: pipeWidth,
    height: pipeHeight,
    passed: false,
    isBottom: true,
  };
  pipeArray.push(bottomPipe);

  console.log("Tuberías colocadas, total:", pipeArray.length);
}

function triggerGameOver() {
  if (gameOver) return;

  gameOver = true;
  console.log("Game Over! Puntuación final:", score);

  try {
    gameOverSound.currentTime = 0;
    gameOverSound.play();
  } catch (error) {
    console.warn("Error reproduciendo sonido de game over:", error);
  }
}

function resetGame() {
  console.log("Reiniciando juego...");

  // Restablecer variables del juego
  level = 1;
  board.className = "level-1";
  pipeArray = [];
  updatePipeImages();

  // Restablecer pájaro
  bird.y = birdY;
  velocityY = 0;

  // Restablecer puntuación y estado
  gameOver = false;
  score = 0;
  isNewRecord = false;

  console.log("Juego reiniciado");
}

// Funciones de debugging para la consola
window.FlappyBirdGame = {
  reset: resetGame,
  getScore: () => score,
  getBestScore: () => bestScore,
  getLevel: () => level,
  getBirdPosition: () => ({ x: bird.x, y: bird.y, velocityY: velocityY }),
  triggerJump: handleJump,
  getGameState: () => ({
    gameOver,
    score,
    level,
    birdY: bird.y,
    velocityY,
    pipeCount: pipeArray.length,
  }),
};
