/**
 * StateManager - Gestión avanzada de estados del juego
 * Maneja transiciones suaves y stack de estados
 */
export class StateManager {
  constructor() {
    this.states = new Map();
    this.currentState = null;
    this.previousState = null;
    this.stateStack = [];
    this.isTransitioning = false;
    this.transitionDuration = 300; // ms
    this.onStateChange = null;
  }

  /**
   * Registra un estado en el manager
   */
  registerState(name, stateClass) {
    this.states.set(name, stateClass);
  }

  /**
   * Cambia al estado especificado
   */
  async changeState(stateName, data = {}, transition = true) {
    if (this.isTransitioning) {
      console.warn("State transition already in progress");
      return false;
    }

    const StateClass = this.states.get(stateName);
    if (!StateClass) {
      console.error(`State not found: ${stateName}`);
      return false;
    }

    try {
      this.isTransitioning = true;

      // Salir del estado actual
      if (this.currentState) {
        this.previousState = this.currentState;

        if (transition) {
          await this._transitionOut();
        }

        if (this.currentState.exit) {
          await this.currentState.exit();
        }
      }

      // Crear nuevo estado
      const newState = new StateClass(data);
      this.currentState = newState;

      // Entrar al nuevo estado
      if (this.currentState.enter) {
        await this.currentState.enter(data);
      }

      if (transition) {
        await this._transitionIn();
      }

      // Notificar cambio de estado
      if (this.onStateChange) {
        this.onStateChange(
          stateName,
          this.previousState?.constructor.name || null
        );
      }

      this.isTransitioning = false;
      return true;
    } catch (error) {
      console.error("Error changing state:", error);
      this.isTransitioning = false;
      return false;
    }
  }

  /**
   * Empuja un estado al stack (para overlay states)
   */
  async pushState(stateName, data = {}, transition = true) {
    if (this.isTransitioning) {
      console.warn("State transition already in progress");
      return false;
    }

    const StateClass = this.states.get(stateName);
    if (!StateClass) {
      console.error(`State not found: ${stateName}`);
      return false;
    }

    try {
      this.isTransitioning = true;

      // Pausa el estado actual si es posible
      if (this.currentState && this.currentState.pause) {
        this.currentState.pause();
      }

      // Guarda el estado actual en el stack
      if (this.currentState) {
        this.stateStack.push(this.currentState);
      }

      // Crea y activa el nuevo estado
      const newState = new StateClass(data);
      this.currentState = newState;

      if (this.currentState.enter) {
        await this.currentState.enter(data);
      }

      if (transition) {
        await this._transitionIn();
      }

      this.isTransitioning = false;
      return true;
    } catch (error) {
      console.error("Error pushing state:", error);
      this.isTransitioning = false;
      return false;
    }
  }

  /**
   * Saca el estado actual del stack
   */
  async popState(transition = true) {
    if (this.isTransitioning) {
      console.warn("State transition already in progress");
      return false;
    }

    if (this.stateStack.length === 0) {
      console.warn("No states in stack to pop");
      return false;
    }

    try {
      this.isTransitioning = true;

      // Salir del estado actual
      if (this.currentState) {
        if (transition) {
          await this._transitionOut();
        }

        if (this.currentState.exit) {
          await this.currentState.exit();
        }
      }

      // Restaurar estado anterior
      this.currentState = this.stateStack.pop();

      if (this.currentState && this.currentState.resume) {
        this.currentState.resume();
      }

      if (transition) {
        await this._transitionIn();
      }

      this.isTransitioning = false;
      return true;
    } catch (error) {
      console.error("Error popping state:", error);
      this.isTransitioning = false;
      return false;
    }
  }

  /**
   * Obtiene el estado actual
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Obtiene el nombre del estado actual
   */
  getCurrentStateName() {
    if (!this.currentState) return null;

    for (const [name, StateClass] of this.states) {
      if (this.currentState instanceof StateClass) {
        return name;
      }
    }
    return "unknown";
  }

  /**
   * Verifica si está en un estado específico
   */
  isInState(stateName) {
    const StateClass = this.states.get(stateName);
    return StateClass && this.currentState instanceof StateClass;
  }

  /**
   * Actualiza el estado actual
   */
  update(deltaTime) {
    if (
      this.currentState &&
      this.currentState.update &&
      !this.isTransitioning
    ) {
      this.currentState.update(deltaTime);
    }
  }

  /**
   * Renderiza el estado actual
   */
  render(ctx) {
    // Renderiza estados en el stack (para overlays)
    this.stateStack.forEach((state) => {
      if (state.render) {
        state.render(ctx);
      }
    });

    // Renderiza el estado actual
    if (this.currentState && this.currentState.render) {
      this.currentState.render(ctx);
    }

    // Renderiza efecto de transición si está activo
    if (this.isTransitioning) {
      this._renderTransition(ctx);
    }
  }

  /**
   * Maneja input del estado actual
   */
  handleInput(inputType, data) {
    if (
      this.currentState &&
      this.currentState.handleInput &&
      !this.isTransitioning
    ) {
      return this.currentState.handleInput(inputType, data);
    }
    return false;
  }

  /**
   * Establece callback para cambios de estado
   */
  setStateChangeCallback(callback) {
    this.onStateChange = callback;
  }

  /**
   * Establece duración de transiciones
   */
  setTransitionDuration(duration) {
    this.transitionDuration = Math.max(0, duration);
  }

  /**
   * Transición de salida
   */
  async _transitionOut() {
    return new Promise((resolve) => {
      // Aquí puedes agregar efectos de fade out, slide, etc.
      setTimeout(resolve, this.transitionDuration / 2);
    });
  }

  /**
   * Transición de entrada
   */
  async _transitionIn() {
    return new Promise((resolve) => {
      // Aquí puedes agregar efectos de fade in, slide, etc.
      setTimeout(resolve, this.transitionDuration / 2);
    });
  }

  /**
   * Renderiza efectos de transición
   */
  _renderTransition(ctx) {
    // Efecto de fade simple
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  /**
   * Limpia el manager
   */
  destroy() {
    if (this.currentState && this.currentState.exit) {
      this.currentState.exit();
    }

    this.stateStack.forEach((state) => {
      if (state.exit) {
        state.exit();
      }
    });

    this.states.clear();
    this.stateStack = [];
    this.currentState = null;
    this.previousState = null;
    this.isTransitioning = false;
  }

  /**
   * Obtiene estadísticas del manager
   */
  getStats() {
    return {
      currentState: this.getCurrentStateName(),
      previousState: this.previousState?.constructor.name || null,
      stackSize: this.stateStack.length,
      isTransitioning: this.isTransitioning,
      registeredStates: this.states.size,
    };
  }
}
