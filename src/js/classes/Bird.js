/**
 * Bird.js - Clase para el pájaro del juego
 * Maneja toda la lógica del pájaro: física, animación, estados
 */

class Bird {
  constructor(config, canvas) {
    // Configuración básica
    this.config = config.BIRD;
    this.canvas = canvas;

    // Posición y dimensiones
    this.x = this.config.INITIAL_X;
    this.y = this.config.INITIAL_Y;
    this.width = this.config.WIDTH;
    this.height = this.config.HEIGHT;

    // Física
    this.velocityY = 0;
    this.gravity = this.config.GRAVITY;
    this.jumpVelocity = this.config.JUMP_VELOCITY;
    this.maxFallSpeed = this.config.MAX_FALL_SPEED;

    // Estados del pájaro
    this.states = {
      IDLE: "idle",
      FLYING: "flying",
      FALLING: "falling",
      DEAD: "dead",
    };
    this.currentState = this.states.IDLE;

    // Animación
    this.rotation = 0;
    this.maxRotation = 25; // grados
    this.rotationSpeed = 3;

    // Efectos visuales
    this.scale = 1;
    this.targetScale = 1;
    this.scaleSpeed = 0.1;

    // Trail effect (estela)
    this.trail = [];
    this.maxTrailLength = 8;

    // Assets
    this.image = null;
    this.imageLoaded = false;

    // Estadísticas
    this.totalJumps = 0;
    this.timeAlive = 0;
    this.maxHeight = this.y;

    this.loadImage(config.ASSETS.IMAGES.BIRD);
  }

  /**
   * Carga la imagen del pájaro
   */
  loadImage(src) {
    this.image = new Image();
    this.image.onload = () => {
      this.imageLoaded = true;
      console.log("Bird image loaded successfully");
    };
    this.image.onerror = () => {
      console.warn("Error loading bird image:", src);
    };
    this.image.src = src;
  }

  /**
   * Hace que el pájaro salte
   */
  jump() {
    this.velocityY = this.jumpVelocity;
    this.currentState = this.states.FLYING;
    this.totalJumps++;

    // Efecto visual de escala
    this.targetScale = 1.1;

    // Efecto de rotación hacia arriba
    this.rotation = Math.max(this.rotation - 15, -this.maxRotation);

    console.log(`Bird jumped! Total jumps: ${this.totalJumps}`);
  }

  /**
   * Actualiza la física y estado del pájaro
   */
  update(deltaTime = 1) {
    // Actualizar tiempo vivo
    this.timeAlive += deltaTime;

    // Aplicar gravedad
    this.velocityY += this.gravity * deltaTime;
    this.velocityY = Math.min(this.velocityY, this.maxFallSpeed);

    // Actualizar posición
    const oldY = this.y;
    this.y += this.velocityY * deltaTime;

    // Limitar al tope de la pantalla
    this.y = Math.max(this.y, 0);

    // Actualizar altura máxima
    this.maxHeight = Math.min(this.maxHeight, this.y);

    // Actualizar estado basado en velocidad
    this.updateState();

    // Actualizar rotación basada en velocidad
    this.updateRotation();

    // Actualizar escala
    this.updateScale();

    // Actualizar trail
    this.updateTrail();

    // Verificar colisión con el suelo
    if (this.y > this.canvas.height - this.height) {
      this.y = this.canvas.height - this.height;
      this.die();
      return false; // Indica colisión con el suelo
    }

    return true; // Pájaro sigue vivo
  }

  /**
   * Actualiza el estado del pájaro basado en su velocidad
   */
  updateState() {
    if (this.currentState === this.states.DEAD) return;

    if (this.velocityY < -2) {
      this.currentState = this.states.FLYING;
    } else if (this.velocityY > 2) {
      this.currentState = this.states.FALLING;
    } else {
      this.currentState = this.states.IDLE;
    }
  }

  /**
   * Actualiza la rotación del pájaro para dar sensación de vuelo
   */
  updateRotation() {
    if (this.currentState === this.states.DEAD) return;

    // Rotación basada en velocidad vertical
    const targetRotation = Math.max(
      Math.min(this.velocityY * 4, this.maxRotation),
      -this.maxRotation
    );

    // Interpolación suave hacia la rotación objetivo
    this.rotation += (targetRotation - this.rotation) * 0.1;
  }

  /**
   * Actualiza la escala para efectos visuales
   */
  updateScale() {
    // Interpolación suave hacia la escala objetivo
    this.scale += (this.targetScale - this.scale) * this.scaleSpeed;

    // Volver gradualmente a escala normal
    if (this.targetScale > 1) {
      this.targetScale -= 0.02;
      this.targetScale = Math.max(this.targetScale, 1);
    }
  }

  /**
   * Actualiza la estela del pájaro
   */
  updateTrail() {
    // Agregar posición actual al trail
    this.trail.push({
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
      alpha: 1,
    });

    // Mantener longitud máxima del trail
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    // Desvanecer el trail
    this.trail.forEach((point, index) => {
      point.alpha = index / this.trail.length;
    });
  }

  /**
   * Marca al pájaro como muerto
   */
  die() {
    this.currentState = this.states.DEAD;
    this.velocityY = 0;
    console.log(
      `Bird died! Survived ${(this.timeAlive / 60).toFixed(1)} seconds`
    );
  }

  /**
   * Verifica colisión con un rectángulo
   */
  checkCollision(rect) {
    // Usar hitbox ligeramente más pequeña para mejor gameplay
    const hitboxPadding = 2;

    return (
      this.x + hitboxPadding < rect.x + rect.width &&
      this.x + this.width - hitboxPadding > rect.x &&
      this.y + hitboxPadding < rect.y + rect.height &&
      this.y + this.height - hitboxPadding > rect.y
    );
  }

  /**
   * Renderiza el pájaro en el canvas
   */
  render(context) {
    context.save();

    // Renderizar trail primero (atrás)
    this.renderTrail(context);

    // Posición del centro para rotación
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // Aplicar transformaciones
    context.translate(centerX, centerY);
    context.rotate((this.rotation * Math.PI) / 180);
    context.scale(this.scale, this.scale);

    // Renderizar pájaro
    if (this.imageLoaded && this.image.complete) {
      context.drawImage(
        this.image,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    } else {
      // Fallback: rectángulo amarillo
      context.fillStyle = this.getStateColor();
      context.fillRect(
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );

      // Ojos simples
      context.fillStyle = "black";
      context.fillRect(-this.width / 4, -this.height / 4, 4, 4);
    }

    context.restore();

    // Renderizar información de debug si está habilitada
    if (window.DEBUG_MODE) {
      this.renderDebugInfo(context);
    }
  }

  /**
   * Renderiza la estela del pájaro
   */
  renderTrail(context) {
    if (this.trail.length < 2) return;

    context.save();

    for (let i = 1; i < this.trail.length; i++) {
      const point = this.trail[i];
      const prevPoint = this.trail[i - 1];

      context.strokeStyle = `rgba(255, 255, 0, ${point.alpha * 0.3})`;
      context.lineWidth = 3 * point.alpha;
      context.lineCap = "round";

      context.beginPath();
      context.moveTo(prevPoint.x, prevPoint.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    }

    context.restore();
  }

  /**
   * Obtiene el color basado en el estado actual
   */
  getStateColor() {
    switch (this.currentState) {
      case this.states.FLYING:
        return "#FFD700"; // Dorado
      case this.states.FALLING:
        return "#FFA500"; // Naranja
      case this.states.DEAD:
        return "#FF6347"; // Rojo
      default:
        return "#FFFF00"; // Amarillo
    }
  }

  /**
   * Renderiza información de debug
   */
  renderDebugInfo(context) {
    context.save();
    context.fillStyle = "white";
    context.font = "12px monospace";
    context.strokeStyle = "black";
    context.lineWidth = 1;

    const debugText = [
      `State: ${this.currentState}`,
      `VelY: ${this.velocityY.toFixed(1)}`,
      `Y: ${this.y.toFixed(1)}`,
      `Jumps: ${this.totalJumps}`,
      `Time: ${(this.timeAlive / 60).toFixed(1)}s`,
    ];

    debugText.forEach((text, index) => {
      const y = this.y - 60 + index * 14;
      context.strokeText(text, this.x + this.width + 5, y);
      context.fillText(text, this.x + this.width + 5, y);
    });

    // Hitbox
    context.strokeStyle = "red";
    context.strokeRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);

    context.restore();
  }

  /**
   * Reinicia el pájaro a su estado inicial
   */
  reset() {
    this.x = this.config.INITIAL_X;
    this.y = this.config.INITIAL_Y;
    this.velocityY = 0;
    this.rotation = 0;
    this.scale = 1;
    this.targetScale = 1;
    this.currentState = this.states.IDLE;
    this.trail = [];
    this.totalJumps = 0;
    this.timeAlive = 0;
    this.maxHeight = this.y;

    console.log("Bird reset to initial state");
  }

  /**
   * Obtiene estadísticas del pájaro
   */
  getStats() {
    return {
      totalJumps: this.totalJumps,
      timeAlive: this.timeAlive,
      maxHeight: this.maxHeight,
      currentState: this.currentState,
      position: { x: this.x, y: this.y },
      velocity: this.velocityY,
    };
  }
}
