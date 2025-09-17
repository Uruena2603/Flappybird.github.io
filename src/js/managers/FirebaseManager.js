/**
 * Firebase Manager - Gestión profesional de Firebase
 * Maneja autenticación, base de datos y sincronización
 *
 * @class FirebaseManager
 * @author Uruena2603
 * @version 1.0.0
 */

class FirebaseManager {
  constructor() {
    // Estado de Firebase
    this.app = null;
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.isInitialized = false;
    this.isOnline = false;

    // Configuración
    this.config = null;
    this.retryAttempts = 3;

    // Estados de autenticación
    this.authStates = {
      LOADING: "loading",
      ANONYMOUS: "anonymous",
      AUTHENTICATED: "authenticated",
      ERROR: "error",
    };

    this.currentAuthState = this.authStates.LOADING;

    // Callbacks para eventos
    this.onAuthStateChangedCallback = null;
    this.onConnectionStateChangedCallback = null;

    console.log("🔥 FirebaseManager: Inicializado");
  }

  /**
   * Inicializar Firebase con configuración
   * @param {Object} firebaseConfig - Configuración de Firebase
   * @returns {Promise<boolean>} - true si se inicializó correctamente
   */
  async initialize(firebaseConfig) {
    try {
      console.log("🔥 FirebaseManager: Iniciando configuración...");

      if (!firebaseConfig) {
        throw new Error("Configuración de Firebase no proporcionada");
      }

      this.config = firebaseConfig;

      // Verificar que Firebase esté disponible globalmente
      if (typeof firebase === "undefined") {
        throw new Error("Firebase SDK no está cargado");
      }

      // Inicializar Firebase App
      this.app = firebase.initializeApp(firebaseConfig);

      // Inicializar servicios
      this.auth = firebase.auth();
      this.db = firebase.firestore();

      // Configurar Firestore para offline
      this.db.enableNetwork();

      // Configurar listeners de estado
      this.setupAuthStateListener();
      this.setupConnectionListener();

      // Inicializar usuario anónimo automáticamente
      await this.initializeAnonymousUser();

      this.isInitialized = true;
      console.log("🔥 FirebaseManager: ✅ Configuración completada");

      return true;
    } catch (error) {
      console.error("🔥 FirebaseManager: ❌ Error inicializando:", error);
      this.currentAuthState = this.authStates.ERROR;
      return false;
    }
  }

  /**
   * Configurar listener de cambios de autenticación
   * @private
   */
  setupAuthStateListener() {
    if (!this.auth) return;

    this.auth.onAuthStateChanged((user) => {
      console.log(
        "🔥 FirebaseManager: Estado de auth cambió:",
        user ? "autenticado" : "no autenticado"
      );

      this.currentUser = user;

      if (user) {
        if (user.isAnonymous) {
          this.currentAuthState = this.authStates.ANONYMOUS;
          console.log("🔥 FirebaseManager: Usuario anónimo activo");
        } else {
          this.currentAuthState = this.authStates.AUTHENTICATED;
          console.log(
            "🔥 FirebaseManager: Usuario registrado activo:",
            user.displayName || user.email
          );
        }
      } else {
        this.currentAuthState = this.authStates.LOADING;
        console.log("🔥 FirebaseManager: No hay usuario activo");
      }

      // Notificar cambio de estado
      if (this.onAuthStateChangedCallback) {
        this.onAuthStateChangedCallback(this.currentAuthState, user);
      }
    });
  }

  /**
   * Configurar listener de estado de conexión
   * @private
   */
  setupConnectionListener() {
    if (!this.db) return;

    // Para simplificar, solo verificamos si Firestore está disponible
    // En lugar de usar Realtime Database para detectar conexión
    this.isOnline = true; // Asumimos online por defecto
    console.log(`🔥 FirebaseManager: Conexión 🟢 Online (Firestore ready)`);

    if (this.onConnectionStateChangedCallback) {
      this.onConnectionStateChangedCallback(this.isOnline);
    }
  }

  /**
   * Inicializar usuario anónimo automáticamente
   * @private
   */
  async initializeAnonymousUser() {
    try {
      if (!this.auth.currentUser) {
        console.log("🔥 FirebaseManager: Creando usuario anónimo...");
        const result = await this.auth.signInAnonymously();
        console.log(
          "🔥 FirebaseManager: ✅ Usuario anónimo creado:",
          result.user.uid
        );
        return result.user;
      }
      return this.auth.currentUser;
    } catch (error) {
      console.warn(
        "🔥 FirebaseManager: ⚠️ Error creando usuario anónimo:",
        error
      );
      return null;
    }
  }

  // =========================
  // MÉTODOS DE AUTENTICACIÓN
  // =========================

  /**
   * Verificar si hay un usuario autenticado
   * @returns {boolean}
   */
  isUserAuthenticated() {
    return this.currentAuthState === this.authStates.AUTHENTICATED;
  }

  /**
   * Verificar si el usuario actual es anónimo
   * @returns {boolean}
   */
  isUserAnonymous() {
    return this.currentAuthState === this.authStates.ANONYMOUS;
  }

  /**
   * Obtener información del usuario actual
   * @returns {Object|null}
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Obtener nombre para mostrar del usuario
   * @returns {string}
   */
  getUserDisplayName() {
    if (!this.currentUser) return "Invitado";

    if (this.currentUser.isAnonymous) {
      return "Jugador Anónimo";
    }

    return this.currentUser.displayName || this.currentUser.email || "Usuario";
  }

  /**
   * Obtener UID único del usuario
   * @returns {string|null}
   */
  getUserId() {
    return this.currentUser ? this.currentUser.uid : null;
  }

  // =======================
  // MÉTODOS DE BASE DE DATOS
  // =======================

  /**
   * Verificar si Firebase está listo para usar
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.auth && this.db && this.currentUser;
  }

  /**
   * Obtener referencia de colección
   * @param {string} collectionName - Nombre de la colección
   * @returns {firebase.firestore.CollectionReference|null}
   */
  getCollection(collectionName) {
    if (!this.isReady()) {
      console.warn("🔥 FirebaseManager: No está listo para operaciones de DB");
      return null;
    }
    return this.db.collection(collectionName);
  }

  // ================
  // MÉTODOS UTILITARIOS
  // ================

  /**
   * Configurar callback para cambios de autenticación
   * @param {Function} callback
   */
  onAuthStateChanged(callback) {
    this.onAuthStateChangedCallback = callback;
  }

  /**
   * Configurar callback para cambios de conexión
   * @param {Function} callback
   */
  onConnectionStateChanged(callback) {
    this.onConnectionStateChangedCallback = callback;
  }

  /**
   * Obtener estado completo para debug
   * @returns {Object}
   */
  getDebugInfo() {
    return {
      initialized: this.isInitialized,
      online: this.isOnline,
      authState: this.currentAuthState,
      userId: this.getUserId(),
      displayName: this.getUserDisplayName(),
      isAnonymous: this.isUserAnonymous(),
      isAuthenticated: this.isUserAuthenticated(),
      ready: this.isReady(),
    };
  }

  /**
   * Limpiar recursos y listeners
   */
  cleanup() {
    console.log("🔥 FirebaseManager: Limpiando recursos...");

    if (this.auth) {
      // Remover listeners si es necesario
    }

    this.onAuthStateChangedCallback = null;
    this.onConnectionStateChangedCallback = null;

    console.log("🔥 FirebaseManager: ✅ Recursos limpiados");
  }
}

// Verificar que no haya conflictos con otros managers
if (typeof window !== "undefined") {
  window.FirebaseManager = FirebaseManager;
}

console.log("🔥 FirebaseManager: Clase definida correctamente");
