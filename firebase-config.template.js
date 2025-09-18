/**
 * Firebase Configuration - Production Template
 * Este archivo DEBE ser configurado manualmente en producción
 * con las credenciales reales de Firebase
 */

// Detectar entorno de desarrollo vs producción
const isDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "file://";

// CONFIGURACIÓN PARA PRODUCCIÓN - REEMPLAZAR CON VALORES REALES
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
};

/**
 * Verifica si Firebase está configurado correctamente
 * @returns {boolean} - true si la configuración es válida
 */
function isFirebaseConfigured() {
  const requiredKeys = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];

  // Verificar que todas las claves requeridas estén presentes
  for (const key of requiredKeys) {
    if (
      !FIREBASE_CONFIG[key] ||
      FIREBASE_CONFIG[key].includes("YOUR_") ||
      FIREBASE_CONFIG[key].includes("your-") ||
      FIREBASE_CONFIG[key] === ""
    ) {
      console.warn(`🔥 Firebase: ${key} no configurado correctamente`);
      return false;
    }
  }

  return true;
}

/**
 * Obtiene la configuración de Firebase para el entorno actual
 * @returns {Object|null} - Configuración de Firebase o null si no está configurada
 */
function getFirebaseConfig() {
  if (!isFirebaseConfigured()) {
    console.log("🔥 Firebase: No configurado, ejecutando en modo offline");
    return null;
  }

  // Configuración adicional por entorno
  const config = { ...FIREBASE_CONFIG };

  if (isDevelopment) {
    console.log("🔧 Firebase: Modo desarrollo - localhost");
    // Configuraciones específicas para desarrollo si es necesario
  } else {
    console.log("🚀 Firebase: Modo producción - GitHub Pages");
    // Configuraciones específicas para producción si es necesario
  }

  return config;
}

/**
 * Inicializa y valida la configuración de Firebase
 */
function initializeFirebaseConfig() {
  try {
    if (isFirebaseConfigured()) {
      console.log("✅ Firebase Config: Configuración válida detectada");
      console.log(`🌍 Entorno: ${isDevelopment ? "Desarrollo" : "Producción"}`);
      console.log(`🔗 Domain: ${FIREBASE_CONFIG.authDomain}`);
      console.log(`📦 Project: ${FIREBASE_CONFIG.projectId}`);
      return true;
    } else {
      console.warn(
        "⚠️ Firebase Config: Configuración incompleta - modo offline"
      );
      console.log(
        "🔧 Para habilitar Firebase, configure las credenciales en firebase-config.js"
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Firebase Config: Error durante inicialización:", error);
    return false;
  }
}

// Exponer funciones y configuración globalmente para main.js
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.getFirebaseConfig = getFirebaseConfig;
window.isFirebaseConfigured = isFirebaseConfigured;
window.initializeFirebaseConfig = initializeFirebaseConfig;
window.isDevelopment = isDevelopment;

// Ejecutar inicialización automática
const configStatus = initializeFirebaseConfig();

// Export para módulos ES6 si es necesario
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    FIREBASE_CONFIG,
    getFirebaseConfig,
    isFirebaseConfigured,
    initializeFirebaseConfig,
    isDevelopment,
  };
}
