/**
 * main.js - Punto de entrada principal del juego (Versión migrada)
 * TODO: Refactorizar a la nueva arquitectura de clases
 */

// Importar configuraciones
import { GAME_CONFIG, GAME_EVENTS, STORAGE_KEYS } from "./utils/Constants.js";
import { detectCollision } from "./utils/Utils.js";

// Variables globales (temporal - se moverán a clases)
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
  initializeGame();
};

function initializeGame() {
  // Configurar canvas
  board = document.getElementById("board");
  board.height = boardHeight;
  board.width = boardWidth;
  context = board.getContext("2d");

  // Cargar audio
  loadAudio();

  // Cargar imágenes
  loadImages();

  // Cargar puntuación guardada
  loadSavedData();

  // Iniciar bucle del juego
  gameLoop = requestAnimationFrame(update);
  setInterval(placePipes, GAME_CONFIG.PIPES.SPAWN_INTERVAL);

  // Configurar controles
  setupControls();
}

function loadAudio() {
  try {
    jumpSound = new Audio(GAME_CONFIG.ASSETS.AUDIO.JUMP);
    gameOverSound = new Audio(GAME_CONFIG.ASSETS.AUDIO.GAME_OVER);
    passPipeSound = new Audio(GAME_CONFIG.ASSETS.AUDIO.SCORE);

    // Configurar volumen
    [jumpSound, gameOverSound, passPipeSound].forEach((audio) => {
      audio.volume = GAME_CONFIG.AUDIO.DEFAULT_VOLUME;
    });
  } catch (error) {
    console.warn("Error cargando audio:", error);
  }
}

function loadImages() {
  // Imagen del pájaro
  birdImg = new Image();
  birdImg.src = GAME_CONFIG.ASSETS.IMAGES.BIRD;
  birdImg.onload = function () {
    // La imagen está cargada y lista para usar
    console.log("Bird image loaded successfully");
  };

  // Imágenes de tuberías iniciales
  updatePipeImages();
}

function updatePipeImages() {
  const levelConfig = GAME_CONFIG.LEVELS[level];

  topPipeImg = new Image();
  topPipeImg.src = GAME_CONFIG.ASSETS.IMAGES[levelConfig.pipes.top];

  bottomPipeImg = new Image();
  bottomPipeImg.src = GAME_CONFIG.ASSETS.IMAGES[levelConfig.pipes.bottom];
}

function loadSavedData() {
  const savedScore = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
  if (savedScore) {
    bestScore = parseInt(savedScore);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, bestScore.toString());
}

function setupControls() {
  document.addEventListener("keydown", handleKeyPress);

  // Controles táctiles
  if ("ontouchstart" in window) {
    board.addEventListener("touchstart", handleTouch, { passive: false });
  }

  // Controles de mouse
  board.addEventListener("click", handleMouseClick);
}

function handleKeyPress(e) {
  if (GAME_CONFIG.CONTROLS.KEYBOARD.JUMP.includes(e.code)) {
    e.preventDefault();
    handleJump();
  }
}

function handleTouch(e) {
  e.preventDefault();
  handleJump();
}

function handleMouseClick(e) {
  e.preventDefault();
  handleJump();
}

function handleJump() {
  if (gameOver) {
    resetGame();
    return;
  }

  // Reproducir sonido de salto
  try {
    jumpSound.currentTime = 0;
    jumpSound.play();
  } catch (error) {
    console.warn("Error reproduciendo sonido de salto:", error);
  }

  // Aplicar velocidad de salto (JUMP_VELOCITY ya es negativo)
  velocityY = GAME_CONFIG.BIRD.JUMP_VELOCITY;
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
  const currentLevel = level;

  if (score >= GAME_CONFIG.SCORING.LEVEL_2_THRESHOLD && level === 1) {
    level = 2;
    board.className = "level-2";
    updatePipeImages();
    console.log("¡Nivel 2 desbloqueado!");
  }

  // Aquí se pueden agregar más niveles en el futuro
}

function updateBird() {
  // Aplicar gravedad
  velocityY += gravity;
  velocityY = Math.min(velocityY, GAME_CONFIG.BIRD.MAX_FALL_SPEED);

  // Actualizar posición
  bird.y = Math.max(bird.y + velocityY, 0);

  // Dibujar pájaro
  if (birdImg.complete) {
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
  }

  // Verificar colisión con el suelo
  if (bird.y > board.height) {
    triggerGameOver();
  }
}

function updatePipes() {
  for (let i = pipeArray.length - 1; i >= 0; i--) {
    let pipe = pipeArray[i];
    pipe.x += velocityX;

    // Dibujar tubería
    if (pipe.img && pipe.img.complete) {
      context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
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
  context.font = "30px sans-serif";
  context.strokeStyle = "black";
  context.lineWidth = 2;

  // Mostrar puntuación
  const scoreText = isNewRecord
    ? `Score: ${score}   NEW RECORD!`
    : `Score: ${score}   Best: ${bestScore}`;

  context.strokeText(scoreText, 5, 45);
  context.fillText(scoreText, 5, 45);

  // Mostrar nivel
  const levelText = `Level: ${level}`;
  context.strokeText(levelText, 5, 80);
  context.fillText(levelText, 5, 80);

  if (gameOver) {
    context.font = "40px sans-serif";
    context.strokeText("GAME OVER", 50, boardHeight / 2);
    context.fillText("GAME OVER", 50, boardHeight / 2);

    context.font = "20px sans-serif";
    context.strokeText("Press SPACE to restart", 70, boardHeight / 2 + 40);
    context.fillText("Press SPACE to restart", 70, boardHeight / 2 + 40);
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
}

function triggerGameOver() {
  if (gameOver) return;

  gameOver = true;

  try {
    gameOverSound.currentTime = 0;
    gameOverSound.play();
  } catch (error) {
    console.warn("Error reproduciendo sonido de game over:", error);
  }

  console.log("Game Over! Final Score:", score);
}

function resetGame() {
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

  console.log("Game Reset");
}

// Exportar funciones principales para debugging
window.FlappyBirdGame = {
  reset: resetGame,
  getScore: () => score,
  getBestScore: () => bestScore,
  getLevel: () => level,
  toggleDebug: () => {
    GAME_CONFIG.PERFORMANCE.ENABLE_DEBUG =
      !GAME_CONFIG.PERFORMANCE.ENABLE_DEBUG;
  },
};
