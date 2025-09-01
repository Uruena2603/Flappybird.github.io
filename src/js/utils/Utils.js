/**
 * Utils.js - Funciones utilitarias del juego
 */

/**
 * Detecta colisión entre dos objetos rectangulares
 * @param {Object} rect1 - Primer rectángulo {x, y, width, height}
 * @param {Object} rect2 - Segundo rectángulo {x, y, width, height}
 * @returns {boolean} - True si hay colisión
 */
export function detectCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
 * Genera un número aleatorio entre min y max
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number} - Número aleatorio
 */
export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Limita un valor entre un mínimo y máximo
 * @param {number} value - Valor a limitar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number} - Valor limitado
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Interpolación lineal entre dos valores
 * @param {number} start - Valor inicial
 * @param {number} end - Valor final
 * @param {number} factor - Factor de interpolación (0-1)
 * @returns {number} - Valor interpolado
 */
export function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

/**
 * Convierte grados a radianes
 * @param {number} degrees - Grados
 * @returns {number} - Radianes
 */
export function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Convierte radianes a grados
 * @param {number} radians - Radianes
 * @returns {number} - Grados
 */
export function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

/**
 * Calcula la distancia entre dos puntos
 * @param {Object} point1 - Primer punto {x, y}
 * @param {Object} point2 - Segundo punto {x, y}
 * @returns {number} - Distancia
 */
export function distance(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Formatea el tiempo en formato MM:SS
 * @param {number} seconds - Segundos totales
 * @returns {string} - Tiempo formateado
 */
export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Formatea el puntaje con separadores de miles
 * @param {number} score - Puntaje a formatear
 * @returns {string} - Puntaje formateado
 */
export function formatScore(score) {
  return score.toLocaleString();
}

/**
 * Debounce function para limitar llamadas a funciones
 * @param {Function} func - Función a debounce
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} - Función con debounce
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function para limitar llamadas a funciones
 * @param {Function} func - Función a throttle
 * @param {number} limit - Límite de tiempo en ms
 * @returns {Function} - Función con throttle
 */
export function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Detecta si el dispositivo es móvil
 * @returns {boolean} - True si es móvil
 */
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Detecta si el dispositivo soporta touch
 * @returns {boolean} - True si soporta touch
 */
export function isTouchDevice() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/**
 * Obtiene las dimensiones de la ventana
 * @returns {Object} - {width, height}
 */
export function getViewportSize() {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

/**
 * Genera un ID único
 * @returns {string} - ID único
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Deep clone de un objeto
 * @param {Object} obj - Objeto a clonar
 * @returns {Object} - Objeto clonado
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const cloned = {};
    Object.keys(obj).forEach((key) => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
}
