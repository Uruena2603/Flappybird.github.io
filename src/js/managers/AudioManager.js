/**
 * AudioManager - Sistema de audio profesional
 * Maneja reproducción, volumen, efectos y música de fondo
 */
class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.musicVolume = 0.5;
    this.effectsVolume = 0.7;
    this.isMuted = false;
    this.currentMusic = null;
    this.soundInstances = new Map();
    this.maxInstances = 5; // Límite de instancias simultáneas por sonido
  }

  /**
   * Registra un sonido en el manager
   */
  registerSound(key, audioElement, type = "effect") {
    if (audioElement) {
      this.sounds.set(key, {
        audio: audioElement,
        type: type, // 'effect' o 'music'
        originalVolume: audioElement.volume || 1.0,
      });
    }
  }

  /**
   * Reproduce un efecto de sonido
   */
  playEffect(key, volume = 1.0) {
    if (this.isMuted) return null;

    const soundData = this.sounds.get(key);
    if (!soundData || soundData.type !== "effect") {
      console.warn(`Effect sound not found: ${key}`);
      return null;
    }

    try {
      // Gestión de instancias múltiples
      const instances = this.soundInstances.get(key) || [];

      // Limpia instancias terminadas
      const activeInstances = instances.filter(
        (instance) => !instance.ended && !instance.paused
      );

      // Limita el número de instancias simultáneas
      if (activeInstances.length >= this.maxInstances) {
        activeInstances[0].pause();
        activeInstances[0].currentTime = 0;
      }

      // Clona el audio para múltiples reproducciones
      const audioClone = soundData.audio.cloneNode();
      audioClone.volume =
        soundData.originalVolume * volume * this.effectsVolume;

      // Reproduce el sonido
      const playPromise = audioClone.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn(`Error playing effect ${key}:`, error);
        });
      }

      // Registra la instancia
      activeInstances.push(audioClone);
      this.soundInstances.set(key, activeInstances);

      // Limpia cuando termine
      audioClone.addEventListener("ended", () => {
        const currentInstances = this.soundInstances.get(key) || [];
        const updatedInstances = currentInstances.filter(
          (instance) => instance !== audioClone
        );
        this.soundInstances.set(key, updatedInstances);
      });

      return audioClone;
    } catch (error) {
      console.error(`Error playing effect ${key}:`, error);
      return null;
    }
  }

  /**
   * Reproduce música de fondo
   */
  playMusic(key, loop = true, fadeIn = false) {
    if (this.isMuted) return null;

    const soundData = this.sounds.get(key);
    if (!soundData) {
      console.warn(`Music not found: ${key}`);
      return null;
    }

    try {
      // Detiene música actual
      this.stopMusic();

      const music = soundData.audio;
      music.loop = loop;
      music.volume = fadeIn ? 0 : soundData.originalVolume * this.musicVolume;
      music.currentTime = 0;

      const playPromise = music.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn(`Error playing music ${key}:`, error);
        });
      }

      this.currentMusic = music;

      // Fade in effect
      if (fadeIn) {
        this._fadeIn(music, soundData.originalVolume * this.musicVolume, 1000);
      }

      return music;
    } catch (error) {
      console.error(`Error playing music ${key}:`, error);
      return null;
    }
  }

  /**
   * Detiene la música actual
   */
  stopMusic(fadeOut = false) {
    if (this.currentMusic) {
      if (fadeOut) {
        this._fadeOut(this.currentMusic, 500, () => {
          this.currentMusic.pause();
          this.currentMusic = null;
        });
      } else {
        this.currentMusic.pause();
        this.currentMusic = null;
      }
    }
  }

  /**
   * Pausa/reanuda la música
   */
  toggleMusic() {
    if (this.currentMusic) {
      if (this.currentMusic.paused) {
        this.currentMusic.play().catch((error) => {
          console.warn("Error resuming music:", error);
        });
      } else {
        this.currentMusic.pause();
      }
    }
  }

  /**
   * Establece el volumen de efectos
   */
  setEffectsVolume(volume) {
    this.effectsVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Establece el volumen de música
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      const soundData = Array.from(this.sounds.values()).find(
        (data) => data.audio === this.currentMusic
      );
      if (soundData) {
        this.currentMusic.volume = soundData.originalVolume * this.musicVolume;
      }
    }
  }

  /**
   * Mutea/desmutea todo el audio
   */
  toggleMute() {
    this.isMuted = !this.isMuted;

    if (this.isMuted) {
      this.stopMusic();
      this._stopAllEffects();
    }

    return this.isMuted;
  }

  /**
   * Obtiene el estado de mute
   */
  getMuted() {
    return this.isMuted;
  }

  /**
   * Obtiene los volúmenes actuales
   */
  getVolumes() {
    return {
      effects: this.effectsVolume,
      music: this.musicVolume,
      muted: this.isMuted,
    };
  }

  /**
   * Efecto fade in
   */
  _fadeIn(audio, targetVolume, duration) {
    const startVolume = 0;
    const volumeStep = targetVolume / (duration / 50);
    let currentVolume = startVolume;

    const fadeInterval = setInterval(() => {
      currentVolume += volumeStep;
      if (currentVolume >= targetVolume) {
        currentVolume = targetVolume;
        clearInterval(fadeInterval);
      }
      audio.volume = currentVolume;
    }, 50);
  }

  /**
   * Efecto fade out
   */
  _fadeOut(audio, duration, callback) {
    const startVolume = audio.volume;
    const volumeStep = startVolume / (duration / 50);
    let currentVolume = startVolume;

    const fadeInterval = setInterval(() => {
      currentVolume -= volumeStep;
      if (currentVolume <= 0) {
        currentVolume = 0;
        audio.volume = currentVolume;
        clearInterval(fadeInterval);
        if (callback) callback();
      } else {
        audio.volume = currentVolume;
      }
    }, 50);
  }

  /**
   * Detiene todos los efectos de sonido
   */
  _stopAllEffects() {
    this.soundInstances.forEach((instances, key) => {
      instances.forEach((instance) => {
        if (!instance.paused && !instance.ended) {
          instance.pause();
          instance.currentTime = 0;
        }
      });
    });
    this.soundInstances.clear();
  }

  /**
   * Limpia el manager
   */
  destroy() {
    this.stopMusic();
    this._stopAllEffects();
    this.sounds.clear();
    this.soundInstances.clear();
  }

  /**
   * Obtiene estadísticas del audio
   */
  getStats() {
    const activeInstances = Array.from(this.soundInstances.values()).reduce(
      (total, instances) => total + instances.length,
      0
    );

    return {
      registeredSounds: this.sounds.size,
      activeInstances: activeInstances,
      musicPlaying: this.currentMusic && !this.currentMusic.paused,
      volumes: this.getVolumes(),
    };
  }
}
