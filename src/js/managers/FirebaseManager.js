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
    this.debugMode = false; // Para controlar logs excesivos

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

      // OPCIONAL: Detectar si estamos en localhost y mostrar aviso
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        console.warn(
          "🔥 Firebase: Ejecutando en localhost - algunos features pueden tener limitaciones CORS"
        );
      }

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

      // NUEVO: Manejar resultados de redirect ANTES de configurar listeners
      await this.handleRedirectResult();

      // Configurar listeners de estado
      this.setupAuthStateListener();
      this.setupConnectionListener();

      // Inicializar usuario anónimo automáticamente (solo si no hay usuario)
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
   * Configurar listener de cambios de autenticación (MEJORADO)
   * @private
   */
  setupAuthStateListener() {
    if (!this.auth) return;

    // CRÍTICO: Configurar persistencia ANTES de cualquier operación
    this.auth
      .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        console.log(
          "🔥 FirebaseManager: Persistencia configurada correctamente"
        );

        // IMPORTANTE: Verificar si ya hay un usuario persistente ANTES de crear anónimo
        if (this.auth.currentUser && !this.auth.currentUser.isAnonymous) {
          console.log(
            "🔥 FirebaseManager: Usuario persistente detectado en inicio"
          );
          return; // No crear usuario anónimo
        }
      })
      .catch((error) => {
        console.warn(
          "🔥 FirebaseManager: Error configurando persistencia:",
          error
        );
      });

    this.auth.onAuthStateChanged((user) => {
      console.log(
        "🔥 FirebaseManager: Estado de auth cambió:",
        user
          ? `${
              user.isAnonymous ? "anónimo" : "registrado"
            } (${user.uid.substring(0, 8)}...)`
          : "no autenticado"
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
            user.displayName || user.email || "Sin nombre"
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
   * Maneja resultados de redirect después de Google Auth
   * @private
   */
  async handleRedirectResult() {
    try {
      const result = await this.auth.getRedirectResult();

      if (result && result.user) {
        console.log(
          "🔥 FirebaseManager: ✅ Redirect exitoso:",
          result.user.email
        );

        // Limpiar flags de upgrade pendiente
        sessionStorage.removeItem("firebase_upgrade_pending");
        sessionStorage.removeItem("firebase_anonymous_uid");

        return true;
      }

      // Verificar si había un upgrade pendiente que falló
      const upgradePending = sessionStorage.getItem("firebase_upgrade_pending");
      if (upgradePending) {
        console.log("🔥 FirebaseManager: Upgrade pendiente no completado");
        sessionStorage.removeItem("firebase_upgrade_pending");
        sessionStorage.removeItem("firebase_anonymous_uid");
      }

      return false;
    } catch (error) {
      console.warn(
        "🔥 FirebaseManager: Error manejando redirect result:",
        error
      );

      // Limpiar flags en caso de error
      sessionStorage.removeItem("firebase_upgrade_pending");
      sessionStorage.removeItem("firebase_anonymous_uid");

      return false;
    }
  }

  /**
   * Inicializar usuario anónimo automáticamente (MEJORADO)
   * @private
   */
  async initializeAnonymousUser() {
    try {
      // IMPORTANTE: Solo crear anónimo si NO hay usuario actual
      if (this.auth.currentUser) {
        console.log(
          "🔥 FirebaseManager: Usuario ya existe, no creando anónimo"
        );
        console.log("🔥 FirebaseManager: Usuario actual:", {
          uid: this.auth.currentUser.uid.substring(0, 8) + "...",
          isAnonymous: this.auth.currentUser.isAnonymous,
          email: this.auth.currentUser.email,
        });
        return this.auth.currentUser;
      }

      console.log("🔥 FirebaseManager: No hay usuario, creando anónimo...");
      const result = await this.auth.signInAnonymously();
      console.log(
        "🔥 FirebaseManager: ✅ Usuario anónimo creado:",
        result.user.uid.substring(0, 8) + "..."
      );
      return result.user;
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

  /**
   * Convierte usuario anónimo a cuenta permanente con Google (CORREGIDO CORS)
   * @returns {Promise<boolean>} - true si fue exitoso
   */
  async upgradeAnonymousToGoogle() {
    try {
      // Verificar si ya está registrado permanentemente
      if (this.isUserPermanentlyRegistered()) {
        console.log(
          "🔥 FirebaseManager: Usuario ya registrado permanentemente"
        );
        return true;
      }

      console.log("🔥 FirebaseManager: Iniciando upgrade a Google...");

      // Crear proveedor de Google
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope("email");
      provider.addScope("profile");

      // SOLUCIÓN CORS: Usar signInWithRedirect en lugar de linkWithPopup
      if (this.isUserAnonymous() && this.auth.currentUser) {
        try {
          // Intentar linkWithPopup primero (funciona en algunos navegadores)
          console.log("🔥 FirebaseManager: Intentando link con popup...");
          const result = await this.auth.currentUser.linkWithPopup(provider);
          console.log("🔥 FirebaseManager: ✅ Link con popup exitoso");
          return true;
        } catch (popupError) {
          if (
            popupError.code === "auth/popup-blocked" ||
            popupError.code === "auth/popup-closed-by-user" ||
            popupError.message.includes("popup") ||
            popupError.message.includes("Cross-Origin-Opener-Policy")
          ) {
            console.log("🔥 FirebaseManager: Popup falló, usando redirect...");

            // Guardar estado antes del redirect
            sessionStorage.setItem("firebase_upgrade_pending", "true");
            sessionStorage.setItem(
              "firebase_anonymous_uid",
              this.auth.currentUser.uid
            );

            // Usar redirect como fallback
            await this.auth.currentUser.linkWithRedirect(provider);
            return true; // El resultado se manejará después del redirect
          }

          // Si es otro error, usar el manejo normal
          throw popupError;
        }
      }

      // Fallback para usuarios no anónimos
      console.log("🔥 FirebaseManager: Haciendo login directo...");
      const result = await this.auth.signInWithPopup(provider);
      console.log("🔥 FirebaseManager: ✅ Login directo exitoso");
      return true;
    } catch (error) {
      console.error("🔥 FirebaseManager: ❌ Error en upgrade:", error);
      return await this.handleAuthError(error);
    }
  }

  /**
   * Maneja errores de autenticación de manera inteligente
   * @param {Error} error - Error de Firebase Auth
   * @returns {Promise<boolean>}
   */
  async handleAuthError(error) {
    console.log("🔥 FirebaseManager: Manejando error de auth:", error.code);

    try {
      switch (error.code) {
        case "auth/credential-already-in-use":
          // El usuario ya tiene cuenta - hacer sign in directo
          console.log(
            "🔥 FirebaseManager: Detectada cuenta existente, haciendo login directo..."
          );
          const provider = new firebase.auth.GoogleAuthProvider();
          const result = await this.auth.signInWithPopup(provider);
          console.log(
            "🔥 FirebaseManager: ✅ Login directo exitoso:",
            result.user.displayName
          );
          return true;

        case "auth/popup-blocked":
          console.error("🔥 FirebaseManager: Popup bloqueado por navegador");
          throw new Error(
            "Por favor, permite los popups en tu navegador para completar el registro"
          );

        case "auth/cancelled-popup-request":
          console.error("🔥 FirebaseManager: Usuario canceló registro");
          throw new Error("Registro cancelado por el usuario");

        case "auth/popup-closed-by-user":
          console.error("🔥 FirebaseManager: Usuario cerró popup");
          throw new Error(
            "Ventana de registro cerrada. Por favor, inténtalo de nuevo"
          );

        default:
          console.error("🔥 FirebaseManager: Error no manejado:", error.code);
          throw new Error(
            "Error en el registro. Por favor, inténtalo de nuevo más tarde"
          );
      }
    } catch (handleError) {
      console.error(
        "🔥 FirebaseManager: Error en manejo de error:",
        handleError
      );
      throw handleError;
    }
  }

  /**
   * Crear cuenta nueva con Google (para uso futuro)
   * @returns {Promise<boolean>}
   */
  async signInWithGoogle() {
    try {
      console.log("🔥 FirebaseManager: Iniciando login con Google...");

      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope("email");
      provider.addScope("profile");

      const result = await this.auth.signInWithPopup(provider);

      console.log(
        "🔥 FirebaseManager: ✅ Login exitoso:",
        result.user.displayName
      );
      return true;
    } catch (error) {
      console.error("🔥 FirebaseManager: ❌ Error en login:", error);
      return false;
    }
  }

  /**
   * Verificar si hay un usuario permanentemente registrado (OPTIMIZADO)
   * @returns {boolean}
   */
  isUserPermanentlyRegistered() {
    if (!this.currentUser) {
      return false;
    }

    const isPermanent =
      !this.currentUser.isAnonymous &&
      this.currentUser.providerData &&
      this.currentUser.providerData.length > 0;

    // CORREGIDO: Solo log en debug mode para evitar spam
    if (this.debugMode) {
      console.log("🔥 FirebaseManager: Usuario permanente?", isPermanent);
      console.log(
        "🔥 FirebaseManager: isAnonymous:",
        this.currentUser.isAnonymous
      );
      console.log(
        "🔥 FirebaseManager: providerData length:",
        this.currentUser.providerData?.length || 0
      );
    }

    return isPermanent;
  }

  /**
   * Obtener información completa del usuario (SIN LOGS EXCESIVOS)
   * @returns {Object|null}
   */
  getUserInfo() {
    if (!this.currentUser) {
      return null;
    }

    const userInfo = {
      uid: this.currentUser.uid,
      isAnonymous: this.currentUser.isAnonymous,
      displayName: this.currentUser.displayName,
      email: this.currentUser.email,
      photoURL: this.currentUser.photoURL,
      providerData: this.currentUser.providerData,
      isPermanent: this.isUserPermanentlyRegistered(),
    };

    // CORREGIDO: Solo log cuando se solicita explícitamente
    if (this.debugMode) {
      console.log("🔥 FirebaseManager: Info de usuario obtenida:", {
        uid: userInfo.uid,
        isAnonymous: userInfo.isAnonymous,
        displayName: userInfo.displayName,
        email: userInfo.email,
        isPermanent: userInfo.isPermanent,
        providers: userInfo.providerData?.map((p) => p.providerId) || [],
      });
    }

    return userInfo;
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

  /**
   * Configurar nickname personalizado del usuario
   * @param {string} nickname - Nickname elegido por el usuario
   * @returns {Promise<boolean>}
   */
  async setUserNickname(nickname) {
    try {
      if (!this.isReady() || !this.currentUser) {
        console.error("🔥 FirebaseManager: No listo para configurar nickname");
        return false;
      }

      // Validar nickname
      if (!nickname || typeof nickname !== "string") {
        throw new Error("El nickname debe ser un texto válido");
      }

      const cleanNickname = nickname.trim();

      if (cleanNickname.length < 2 || cleanNickname.length > 20) {
        throw new Error("El nickname debe tener entre 2 y 20 caracteres");
      }

      // Guardar en Firestore
      await this.db.collection("users").doc(this.currentUser.uid).set(
        {
          nickname: cleanNickname,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          userId: this.currentUser.uid,
          email: this.currentUser.email,
          displayName: this.currentUser.displayName,
        },
        { merge: true }
      );

      console.log(
        "🔥 FirebaseManager: ✅ Nickname configurado:",
        cleanNickname
      );
      return true;
    } catch (error) {
      console.error(
        "🔥 FirebaseManager: ❌ Error configurando nickname:",
        error
      );
      throw error;
    }
  }

  /**
   * Obtener nickname del usuario (o generar uno por defecto)
   * @returns {Promise<string>}
   */
  async getUserNickname() {
    try {
      if (!this.isReady() || !this.currentUser) {
        console.log("🔥 FirebaseManager: No listo para obtener nickname");
        return "Jugador Anónimo";
      }

      if (this.currentUser.isAnonymous) {
        return "Jugador Anónimo";
      }

      // Intentar obtener de Firestore
      const userDoc = await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .get();

      if (userDoc.exists && userDoc.data().nickname) {
        const nickname = userDoc.data().nickname;
        console.log(
          "🔥 FirebaseManager: Nickname obtenido de Firestore:",
          nickname
        );
        return nickname;
      }

      // Fallback a nombre de Google
      const fallbackName =
        this.currentUser.displayName ||
        this.currentUser.email?.split("@")[0] ||
        "Usuario";

      console.log(
        "🔥 FirebaseManager: Usando nickname por defecto:",
        fallbackName
      );
      return fallbackName;
    } catch (error) {
      console.warn("🔥 FirebaseManager: Error obteniendo nickname:", error);
      return (
        this.currentUser?.displayName ||
        this.currentUser?.email?.split("@")[0] ||
        "Usuario"
      );
    }
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
