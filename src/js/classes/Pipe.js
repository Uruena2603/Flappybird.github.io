/**
 * Pipe.js - Clase para las tuberías del juego
 * Maneja lógica de tuberías, colisiones, puntuación y efectos visuales
 */

class Pipe {
  constructor(config, x, y, type, level = 1) {
    // Configuración básica
    this.config = config.PIPES;
    this.gameConfig = config;

    // Posición y dimensiones
    this.x = x;
    this.y = y;
    this.width = this.config.WIDTH;
    this.height = this.config.HEIGHT;

    // Tipo de tubería (top/bottom)
    this.type = type; // 'top' o 'bottom'
    this.isBottom = type === "bottom";

    // Nivel y configuración visual
    this.level = level;
    this.levelConfig = config.LEVELS[level];

    // Movimiento
    this.velocityX = this.config.VELOCITY_X;

    // Estado de puntuación
    this.passed = false;
    this.scored = false;

    // Efectos visuales
    this.shake = 0;
    this.shakeDecay = 0.9;
    this.opacity = 1;
    this.scale = 1;

    // Animación de entrada
    this.animationProgress = 0;
    this.isAnimatingIn = true;

    // Partículas (para efectos especiales)
    this.particles = [];

    // Assets
    this.image = null;
    this.imageLoaded = false;

    // ID único para tracking
    this.id = Date.now() + Math.random();

    // Estadísticas
    this.timeAlive = 0;
    this.distanceTraveled = 0;

    this.loadImage();
  }

  /**
   * Carga la imagen correspondiente al nivel
   */
  loadImage() {
    const imageKey = this.isBottom
      ? this.levelConfig.pipes.bottom
      : this.levelConfig.pipes.top;

    const imagePath = this.gameConfig.ASSETS.IMAGES[imageKey];

    this.image = new Image();
    this.image.onload = () => {
      this.imageLoaded = true;
      console.log(`Pipe image loaded: ${imageKey}`);
    };
    this.image.onerror = () => {
      console.warn("Error loading pipe image:", imagePath);
    };
    this.image.src = imagePath;
  }

  /**
   * Actualiza la tubería
   */
  update(deltaTime = 1) {
    // Actualizar tiempo de vida
    this.timeAlive += deltaTime;

    // Movimiento horizontal
    const movement = this.velocityX * deltaTime;
    this.x += movement;
    this.distanceTraveled += Math.abs(movement);

    // Actualizar animación de entrada
    if (this.isAnimatingIn) {
      this.animationProgress += 0.05;
      if (this.animationProgress >= 1) {
        this.animationProgress = 1;
        this.isAnimatingIn = false;
      }
    }

    // Actualizar efectos visuales
    this.updateEffects();

    // Actualizar partículas
    this.updateParticles();

    // Verificar si está fuera de pantalla
    return this.x + this.width > 0;
  }

  /**
   * Actualiza efectos visuales
   */
  updateEffects() {
    // Reducir shake
    this.shake *= this.shakeDecay;

    // Animación de escala para tuberías del nivel infernal
    if (this.level >= 2) {
      this.scale = 1 + Math.sin(this.timeAlive * 0.02) * 0.02;
    }
  }

  /**
   * Actualiza partículas
   */
  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
      particle.velocityY += 0.1; // Gravedad
      particle.alpha -= particle.decay;
      particle.size *= 0.98;

      // Remover partículas muertas
      if (particle.alpha <= 0 || particle.size <= 0.5) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Verifica colisión con un objeto
   */
  checkCollision(object) {
    const collision =
      object.x < this.x + this.width &&
      object.x + object.width > this.x &&
      object.y < this.y + this.height &&
      object.y + object.height > this.y;

    if (collision) {
      this.onCollision();
    }

    return collision;
  }

  /**
   * Maneja eventos de colisión
   */
  onCollision() {
    this.shake = 10;
    this.createCollisionParticles();
    console.log(`Collision with pipe ${this.id}`);
  }

  /**
   * Verifica si un objeto ha pasado la tubería
   */
  checkPassed(object) {
    if (!this.passed && object.x > this.x + this.width) {
      this.passed = true;
      return true;
    }
    return false;
  }

  /**
   * Marca la tubería como puntuada
   */
  markScored() {
    if (!this.scored) {
      this.scored = true;
      this.createScoreParticles();
      return true;
    }
    return false;
  }

  /**
   * Crea partículas de colisión
   */
  createCollisionParticles() {
    const particleCount = 8;
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 2 + Math.random() * 3;

      this.particles.push({
        x: centerX,
        y: centerY,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        alpha: 1,
        decay: 0.02,
        color: this.level >= 2 ? "#FF4500" : "#8FBC8F",
      });
    }
  }

  /**
   * Crea partículas de puntuación
   */
  createScoreParticles() {
    const particleCount = 5;
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: centerX + (Math.random() - 0.5) * this.width,
        y: centerY + (Math.random() - 0.5) * this.height,
        velocityX: (Math.random() - 0.5) * 2,
        velocityY: -1 - Math.random() * 2,
        size: 2 + Math.random() * 3,
        alpha: 1,
        decay: 0.015,
        color: "#FFD700",
      });
    }
  }

  /**
   * Renderiza la tubería
   */
  render(context) {
    context.save();

    // Aplicar efectos de animación
    if (this.isAnimatingIn) {
      const easeOut = 1 - Math.pow(1 - this.animationProgress, 3);
      context.globalAlpha = easeOut;

      // Efecto de entrada desde el lado
      context.translate(this.width * (1 - easeOut), 0);
    }

    // Aplicar shake
    if (this.shake > 0) {
      const shakeX = (Math.random() - 0.5) * this.shake;
      const shakeY = (Math.random() - 0.5) * this.shake;
      context.translate(shakeX, shakeY);
    }

    // Aplicar escala
    if (this.scale !== 1) {
      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;
      context.translate(centerX, centerY);
      context.scale(this.scale, this.scale);
      context.translate(-centerX, -centerY);
    }

    // Renderizar tubería
    if (this.imageLoaded && this.image.complete) {
      context.drawImage(this.image, this.x, this.y, this.width, this.height);
    } else {
      // Fallback: rectángulo verde
      context.fillStyle = this.getFallbackColor();
      context.fillRect(this.x, this.y, this.width, this.height);

      // Borde
      context.strokeStyle = "#2F4F2F";
      context.lineWidth = 2;
      context.strokeRect(this.x, this.y, this.width, this.height);
    }

    // Efectos especiales para nivel infernal
    if (this.level >= 2) {
      this.renderInfernalEffects(context);
    }

    context.restore();

    // Renderizar partículas
    this.renderParticles(context);

    // Debug info
    if (window.DEBUG_MODE) {
      this.renderDebugInfo(context);
    }
  }

  /**
   * Renderiza efectos especiales para el nivel infernal
   */
  renderInfernalEffects(context) {
    // Brillo rojo pulsante
    const glowIntensity = (Math.sin(this.timeAlive * 0.1) + 1) * 0.5;
    context.shadowColor = "#FF4500";
    context.shadowBlur = 10 * glowIntensity;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;

    // Crear gradiente de fuego
    const gradient = context.createLinearGradient(
      this.x,
      this.y,
      this.x + this.width,
      this.y + this.height
    );
    gradient.addColorStop(0, `rgba(255, 69, 0, ${0.1 * glowIntensity})`);
    gradient.addColorStop(1, `rgba(255, 0, 0, ${0.2 * glowIntensity})`);

    context.fillStyle = gradient;
    context.fillRect(this.x, this.y, this.width, this.height);
  }

  /**
   * Renderiza partículas
   */
  renderParticles(context) {
    this.particles.forEach((particle) => {
      context.save();
      context.globalAlpha = particle.alpha;
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  }

  /**
   * Obtiene el color de fallback basado en el nivel
   */
  getFallbackColor() {
    switch (this.level) {
      case 2:
        return "#8B0000"; // Rojo oscuro para nivel infernal
      default:
        return "#228B22"; // Verde para nivel normal
    }
  }

  /**
   * Renderiza información de debug
   */
  renderDebugInfo(context) {
    context.save();
    context.fillStyle = "white";
    context.font = "10px monospace";
    context.strokeStyle = "black";
    context.lineWidth = 1;

    const debugText = [
      `ID: ${this.id.toString().slice(-4)}`,
      `Type: ${this.type}`,
      `Passed: ${this.passed}`,
      `Scored: ${this.scored}`,
      `X: ${this.x.toFixed(0)}`,
    ];

    debugText.forEach((text, index) => {
      const textY = this.y - 50 + index * 12;
      context.strokeText(text, this.x, textY);
      context.fillText(text, this.x, textY);
    });

    // Hitbox
    context.strokeStyle = "red";
    context.strokeRect(this.x, this.y, this.width, this.height);

    context.restore();
  }

  /**
   * Actualiza el nivel de la tubería
   */
  updateLevel(newLevel) {
    if (this.level !== newLevel) {
      this.level = newLevel;
      this.levelConfig = this.gameConfig.LEVELS[newLevel];
      this.loadImage();
      console.log(`Pipe ${this.id} updated to level ${newLevel}`);
    }
  }

  /**
   * Verifica si la tubería está fuera de pantalla
   */
  isOffScreen(canvasWidth) {
    return this.x + this.width < 0;
  }

  /**
   * Obtiene información de la tubería
   */
  getInfo() {
    return {
      id: this.id,
      type: this.type,
      level: this.level,
      position: { x: this.x, y: this.y },
      passed: this.passed,
      scored: this.scored,
      timeAlive: this.timeAlive,
      distanceTraveled: this.distanceTraveled,
      particleCount: this.particles.length,
    };
  }

  /**
   * Clona la tubería (útil para object pooling)
   */
  clone() {
    const cloned = new Pipe(
      this.gameConfig,
      this.x,
      this.y,
      this.type,
      this.level
    );
    cloned.passed = this.passed;
    cloned.scored = this.scored;
    return cloned;
  }

  /**
   * Reinicia la tubería para reutilización
   */
  reset(x, y, type, level) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.isBottom = type === "bottom";
    this.level = level;
    this.levelConfig = this.gameConfig.LEVELS[level];

    this.passed = false;
    this.scored = false;
    this.shake = 0;
    this.opacity = 1;
    this.scale = 1;
    this.animationProgress = 0;
    this.isAnimatingIn = true;
    this.particles = [];
    this.timeAlive = 0;
    this.distanceTraveled = 0;

    this.loadImage();
  }
}
