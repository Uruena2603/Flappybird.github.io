/**
 * AssetManager - Gestión profesional de recursos
 * Maneja la precarga y caché de imágenes y audio
 */
class AssetManager {
  constructor() {
    this.images = new Map();
    this.sounds = new Map();
    this.loadingPromises = new Map();
    this.totalAssets = 0;
    this.loadedAssets = 0;
    this.onProgress = null;
    this.onComplete = null;
  }

  /**
   * Configura los callbacks de progreso
   */
  setProgressCallbacks(onProgress, onComplete) {
    this.onProgress = onProgress;
    this.onComplete = onComplete;
  }

  /**
   * Precarga una imagen
   */
  async loadImage(key, src) {
    if (this.images.has(key)) {
      return this.images.get(key);
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    const promise = new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.images.set(key, img);
        this.loadedAssets++;
        this._updateProgress();
        resolve(img);
      };

      img.onerror = () => {
        console.error(`Error loading image: ${src}`);
        reject(new Error(`Failed to load image: ${src}`));
      };

      img.src = src;
    });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  /**
   * Precarga un audio
   */
  async loadSound(key, src) {
    if (this.sounds.has(key)) {
      return this.sounds.get(key);
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    const promise = new Promise((resolve, reject) => {
      const audio = new Audio();

      audio.oncanplaythrough = () => {
        this.sounds.set(key, audio);
        this.loadedAssets++;
        this._updateProgress();
        resolve(audio);
      };

      audio.onerror = () => {
        console.error(`Error loading sound: ${src}`);
        // No rechazamos para que el juego continúe sin audio
        this.sounds.set(key, null);
        this.loadedAssets++;
        this._updateProgress();
        resolve(null);
      };

      audio.src = src;
      audio.load();
    });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  /**
   * Precarga múltiples assets
   */
  async loadAssets(assetList) {
    this.totalAssets = assetList.length;
    this.loadedAssets = 0;

    const promises = assetList.map((asset) => {
      if (asset.type === "image") {
        return this.loadImage(asset.key, asset.src);
      } else if (asset.type === "sound") {
        return this.loadSound(asset.key, asset.src);
      }
    });

    try {
      await Promise.all(promises);
      if (this.onComplete) {
        this.onComplete();
      }
    } catch (error) {
      console.error("Error loading assets:", error);
    }
  }

  /**
   * Obtiene una imagen
   */
  getImage(key) {
    return this.images.get(key);
  }

  /**
   * Obtiene un sonido
   */
  getSound(key) {
    return this.sounds.get(key);
  }

  /**
   * Verifica si un asset está cargado
   */
  isLoaded(key) {
    return this.images.has(key) || this.sounds.has(key);
  }

  /**
   * Obtiene el progreso de carga
   */
  getProgress() {
    if (this.totalAssets === 0) return 1;
    return this.loadedAssets / this.totalAssets;
  }

  /**
   * Actualiza el progreso de carga
   */
  _updateProgress() {
    if (this.onProgress) {
      this.onProgress(this.getProgress());
    }
  }

  /**
   * Limpia la caché de assets
   */
  clear() {
    this.images.clear();
    this.sounds.clear();
    this.loadingPromises.clear();
    this.totalAssets = 0;
    this.loadedAssets = 0;
  }

  /**
   * Obtiene estadísticas de memoria
   */
  getStats() {
    return {
      images: this.images.size,
      sounds: this.sounds.size,
      totalAssets: this.totalAssets,
      loadedAssets: this.loadedAssets,
      progress: this.getProgress(),
    };
  }
}
