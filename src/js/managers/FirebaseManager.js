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
   * Maneja resultados de redirect después de Google Auth (MEJORADO)
   * @private
   */
  async handleRedirectResult() {
    try {
      const result = await this.auth.getRedirectResult();

      if (result && result.user) {
        console.log(
          "🔥 FirebaseManager: ✅ Redirect exitoso:",
          result.user.email || "Usuario sin email"
        );

        // Limpiar flags de upgrade pendiente
        sessionStorage.removeItem("firebase_upgrade_pending");
        sessionStorage.removeItem("firebase_anonymous_uid");

        // Verificar si era un upgrade de usuario anónimo
        const wasUpgrade =
          sessionStorage.getItem("firebase_upgrade_pending") === "true";
        if (wasUpgrade) {
          console.log(
            "🔥 FirebaseManager: ✅ Upgrade de anónimo a permanente completado"
          );
        }

        return true;
      }

      // Verificar si había un upgrade pendiente que no se completó
      const upgradePending = sessionStorage.getItem("firebase_upgrade_pending");
      if (upgradePending) {
        console.log("🔥 FirebaseManager: ⚠️ Upgrade pendiente no completado");
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
   * Convierte usuario anónimo a cuenta permanente con Google (SOLUCIONADO CORS)
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

      // NUEVA ESTRATEGIA: Detectar entorno de producción vs desarrollo
      const isProduction =
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1";

      if (this.isUserAnonymous() && this.auth.currentUser) {
        try {
          console.log(
            "🔥 FirebaseManager: Intentando upgrade de usuario anónimo..."
          );

          if (isProduction) {
            // EN PRODUCCIÓN: Usar signInWithRedirect directamente para evitar CORS
            console.log(
              "🔥 FirebaseManager: Producción detectada - usando redirect..."
            );

            // Guardar estado del usuario anónimo antes del redirect
            sessionStorage.setItem("firebase_upgrade_pending", "true");
            sessionStorage.setItem(
              "firebase_anonymous_uid",
              this.auth.currentUser.uid
            );

            // Usar redirect en producción (más confiable)
            await this.auth.currentUser.linkWithRedirect(provider);
            return true; // El resultado se manejará después del redirect
          } else {
            // EN DESARROLLO: Intentar popup primero
            console.log("🔥 FirebaseManager: Desarrollo - intentando popup...");
            const result = await this.auth.currentUser.linkWithPopup(provider);
            console.log("🔥 FirebaseManager: ✅ Link con popup exitoso");
            return true;
          }
        } catch (linkError) {
          console.log(
            "🔥 FirebaseManager: Error en link, intentando manejo inteligente:",
            linkError.code
          );

          // Si el error es que la cuenta ya existe, hacer login directo
          if (linkError.code === "auth/credential-already-in-use") {
            return await this.handleExistingAccountLogin(provider);
          }

          // Para otros errores en producción, usar redirect
          if (isProduction) {
            console.log(
              "🔥 FirebaseManager: Fallback a redirect en producción..."
            );
            await this.auth.signInWithRedirect(provider);
            return true;
          }

          throw linkError;
        }
      }

      // Usuario no anónimo - hacer login directo
      console.log("🔥 FirebaseManager: Haciendo login directo...");

      if (isProduction) {
        // En producción, usar redirect para login directo también
        await this.auth.signInWithRedirect(provider);
        return true;
      } else {
        // En desarrollo, usar popup
        const result = await this.auth.signInWithPopup(provider);
        console.log("🔥 FirebaseManager: ✅ Login directo exitoso");
        return true;
      }
    } catch (error) {
      console.error("🔥 FirebaseManager: ❌ Error en upgrade:", error);
      return await this.handleAuthError(error);
    }
  }

  /**
   * Maneja login cuando la cuenta ya existe (NUEVO)
   * @private
   */
  async handleExistingAccountLogin(provider) {
    try {
      console.log(
        "🔥 FirebaseManager: Cuenta existente detectada - haciendo login directo..."
      );

      const isProduction =
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1";

      if (isProduction) {
        // En producción usar redirect
        await this.auth.signInWithRedirect(provider);
        return true;
      } else {
        // En desarrollo usar popup
        const result = await this.auth.signInWithPopup(provider);
        console.log("🔥 FirebaseManager: ✅ Login de cuenta existente exitoso");
        return true;
      }
    } catch (error) {
      console.error(
        "🔥 FirebaseManager: Error en login de cuenta existente:",
        error
      );
      throw error;
    }
  }

  /**
   * Maneja errores de autenticación de manera inteligente
   * @param {Error} error - Error de Firebase Auth
   * @returns {Promise<boolean>}
   */
  async handleAuthError(error) {
    console.log("🔥 FirebaseManager: Manejando error de auth:", error.code);

    const isProduction =
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1";

    try {
      switch (error.code) {
        case "auth/credential-already-in-use":
          // La cuenta ya existe - hacer login directo
          console.log(
            "🔥 FirebaseManager: Detectada cuenta existente, haciendo login directo..."
          );
          const provider = new firebase.auth.GoogleAuthProvider();
          return await this.handleExistingAccountLogin(provider);

        case "auth/popup-blocked":
        case "auth/popup-closed-by-user":
        case "auth/cancelled-popup-request":
          if (isProduction) {
            console.log(
              "🔥 FirebaseManager: Error de popup en producción - usando redirect..."
            );
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope("email");
            provider.addScope("profile");
            await this.auth.signInWithRedirect(provider);
            return true;
          } else {
            throw new Error(
              "Por favor, permite los popups en tu navegador para completar el registro"
            );
          }

        case "auth/network-request-failed":
          throw new Error(
            "Error de conexión. Verifica tu internet e inténtalo de nuevo"
          );

        case "auth/too-many-requests":
          throw new Error(
            "Demasiados intentos. Espera un momento e inténtalo de nuevo"
          );

        default:
          console.error("🔥 FirebaseManager: Error no manejado:", error.code);

          if (isProduction) {
            // En producción, siempre ofrecer redirect como fallback
            console.log(
              "🔥 FirebaseManager: Fallback a redirect para error no manejado..."
            );
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope("email");
            provider.addScope("profile");
            await this.auth.signInWithRedirect(provider);
            return true;
          } else {
            throw new Error(
              "Error en el registro. Por favor, inténtalo de nuevo más tarde"
            );
          }
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
  /**
   * Verificar si un nickname ya existe
   * @param {string} nickname
   * @returns {Promise<boolean>}
   */
  async checkNicknameExists(nickname) {
    try {
      if (!this.isReady()) return false;

      const snapshot = await this.db
        .collection("users")
        .where("nickname", "==", nickname.trim())
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      console.warn("🔥 FirebaseManager: Error verificando nickname:", error);
      return false; // En caso de error, permitir el nickname
    }
  }

  /**
   * Configurar nickname personalizado del usuario (MEJORADO CON VALIDACIÓN)
   * @param {string} nickname - Nickname elegido por el usuario
   * @returns {Promise<boolean>}
   */
  async setUserNickname(nickname) {
    try {
      if (
        !this.isReady() ||
        !this.currentUser ||
        this.currentUser.isAnonymous
      ) {
        throw new Error("Usuario no válido para configurar nickname");
      }

      // Validar nickname
      const cleanNickname = nickname.trim();
      if (
        !cleanNickname ||
        cleanNickname.length < 2 ||
        cleanNickname.length > 20
      ) {
        throw new Error("El nickname debe tener entre 2 y 20 caracteres");
      }

      // Verificar caracteres válidos (letras, números, espacios, guiones)
      const validChars = /^[a-zA-Z0-9\s\-_]+$/;
      if (!validChars.test(cleanNickname)) {
        throw new Error(
          "El nickname solo puede contener letras, números, espacios y guiones"
        );
      }

      // Verificar si el nickname ya existe
      const nicknameExists = await this.checkNicknameExists(cleanNickname);
      if (nicknameExists) {
        throw new Error("Este nickname ya está en uso, elige otro");
      }

      // Guardar en Firestore
      await this.db.collection("users").doc(this.currentUser.uid).set(
        {
          nickname: cleanNickname,
          email: this.currentUser.email,
          displayName: this.currentUser.displayName,
          photoURL: this.currentUser.photoURL,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
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
   * Obtener nickname del usuario actual (MEJORADO)
   * @returns {Promise<string>}
   */
  async getUserNickname() {
    try {
      if (!this.isReady() || !this.currentUser) return "Jugador Anónimo";

      if (this.currentUser.isAnonymous) return "Jugador Anónimo";

      // Intentar obtener de Firestore primero
      const userDoc = await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .get();

      if (userDoc.exists && userDoc.data().nickname) {
        return userDoc.data().nickname;
      }

      // Fallback: usar displayName de Google o email
      return (
        this.currentUser.displayName ||
        this.currentUser.email?.split("@")[0] ||
        "Usuario"
      );
    } catch (error) {
      console.warn("🔥 FirebaseManager: Error obteniendo nickname:", error);
      return this.currentUser?.displayName || "Usuario";
    }
  }

  /**
   * Verificar si el usuario necesita configurar nickname personalizado
   * @returns {Promise<boolean>}
   */
  async needsNicknameSetup() {
    try {
      if (
        !this.isReady() ||
        !this.currentUser ||
        this.currentUser.isAnonymous
      ) {
        return false;
      }

      const userDoc = await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .get();

      // Si no existe documento o no tiene nickname personalizado
      if (!userDoc.exists || !userDoc.data().nickname) {
        return true;
      }

      const nickname = userDoc.data().nickname;

      // Si el nickname es igual al displayName o email, necesita personalización
      return (
        nickname === this.currentUser.displayName ||
        nickname === this.currentUser.email?.split("@")[0]
      );
    } catch (error) {
      console.warn(
        "🔥 FirebaseManager: Error verificando necesidad de nickname:",
        error
      );
      return false;
    }
  }

  // ==================== LEADERBOARD SYSTEM ====================

  /**
   * Guarda puntuación en el leaderboard global con nueva arquitectura separada
   * NUEVA LÓGICA: Siempre guarda en game_sessions, solo actualiza leaderboard si es record
   * @param {number} score - Puntuación obtenida
   * @param {number} level - Nivel alcanzado
   * @param {number} gameTime - Tiempo de juego en segundos
   * @param {Object} gameStats - Estadísticas adicionales del juego
   * @returns {Promise<boolean>}
   */
  async saveScore(score, level, gameTime, gameStats = {}) {
    try {
      // Verificaciones de seguridad mejoradas
      if (!this.isReady()) {
        console.warn("🔥 FirebaseManager: No está listo para guardar score");
        return false;
      }

      if (!this.currentUser) {
        console.warn("🔥 FirebaseManager: No hay usuario autenticado");
        return false;
      }

      if (this.currentUser.isAnonymous) {
        console.log("🔥 FirebaseManager: Usuario anónimo - no se guarda score en leaderboard");
        return false;
      }

      console.log(
        `🔥 FirebaseManager: Guardando score - Score: ${score}, Level: ${level}, Time: ${gameTime}s`
      );

      const userNickname = await this.getUserNickname();
      const userId = this.currentUser.uid;

      // Datos completos del score para el leaderboard global
      const scoreData = {
        userId: userId,
        nickname: userNickname,
        email: this.currentUser.email,
        score: score,
        level: level,
        gameTime: gameTime,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),

        // Estadísticas adicionales
        totalJumps: gameStats.totalJumps || 0,
        pipesPassedCount: Math.floor(score), // pipes pasados = score
        accuracy: gameStats.accuracy || 0,
        maxHeight: gameStats.maxHeight || 0,

        // Metadatos
        gameVersion: "2.0.0",
        platform: this.getBrowserInfo(),
        deviceType: this.getDeviceType(),
        userAgent: navigator.userAgent,
      };

      // 🎯 USAR BATCH OPERATIONS PARA OPERACIONES ATÓMICAS
      console.log("🔥 FirebaseManager: Iniciando operaciones batch...");
      const batch = this.db.batch();

      // 1. Guardar en leaderboard global
      const scoreRef = this.db.collection("leaderboard_scores").doc();
      batch.set(scoreRef, scoreData);
      console.log("🔥 FirebaseManager: Agregado al batch - leaderboard global");

      // 2. Guardar en historial personal del usuario
      console.log("🔥 FirebaseManager: Guardando en historial de partidas...");
      const gameHistoryRef = this.db
        .collection("user_game_history")
        .doc(userId)
        .collection("games")
        .doc();
      
      batch.set(gameHistoryRef, {
        ...scoreData,
        gameId: gameHistoryRef.id,
      });
      console.log("🔥 FirebaseManager: Agregado al batch - historial personal");

      // 3. Actualizar estadísticas personales del usuario
      const userStatsRef = this.db.collection("user_stats").doc(userId);
      batch.set(userStatsRef, {
        userId: userId,
        nickname: userNickname,
        email: this.currentUser.email,
        totalGames: firebase.firestore.FieldValue.increment(1),
        bestScore: score, // Se actualizará con el máximo en el servidor
        totalPlayTime: firebase.firestore.FieldValue.increment(gameTime),
        lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
        averageScore: score, // Se calculará correctamente en el servidor
        level: level,
      }, { merge: true });
      console.log("🔥 FirebaseManager: Agregado al batch - estadísticas personales");

      // Ejecutar todas las operaciones de forma atómica
      await batch.commit();
      
      console.log("🔥 FirebaseManager: ✅ Score guardado exitosamente con batch operations");
      return true;

    } catch (error) {
      console.error("🔥 FirebaseManager: ❌ Error guardando score:", error);
      
      // Diagnóstico detallado mejorado
      if (error.code === "permission-denied") {
        console.error("🚨 Error de permisos - Verificar reglas de Firestore:");
        console.error("   - ¿Las reglas están publicadas?");
        console.error(`   - ¿El usuario está autenticado? ${!!this.currentUser}`);
        console.error(`   - ¿Usuario anónimo? ${this.currentUser?.isAnonymous}`);
        console.error(`   - UID del usuario: ${this.currentUser?.uid}`);
        console.error(`   - Email del usuario: ${this.currentUser?.email}`);
        console.error("   - Verifica que las reglas permitan escritura para usuarios registrados");
      } else {
        console.error("   - Tipo de error:", error.code);
        console.error("   - Mensaje:", error.message);
      }
      
      return false;
    }
  }

  /**
   * 🎯 NUEVO MÉTODO: Verifica si es record personal y actualiza leaderboard
   * @param {string} userId - ID del usuario
   * @param {string} nickname - Nickname del usuario
   * @param {number} score - Score actual
   * @param {number} level - Nivel actual
   * @param {number} gameTime - Tiempo de juego
   * @param {Object} gameSessionData - Datos completos de la sesión
   * @returns {Promise<boolean>} - true si se actualizó el leaderboard
   */
  async checkAndUpdateLeaderboard(
    userId,
    nickname,
    score,
    level,
    gameTime,
    gameSessionData
  ) {
    try {
      // Obtener record actual del usuario
      const currentRecordQuery = await this.db
        .collection("leaderboard")
        .where("userId", "==", userId)
        .limit(1)
        .get();

      const leaderboardData = {
        userId: userId,
        nickname: nickname,
        email: gameSessionData.email,
        score: score,
        level: level,
        gameTime: gameTime,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),

        // Mantener mejores estadísticas
        totalJumps: gameSessionData.totalJumps,
        pipesPassedCount: gameSessionData.pipesPassedCount,
        accuracy: gameSessionData.accuracy,
        maxHeight: gameSessionData.maxHeight,

        // Metadatos
        gameVersion: gameSessionData.gameVersion,
        platform: gameSessionData.platform,
        deviceType: gameSessionData.deviceType,
      };

      if (currentRecordQuery.empty) {
        // 🆕 PRIMER RECORD: Crear entrada nueva en leaderboard
        console.log(
          "🔥 FirebaseManager: Primer record del usuario, creando entrada en leaderboard"
        );

        const newRecordRef = await this.db
          .collection("leaderboard")
          .add(leaderboardData);

        console.log(
          "� FirebaseManager: ✅ Nueva entrada de leaderboard creada:",
          newRecordRef.id
        );
        return true;
      } else {
        // 🔄 VERIFICAR SI SUPERA RECORD ACTUAL
        const currentRecord = currentRecordQuery.docs[0];
        const currentBestScore = currentRecord.data().score || 0;

        if (score > currentBestScore) {
          console.log(
            `🔥 FirebaseManager: ¡Nuevo record! ${score} > ${currentBestScore}`
          );

          // Actualizar record existente
          await currentRecord.ref.update(leaderboardData);

          console.log(
            "🔥 FirebaseManager: ✅ Record de leaderboard actualizado"
          );
          return true;
        } else {
          console.log(
            `🔥 FirebaseManager: Score ${score} no supera record actual ${currentBestScore}`
          );
          return false;
        }
      }
    } catch (error) {
      console.error(
        "🔥 FirebaseManager: ❌ Error verificando/actualizando leaderboard:",
        error
      );
      return false;
    }
  }

  /**
   * Obtiene el leaderboard global (MEJORADO CON FALLBACK)
   * @param {number} limit - Número máximo de resultados
   * @returns {Promise<Array>}
   */
  async getGlobalLeaderboard(limit = 10) {
    try {
      // Verificaciones de seguridad mejoradas
      if (!this.isReady()) {
        console.warn(
          "🔥 FirebaseManager: Firebase no está listo para obtener leaderboard"
        );
        return [];
      }

      console.log(
        `🔥 FirebaseManager: Obteniendo leaderboard global (top ${limit})...`
      );

      // Usar la nueva colección leaderboard_scores con mejores consultas
      let snapshot;
      try {
        console.log("🔥 FirebaseManager: Intentando consulta con índice compuesto...");
        snapshot = await this.db
          .collection("leaderboard_scores")
          .orderBy("score", "desc")
          .orderBy("timestamp", "asc") // En caso de empate, el más antiguo primero
          .limit(limit)
          .get();
          
        console.log(`🔥 FirebaseManager: ✅ Consulta exitosa con ${snapshot.docs.length} resultados`);
      } catch (indexError) {
        if (indexError.message?.includes("index") || indexError.code === "failed-precondition") {
          console.warn(
            "🔥 FirebaseManager: ⚠️ Índices no listos - usando consulta simple por score"
          );
          // Fallback: solo orderBy score
          snapshot = await this.db
            .collection("leaderboard_scores")
            .orderBy("score", "desc")
            .limit(limit)
            .get();
            
          console.log(`🔥 FirebaseManager: ✅ Consulta fallback exitosa con ${snapshot.docs.length} resultados`);
        } else {
          throw indexError;
        }
      }

      // Procesar los resultados con mejor manejo de datos
      const leaderboard = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          rank: index + 1,
          id: doc.id,
          nickname: data.nickname || "Jugador Anónimo",
          score: data.score || 0,
          level: data.level || 1,
          gameTime: data.gameTime || 0,
          timestamp: data.timestamp?.toDate?.() || null,
          totalJumps: data.totalJumps || 0,
          accuracy: data.accuracy || 0,
          maxHeight: data.maxHeight || 0,
          platform: data.platform || "Unknown",
          deviceType: data.deviceType || "Unknown",
          gameVersion: data.gameVersion || "1.0.0",
          isCurrentUser: data.userId === this.currentUser?.uid,
        };
      });

      console.log(
        `🔥 FirebaseManager: ✅ Leaderboard obtenido (${leaderboard.length} records)`
      );
      
      // Log adicional para debugging
      if (leaderboard.length > 0) {
        console.log(`🔥 Top score: ${leaderboard[0].nickname} - ${leaderboard[0].score} puntos`);
      }
      
      return leaderboard;

    } catch (error) {
      console.error(
        "🔥 FirebaseManager: ❌ Error obteniendo leaderboard:",
        error
      );

      // Diagnóstico detallado mejorado
      if (error.code === "permission-denied") {
        console.error("🚨 Error de permisos en leaderboard - Verificar:");
        console.error("   - ¿Las reglas permiten lectura de 'leaderboard_scores'?");
        console.error(`   - ¿Usuario autenticado? ${!!this.currentUser}`);
        console.error(`   - ¿Usuario anónimo? ${this.currentUser?.isAnonymous}`);
        console.error("   - Verifica que las reglas Firestore estén publicadas");
      } else if (error.message?.includes("index") || error.code === "failed-precondition") {
        console.error("🚨 SOLUCIÓN para índices faltantes:");
        console.error("   1. Ve a Firebase Console → Firestore → Indexes");
        console.error("   2. Crea índice compuesto: leaderboard_scores");
        console.error("      - Campo 1: score (Descending)");
        console.error("      - Campo 2: timestamp (Ascending)");
        console.error("   3. O usar el enlace automático que aparece en la consola de Firebase");
        console.error("   4. Los índices pueden tardar unos minutos en estar listos");
      } else if (error.code === "unavailable") {
        console.error("🚨 Firebase temporalmente no disponible - reintentar más tarde");
      } else {
        console.error("   - Código de error:", error.code);
        console.error("   - Mensaje:", error.message);
        console.error("   - Detalles completos:", error);
      }

      return [];
    }
  }

  /**
   * Obtiene el ranking del usuario actual
   * @returns {Promise<Object|null>}
   */
  async getUserRanking() {
    try {
      // Verificaciones de seguridad mejoradas
      if (!this.isReady()) {
        console.warn("🔥 FirebaseManager: Firebase no está listo para obtener ranking");
        return null;
      }

      if (!this.currentUser || this.currentUser.isAnonymous) {
        console.warn("🔥 FirebaseManager: Usuario anónimo no tiene ranking");
        return {
          rank: null,
          bestScore: 0,
          totalGames: 0,
          averageScore: 0,
          totalPlayTime: 0,
          userFound: false,
        };
      }

      console.log("🔥 FirebaseManager: Obteniendo ranking de usuario...");
      const userId = this.currentUser.uid;

      // 🎯 PASO 1: Obtener el mejor score del usuario de la nueva colección
      let userBestScore = 0;
      let userScoreData = null;
      
      try {
        console.log("🔥 FirebaseManager: Buscando mejor score del usuario...");
        const userScores = await this.db
          .collection("leaderboard_scores")
          .where("userId", "==", userId)
          .orderBy("score", "desc")
          .limit(1)
          .get();

        if (!userScores.empty) {
          userScoreData = userScores.docs[0].data();
          userBestScore = userScoreData.score;
          console.log(`🔥 FirebaseManager: Mejor score encontrado: ${userBestScore}`);
        } else {
          console.log("🔥 FirebaseManager: Usuario no tiene scores registrados");
          return {
            rank: null,
            bestScore: 0,
            totalGames: 0,
            averageScore: 0,
            totalPlayTime: 0,
            userFound: false,
          };
        }
      } catch (scoreError) {
        console.error("🔥 FirebaseManager: Error obteniendo scores del usuario:", scoreError);
        throw scoreError;
      }

      // 🎯 PASO 2: Contar cuántos usuarios tienen mejor puntuación (para calcular ranking)
      let rank = 1;
      try {
        console.log(`🔥 FirebaseManager: Calculando ranking (scores > ${userBestScore})...`);
        const betterScores = await this.db
          .collection("leaderboard_scores")
          .where("score", ">", userBestScore)
          .get();

        rank = betterScores.size + 1;
        console.log(`🔥 FirebaseManager: Posición en ranking: #${rank}`);
      } catch (rankError) {
        console.warn("🔥 FirebaseManager: ⚠️ Error calculando ranking, usando posición 1:", rankError);
        rank = 1;
      }

      // 🎯 PASO 3: Obtener estadísticas personales de la nueva colección user_stats
      let userStats = {
        totalGames: 1,
        averageScore: userBestScore,
        totalPlayTime: userScoreData?.gameTime || 0,
      };

      try {
        console.log("🔥 FirebaseManager: Obteniendo estadísticas personales...");
        const statsDoc = await this.db
          .collection("user_stats")
          .doc(userId)
          .get();

        if (statsDoc.exists) {
          const statsData = statsDoc.data();
          userStats = {
            totalGames: statsData.totalGames || 1,
            averageScore: statsData.averageScore || userBestScore,
            totalPlayTime: statsData.totalPlayTime || 0,
          };
          console.log("🔥 FirebaseManager: ✅ Estadísticas personales obtenidas");
        } else {
          console.log("🔥 FirebaseManager: No hay estadísticas previas - usando valores por defecto");
        }
      } catch (statsError) {
        console.warn("🔥 FirebaseManager: ⚠️ Error obteniendo estadísticas, usando valores por defecto:", statsError);
      }

      const ranking = {
        rank: rank,
        bestScore: userBestScore,
        totalGames: userStats.totalGames,
        averageScore: userStats.averageScore,
        totalPlayTime: userStats.totalPlayTime,
        userFound: true,
        level: userScoreData?.level || 1,
        lastPlayed: userScoreData?.timestamp?.toDate?.() || null,
        nickname: userScoreData?.nickname || "Usuario",
      };

      console.log("🔥 FirebaseManager: ✅ Ranking de usuario completo:", ranking);
      return ranking;

    } catch (error) {
      console.error("🔥 FirebaseManager: ❌ Error obteniendo ranking de usuario:", error);
      
      // Diagnóstico detallado mejorado
      if (error.code === "permission-denied") {
        console.error("🚨 Error de permisos en getUserRanking - Verificar:");
        console.error("   - ¿Las reglas permiten lectura de 'leaderboard_scores' y 'user_stats'?");
        console.error(`   - ¿Usuario autenticado? ${!!this.currentUser}`);
        console.error(`   - ¿Usuario anónimo? ${this.currentUser?.isAnonymous}`);
        console.error(`   - UID del usuario: ${this.currentUser?.uid}`);
        console.error("   - Verifica que las reglas Firestore estén publicadas correctamente");
      } else if (error.message?.includes("index") || error.code === "failed-precondition") {
        console.error("🚨 Error de índices - Verificar:");
        console.error("   1. Índice necesario: leaderboard_scores → userId (Ascending), score (Descending)");
        console.error("   2. Ve a Firebase Console → Firestore → Indexes");
        console.error("   3. Los índices pueden tardar unos minutos en estar disponibles");
      } else {
        console.error("   - Código de error:", error.code);
        console.error("   - Mensaje:", error.message);
      }
      
      return null;
    }
  }

  /**
   * Actualiza estadísticas personales del usuario
   * @private
   */
  async updateUserPersonalStats(score, level, gameTime, gameStats) {
    try {
      if (
        !this.isReady() ||
        !this.currentUser ||
        this.currentUser.isAnonymous
      ) {
        return;
      }

      const userDoc = this.db.collection("users").doc(this.currentUser.uid);

      // Actualizar estadísticas con incrementos atómicos
      await userDoc.set(
        {
          stats: {
            totalGames: firebase.firestore.FieldValue.increment(1),
            totalScore: firebase.firestore.FieldValue.increment(score),
            totalPlayTime: firebase.firestore.FieldValue.increment(
              Math.round(gameTime)
            ),
            totalJumps: firebase.firestore.FieldValue.increment(
              gameStats.totalJumps || 0
            ),
            lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
            lastScore: score,
            lastLevel: level,
          },
        },
        { merge: true }
      );

      console.log(
        "🔥 FirebaseManager: ✅ Estadísticas personales actualizadas"
      );
    } catch (error) {
      console.warn(
        "🔥 FirebaseManager: ⚠️ Error actualizando estadísticas:",
        error
      );
    }
  }

  /**
   * Obtiene estadísticas personales del usuario
   * @returns {Promise<Object|null>}
   */
  async getUserPersonalStats() {
    try {
      if (
        !this.isReady() ||
        !this.currentUser ||
        this.currentUser.isAnonymous
      ) {
        return null;
      }

      const userDoc = await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .get();

      if (userDoc.exists && userDoc.data().stats) {
        const stats = userDoc.data().stats;

        // Calcular promedio si hay juegos
        if (stats.totalGames > 0 && stats.totalScore) {
          stats.averageScore = Math.round(stats.totalScore / stats.totalGames);
        } else {
          stats.averageScore = 0;
        }

        console.log("🔥 FirebaseManager: ✅ Estadísticas personales obtenidas");
        return stats;
      }

      return null;
    } catch (error) {
      console.error(
        "🔥 FirebaseManager: ❌ Error obteniendo stats personales:",
        error
      );
      return null;
    }
  }

  /**
   * Obtiene información del navegador para metadatos
   * @private
   */
  getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Unknown";
  }

  /**
   * Detecta tipo de dispositivo
   * @private
   */
  getDeviceType() {
    if (/Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
      return "mobile";
    }
    return "desktop";
  }

  /**
   * Obtiene leaderboard filtrado por período de tiempo
   * @param {string} period - 'today', 'week', 'month', 'all'
   * @param {number} limit - Número máximo de resultados
   * @returns {Promise<Array>}
   */
  async getLeaderboardByPeriod(period = "all", limit = 10) {
    try {
      if (!this.isReady()) {
        return [];
      }

      let query = this.db.collection("leaderboard_scores");

      // Calcular fecha límite según el período
      if (period !== "all") {
        const now = new Date();
        let startDate;

        switch (period) {
          case "today":
            startDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            );
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }

        if (startDate) {
          query = query.where(
            "timestamp",
            ">=",
            firebase.firestore.Timestamp.fromDate(startDate)
          );
        }
      }

      const snapshot = await query
        .orderBy("score", "desc")
        .orderBy("timestamp", "asc")
        .limit(limit)
        .get();

      const leaderboard = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          rank: index + 1,
          id: doc.id,
          nickname: data.nickname,
          score: data.score,
          level: data.level,
          gameTime: data.gameTime,
          timestamp: data.timestamp?.toDate?.() || null,
          isCurrentUser: data.userId === this.currentUser?.uid,
        };
      });

      console.log(
        `🔥 FirebaseManager: ✅ Leaderboard ${period} obtenido (${leaderboard.length} entradas)`
      );
      return leaderboard;
    } catch (error) {
      console.error(
        `🔥 FirebaseManager: ❌ Error obteniendo leaderboard ${period}:`,
        error
      );
      return [];
    }
  }
}

// Verificar que no haya conflictos con otros managers
if (typeof window !== "undefined") {
  window.FirebaseManager = FirebaseManager;
}

console.log("🔥 FirebaseManager: Clase definida correctamente");
