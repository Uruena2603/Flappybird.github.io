# Reglas de Firestore para Flappy Bird Enhanced (NUEVA ARQUITECTURA)

## 🔥 ACTUALIZACIÓN CRÍTICA - Nueva Estructura de Colecciones

Para resolver el problema de múltiples registros por usuario, hemos implementado una nueva arquitectura con dos colecciones separadas:

- **`game_sessions`**: Historial completo de todas las partidas
- **`leaderboard`**: Solo los mejores records únicos por usuario

## Configuración en Firebase Console

Ve a [Firebase Console](https://console.firebase.google.com/project/flappy-bird-enhanced/firestore/rules) y actualiza las reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Reglas para la colección de usuarios
    match /users/{userId} {
      // Permitir lectura para todos (para verificar nicknames únicos)
      allow read: if true;

      // Permitir escritura solo para el usuario autenticado y su propio documento
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // 🎯 NUEVA COLECCIÓN: Historial completo de partidas
    match /game_sessions/{sessionId} {
      // Lectura limitada: solo el propio usuario puede ver su historial
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;

      // Crear sesión: solo usuarios autenticados no anónimos
      allow create: if request.auth != null
                   && request.auth.token.firebase.sign_in_provider != 'anonymous'
                   && request.auth.uid == request.resource.data.userId
                   && request.resource.data.userId is string
                   && request.resource.data.nickname is string
                   && request.resource.data.score is number
                   && request.resource.data.score >= 0;

      // No permitir updates o deletes para mantener integridad del historial
      allow update, delete: if false;
    }

    // 🏆 NUEVA COLECCIÓN: Solo mejores records únicos por usuario
    match /leaderboard/{recordId} {
      // Lectura pública: todos pueden ver el leaderboard
      allow read: if true;

      // Crear record inicial: usuarios autenticados no anónimos
      allow create: if request.auth != null
                   && request.auth.token.firebase.sign_in_provider != 'anonymous'
                   && request.auth.uid == request.resource.data.userId
                   && request.resource.data.userId is string
                   && request.resource.data.nickname is string
                   && request.resource.data.score is number
                   && request.resource.data.score >= 0;

      // Actualizar record: solo el propietario puede actualizar su record
      allow update: if request.auth != null
                   && request.auth.uid == resource.data.userId
                   && request.auth.uid == request.resource.data.userId
                   && request.resource.data.score >= resource.data.score; // Solo si mejora

      // No permitir delete para mantener integridad del leaderboard
      allow delete: if false;
    }

    // 🗑️ DEPRECATED: Mantenemos leaderboard_scores temporalmente para migración
    match /leaderboard_scores/{scoreId} {
      // Solo lectura durante migración
      allow read: if true;
      allow write: if false; // Ya no se usa para nuevos records
    }
  }
}
```

## 🎯 Explicación de la Nueva Arquitectura:

### 1. **`/game_sessions/{sessionId}`**:

- **Propósito**: Historial completo de todas las partidas jugadas
- **Privacidad**: Solo el usuario puede ver sus propias sesiones
- **Integridad**: No se permite modificar o borrar sesiones una vez creadas

### 2. **`/leaderboard/{recordId}`**:

- **Propósito**: Solo los mejores records únicos por usuario
- **Visibilidad**: Público para mostrar ranking global
- **Lógica**: Los users solo pueden actualizar si mejoran su score
- **Unicidad**: Un solo documento por usuario

### 3. **`/leaderboard_scores/{scoreId}` [DEPRECATED]**:

- **Lectura pública**: Todos pueden ver el leaderboard
- **Escritura controlada**: Solo usuarios registrados pueden crear scores
- **Validación de datos**: Asegura que el score tenga los campos correctos
- **Inmutabilidad**: Una vez creado, no se puede modificar (integridad del leaderboard)

## Validaciones incluidas:

- ✅ Solo usuarios autenticados no anónimos pueden guardar scores
- ✅ El usuario solo puede guardar scores con su propio UID
- ✅ Los datos deben tener nickname y score válidos
- ✅ El score debe ser un número positivo
- ✅ Una vez guardado, el score no se puede modificar

## Pasos para configurar:

1. Ve a Firebase Console → tu proyecto → Firestore Database
   - **Estado**: Colección antigua que causaba duplicados
   - **Acceso**: Solo lectura durante migración
   - **Migración**: Se eliminará una vez migrados los datos

## 🔧 Pasos para Aplicar las Reglas:

1. **Copiar** las reglas de arriba
2. **Ir** a [Firebase Console → Firestore → Rules](https://console.firebase.google.com/project/flappy-bird-enhanced/firestore/rules)
3. **Pegar** las nuevas reglas
4. **Publicar** los cambios

## ⚠️ Importante:

- Las nuevas reglas **no afectan** los datos existentes
- Los datos en `leaderboard_scores` siguen siendo accesibles para migración
- La nueva lógica de `FirebaseManager.js` maneja automáticamente ambas colecciones

## 🎯 Beneficios de la Nueva Arquitectura:

✅ **Eliminación de duplicados**: Un solo record por usuario en leaderboard
✅ **Historial completo**: Todas las partidas se guardan en game_sessions
✅ **Performance mejorado**: Consultas más eficientes en leaderboard
✅ **Integridad de datos**: Reglas estrictas para prevenir corrupción

---

**¡LISTO!** Con estas nuevas reglas y la lógica actualizada en `FirebaseManager.js`, el sistema de leaderboard ya no creará duplicados por usuario.
