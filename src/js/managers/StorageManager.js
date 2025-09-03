/**
 * StorageManager - Gestión de datos y configuraciones
 * Maneja persistencia local, configuraciones y estadísticas
 */
class StorageManager {
  constructor(gameId = "flappy-bird") {
    this.gameId = gameId;
    this.prefix = `${gameId}_`;
    this.cache = new Map();
    this.autoSave = true;
    this.saveDebounceTime = 1000; // ms
    this.saveTimeouts = new Map();
    this.compressionEnabled = true;

    // Configuración por defecto
    this.defaultConfig = {
      audio: {
        effectsVolume: 0.7,
        musicVolume: 0.5,
        muted: false,
      },
      graphics: {
        quality: "high",
        particles: true,
        animations: true,
      },
      controls: {
        keyJump: "Space",
        keyPause: "Escape",
        keyRestart: "KeyR",
      },
      gameplay: {
        difficulty: "normal",
        showFPS: false,
        showDebug: false,
      },
    };

    this._loadCache();
  }

  /**
   * Guarda un valor en el almacenamiento
   */
  save(key, value, compress = this.compressionEnabled) {
    try {
      const fullKey = this.prefix + key;
      let dataToStore = value;

      // Compresión simple para objetos grandes
      if (compress && typeof value === "object") {
        dataToStore = this._compress(JSON.stringify(value));
      }

      localStorage.setItem(
        fullKey,
        JSON.stringify({
          data: dataToStore,
          timestamp: Date.now(),
          compressed: compress && typeof value === "object",
        })
      );

      this.cache.set(key, value);
      return true;
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      return false;
    }
  }

  /**
   * Carga un valor del almacenamiento
   */
  load(key, defaultValue = null) {
    try {
      // Primero verifica la caché
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      const fullKey = this.prefix + key;
      const stored = localStorage.getItem(fullKey);

      if (!stored) {
        return defaultValue;
      }

      const parsed = JSON.parse(stored);
      let value = parsed.data;

      // Descompresión si es necesario
      if (parsed.compressed) {
        value = JSON.parse(this._decompress(value));
      }

      this.cache.set(key, value);
      return value;
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Guarda con debounce (útil para autosave)
   */
  saveDebounced(key, value) {
    if (this.saveTimeouts.has(key)) {
      clearTimeout(this.saveTimeouts.get(key));
    }

    const timeout = setTimeout(() => {
      this.save(key, value);
      this.saveTimeouts.delete(key);
    }, this.saveDebounceTime);

    this.saveTimeouts.set(key, timeout);
  }

  /**
   * Elimina un valor del almacenamiento
   */
  remove(key) {
    try {
      const fullKey = this.prefix + key;
      localStorage.removeItem(fullKey);
      this.cache.delete(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  }

  /**
   * Verifica si existe una clave
   */
  exists(key) {
    return (
      this.cache.has(key) || localStorage.getItem(this.prefix + key) !== null
    );
  }

  /**
   * Obtiene todas las claves del juego
   */
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  /**
   * Guarda la configuración del juego
   */
  saveConfig(config) {
    const mergedConfig = this._deepMerge(this.defaultConfig, config);
    return this.save("config", mergedConfig);
  }

  /**
   * Carga la configuración del juego
   */
  loadConfig() {
    const config = this.load("config", this.defaultConfig);
    return this._deepMerge(this.defaultConfig, config);
  }

  /**
   * Guarda estadísticas del juego
   */
  saveStats(stats) {
    const currentStats = this.loadStats();
    const updatedStats = {
      ...currentStats,
      ...stats,
      lastUpdated: Date.now(),
    };
    return this.save("stats", updatedStats);
  }

  /**
   * Carga estadísticas del juego
   */
  loadStats() {
    return this.load("stats", {
      gamesPlayed: 0,
      totalScore: 0,
      highScore: 0,
      totalTime: 0,
      averageScore: 0,
      lastPlayed: null,
      achievements: [],
      lastUpdated: Date.now(),
    });
  }

  /**
   * Guarda puntuación alta
   */
  saveHighScore(score, playerName = "Anonymous") {
    const highScores = this.loadHighScores();

    highScores.push({
      score: score,
      player: playerName,
      date: Date.now(),
      id: this._generateId(),
    });

    // Ordena por puntuación y mantiene solo los top 10
    highScores.sort((a, b) => b.score - a.score);
    const topScores = highScores.slice(0, 10);

    return this.save("highScores", topScores);
  }

  /**
   * Carga tabla de puntuaciones
   */
  loadHighScores() {
    return this.load("highScores", []);
  }

  /**
   * Guarda progreso del nivel
   */
  saveLevelProgress(levelData) {
    return this.save("levelProgress", levelData);
  }

  /**
   * Carga progreso del nivel
   */
  loadLevelProgress() {
    return this.load("levelProgress", {
      currentLevel: 1,
      unlockedLevels: [1],
      completedLevels: [],
    });
  }

  /**
   * Exporta todos los datos
   */
  exportData() {
    const data = {};
    const keys = this.getAllKeys();

    keys.forEach((key) => {
      data[key] = this.load(key);
    });

    return {
      gameId: this.gameId,
      exportDate: Date.now(),
      data: data,
    };
  }

  /**
   * Importa datos
   */
  importData(importedData) {
    try {
      if (importedData.gameId !== this.gameId) {
        console.warn("Game ID mismatch during import");
        return false;
      }

      Object.entries(importedData.data).forEach(([key, value]) => {
        this.save(key, value);
      });

      this._loadCache();
      return true;
    } catch (error) {
      console.error("Error importing data:", error);
      return false;
    }
  }

  /**
   * Limpia todos los datos del juego
   */
  clearAll() {
    const keys = this.getAllKeys();
    keys.forEach((key) => {
      this.remove(key);
    });
    this.cache.clear();
    return true;
  }

  /**
   * Obtiene el uso de almacenamiento
   */
  getStorageUsage() {
    let totalSize = 0;
    const keys = this.getAllKeys();

    keys.forEach((key) => {
      const item = localStorage.getItem(this.prefix + key);
      if (item) {
        totalSize += item.length;
      }
    });

    return {
      totalSize: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      itemCount: keys.length,
      availableSpace: this._getAvailableSpace(),
    };
  }

  /**
   * Compresión simple (LZ-string like)
   */
  _compress(str) {
    // Implementación básica de compresión
    return btoa(str);
  }

  /**
   * Descompresión
   */
  _decompress(compressed) {
    return atob(compressed);
  }

  /**
   * Fusión profunda de objetos
   */
  _deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this._deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Genera ID único
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Carga caché inicial
   */
  _loadCache() {
    this.cache.clear();
    // La caché se carga bajo demanda en load()
  }

  /**
   * Obtiene espacio disponible estimado
   */
  _getAvailableSpace() {
    try {
      const testKey = "test_storage_space";
      const testData = "x".repeat(1024); // 1KB
      let currentSize = 0;

      // Estima el espacio disponible
      while (currentSize < 10240) {
        // Máximo 10MB
        try {
          localStorage.setItem(testKey + currentSize, testData);
          currentSize += 1024;
        } catch (e) {
          break;
        }
      }

      // Limpia datos de prueba
      for (let i = 0; i < currentSize; i += 1024) {
        localStorage.removeItem(testKey + i);
      }

      return currentSize;
    } catch (error) {
      return -1; // No se puede determinar
    }
  }

  /**
   * Destruye el manager
   */
  destroy() {
    // Limpia timeouts pendientes
    this.saveTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.saveTimeouts.clear();
    this.cache.clear();
  }
}
