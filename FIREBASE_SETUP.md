# 🔥 Configuración de Firebase - Flappy Bird Enhanced

## 📋 Configuración para Producción

Para habilitar Firebase en producción (GitHub Pages), sigue estos pasos:

### 1. Crear el archivo de configuración

```bash
# En el directorio raíz del proyecto
cp firebase-config.template.js firebase-config.js
```

### 2. Configurar las credenciales

Edita `firebase-config.js` y reemplaza los placeholders con tus credenciales reales de Firebase:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
};
```

### 3. Obtener las credenciales de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a "Project Settings" > "General"
4. En "Your apps", haz click en el ícono web `</>`
5. Registra tu app y copia la configuración

### 4. Habilitar Servicios

En Firebase Console:

#### Authentication:

- Ve a "Authentication" > "Sign-in method"
- Habilita "Google" y "Anonymous"
- Configura el dominio autorizado (tu-usuario.github.io)

#### Firestore:

- Ve a "Firestore Database"
- Crea una base de datos en modo producción
- Configura las reglas de seguridad:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura del leaderboard para todos
    match /leaderboard/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Permitir lectura/escritura de datos de usuario solo para el usuario autenticado
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🛠️ Desarrollo Local

Para desarrollo local, tienes dos opciones:

### Opción A: Con Firebase (Recomendado)

1. Copia el template: `cp firebase-config.template.js firebase-config.js`
2. Configura las credenciales reales
3. El juego tendrá todas las funciones de Firebase

### Opción B: Sin Firebase

1. No copies el archivo de configuración
2. El juego funcionará en modo offline sin leaderboard

## 🚀 Despliegue en GitHub Pages

1. **NO** hagas commit del archivo `firebase-config.js` (está en .gitignore por seguridad)
2. Después del despliegue, crea manualmente el archivo en tu repositorio GitHub:
   - Ve a tu repositorio en GitHub
   - Crea un nuevo archivo llamado `firebase-config.js`
   - Copia el contenido con tus credenciales reales
   - Haz commit directamente en GitHub

## 🔒 Seguridad

- **NUNCA** hagas commit de credenciales reales en el repositorio
- El archivo `firebase-config.js` está en `.gitignore` por razones de seguridad
- Para producción, configura las reglas de Firestore apropiadamente
- Limita los dominios autorizados en Firebase Console

## 🐛 Solución de Problemas

### Error: "firebase-config.js not found"

- Asegúrate de crear el archivo manualmente en GitHub Pages
- Verifica que el nombre del archivo sea exacto: `firebase-config.js`

### Error: "Firebase not configured"

- Verifica que todas las credenciales estén correctas
- Revisa la consola del navegador para más detalles
- Asegúrate de haber habilitado Authentication y Firestore

### Error: "Permission denied"

- Revisa las reglas de Firestore
- Verifica que el dominio esté autorizado en Firebase Console
- Asegúrate de que el usuario esté autenticado

## 📊 Modo Offline

Si Firebase no está configurado, el juego funciona en "modo offline":

- ✅ Gameplay completo funcional
- ✅ Puntuaciones locales (localStorage)
- ❌ Sin registro de usuarios
- ❌ Sin leaderboard global
- ❌ Sin sincronización entre dispositivos

## 🎯 Siguiente Paso: Etapa 4

Una vez configurado Firebase en producción, puedes continuar con:

- **Etapa 4**: Sistema de nicknames para usuarios
- **Etapa 5**: Backend del leaderboard
- **Etapa 6**: UI mejorada del leaderboard
- **Etapa 7**: Testing y pulimiento final
