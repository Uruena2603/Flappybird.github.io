/**
 * PipePool.js - Sistema de Object Pooling para tuberías
 * Optimiza el rendimiento reutilizando objetos Pipe en lugar de crear/destruir constantemente
 */

class PipePool {
  constructor(config, initialSize = 20) {
    this.config = config;
    this.pool = [];
    this.activeObjects = [];
    this.initialSize = initialSize;

    // Estadísticas del pool
    this.stats = {
      created: 0,
      reused: 0,
      maxActive: 0,
      totalRequests: 0,
    };

    console.log(`PipePool initialized with size: ${initialSize}`);
    this.initializePool();
  }

  /**
   * Inicializa el pool con objetos reutilizables
   */
  initializePool() {
    for (let i = 0; i < this.initialSize; i++) {
      const pipe = new Pipe(this.config, 0, 0, "top", 1);
      this.pool.push(pipe);
      this.stats.created++;
    }
    console.log(`Pool initialized with ${this.pool.length} pipe objects`);
  }

  /**
   * Obtiene una tubería del pool o crea una nueva si es necesario
   */
  acquire(x, y, type, level = 1) {
    this.stats.totalRequests++;

    let pipe;

    if (this.pool.length > 0) {
      // Reutilizar objeto del pool
      pipe = this.pool.pop();
      pipe.reset(x, y, type, level);
      this.stats.reused++;
    } else {
      // Crear nuevo objeto si el pool está vacío
      pipe = new Pipe(this.config, x, y, type, level);
      this.stats.created++;
      console.warn("Pool exhausted, creating new pipe object");
    }

    this.activeObjects.push(pipe);
    this.updateMaxActive();

    return pipe;
  }

  /**
   * Devuelve una tubería al pool para reutilización
   */
  release(pipe) {
    const index = this.activeObjects.indexOf(pipe);
    if (index !== -1) {
      this.activeObjects.splice(index, 1);

      // Limpiar el objeto antes de devolverlo al pool
      this.cleanPipe(pipe);

      this.pool.push(pipe);
      return true;
    }
    return false;
  }

  /**
   * Libera múltiples tuberías de una vez
   */
  releaseMultiple(pipes) {
    let releasedCount = 0;
    pipes.forEach((pipe) => {
      if (this.release(pipe)) {
        releasedCount++;
      }
    });
    return releasedCount;
  }

  /**
   * Limpia un objeto pipe antes de devolverlo al pool
   */
  cleanPipe(pipe) {
    // Limpiar partículas
    pipe.particles = [];

    // Resetear efectos visuales
    pipe.shake = 0;
    pipe.opacity = 1;
    pipe.scale = 1;
    pipe.animationProgress = 0;
    pipe.isAnimatingIn = true;

    // Resetear estados
    pipe.passed = false;
    pipe.scored = false;
    pipe.timeAlive = 0;
    pipe.distanceTraveled = 0;
  }

  /**
   * Actualiza todas las tuberías activas
   */
  updateActive(deltaTime = 1) {
    const pipesToRelease = [];

    this.activeObjects.forEach((pipe) => {
      const stillAlive = pipe.update(deltaTime);

      // Si la tubería está fuera de pantalla, marcarla para liberación
      if (!stillAlive || pipe.isOffScreen(this.config.BOARD_WIDTH)) {
        pipesToRelease.push(pipe);
      }
    });

    // Liberar tuberías fuera de pantalla
    if (pipesToRelease.length > 0) {
      const released = this.releaseMultiple(pipesToRelease);
      if (released > 0) {
        console.log(`Released ${released} pipes back to pool`);
      }
    }
  }

  /**
   * Renderiza todas las tuberías activas
   */
  renderActive(context) {
    this.activeObjects.forEach((pipe) => {
      pipe.render(context);
    });
  }

  /**
   * Actualiza la estadística de máximo número de objetos activos
   */
  updateMaxActive() {
    if (this.activeObjects.length > this.stats.maxActive) {
      this.stats.maxActive = this.activeObjects.length;
    }
  }

  /**
   * Encuentra la primera tubería que cumple una condición
   */
  findActive(predicate) {
    return this.activeObjects.find(predicate);
  }

  /**
   * Filtra tuberías activas que cumplen una condición
   */
  filterActive(predicate) {
    return this.activeObjects.filter(predicate);
  }

  /**
   * Verifica colisiones de todas las tuberías activas con un objeto
   */
  checkCollisions(object) {
    for (let pipe of this.activeObjects) {
      if (pipe.checkCollision(object)) {
        return pipe;
      }
    }
    return null;
  }

  /**
   * Verifica qué tuberías ha pasado un objeto
   */
  checkPassed(object) {
    const passedPipes = [];

    this.activeObjects.forEach((pipe) => {
      if (pipe.checkPassed(object)) {
        passedPipes.push(pipe);
      }
    });

    return passedPipes;
  }

  /**
   * Marca tuberías como puntuadas y devuelve la puntuación obtenida
   */
  processScoring(passedPipes) {
    let score = 0;

    passedPipes.forEach((pipe) => {
      if (pipe.isBottom && pipe.markScored()) {
        score += this.config.SCORING.POINTS_PER_PIPE;
      }
    });

    return score;
  }

  /**
   * Limpia todas las tuberías activas (útil para reset del juego)
   */
  clear() {
    const releasedCount = this.releaseMultiple([...this.activeObjects]);
    console.log(`Cleared ${releasedCount} active pipes`);
  }

  /**
   * Actualiza el nivel de todas las tuberías activas
   */
  updateLevel(newLevel) {
    this.activeObjects.forEach((pipe) => {
      pipe.updateLevel(newLevel);
    });
    console.log(
      `Updated ${this.activeObjects.length} pipes to level ${newLevel}`
    );
  }

  /**
   * Optimiza el pool removiendo objetos excesivos
   */
  optimize() {
    const maxPoolSize = this.initialSize * 2;

    if (this.pool.length > maxPoolSize) {
      const excess = this.pool.length - maxPoolSize;
      this.pool.splice(0, excess);
      console.log(`Pool optimized: removed ${excess} excess objects`);
    }
  }

  /**
   * Obtiene estadísticas del pool
   */
  getStats() {
    return {
      ...this.stats,
      poolSize: this.pool.length,
      activeCount: this.activeObjects.length,
      efficiency:
        this.stats.totalRequests > 0
          ? ((this.stats.reused / this.stats.totalRequests) * 100).toFixed(1) +
            "%"
          : "0%",
    };
  }

  /**
   * Obtiene información detallada de las tuberías activas
   */
  getActiveInfo() {
    return this.activeObjects.map((pipe) => pipe.getInfo());
  }

  /**
   * Renderiza información de debug del pool
   */
  renderDebugInfo(context) {
    if (!window.DEBUG_MODE) return;

    const stats = this.getStats();

    context.save();
    context.fillStyle = "white";
    context.font = "12px monospace";
    context.strokeStyle = "black";
    context.lineWidth = 1;

    const debugText = [
      "PIPE POOL STATS:",
      `Pool Size: ${stats.poolSize}`,
      `Active: ${stats.activeCount}`,
      `Max Active: ${stats.maxActive}`,
      `Created: ${stats.created}`,
      `Reused: ${stats.reused}`,
      `Efficiency: ${stats.efficiency}`,
    ];

    debugText.forEach((text, index) => {
      const y = 150 + index * 14;
      context.strokeText(text, 10, y);
      context.fillText(text, 10, y);
    });

    context.restore();
  }

  /**
   * Destruye el pool y libera memoria
   */
  destroy() {
    this.clear();
    this.pool = [];
    this.activeObjects = [];
    console.log("PipePool destroyed");
  }

  /**
   * Obtiene tuberías en una región específica
   */
  getPipesInRegion(x, y, width, height) {
    return this.activeObjects.filter(
      (pipe) =>
        pipe.x < x + width &&
        pipe.x + pipe.width > x &&
        pipe.y < y + height &&
        pipe.y + pipe.height > y
    );
  }

  /**
   * Cuenta tuberías por tipo
   */
  countByType() {
    const counts = { top: 0, bottom: 0 };
    this.activeObjects.forEach((pipe) => {
      counts[pipe.type]++;
    });
    return counts;
  }

  /**
   * Obtiene la tubería más cercana a una posición
   */
  getClosestPipe(x, y) {
    let closest = null;
    let minDistance = Infinity;

    this.activeObjects.forEach((pipe) => {
      const distance = Math.sqrt(
        Math.pow(pipe.x + pipe.width / 2 - x, 2) +
          Math.pow(pipe.y + pipe.height / 2 - y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closest = pipe;
      }
    });

    return { pipe: closest, distance: minDistance };
  }
}
