# 🔥 Reglas de Firestore -    // 🏆 LEADERBOARD GLOBAL: Un registro único por usuario
    match /leaderboard_scores/{scoreId} {
      // LECTURA PÚBLICA: Todos pueden ver el leaderboard
      allow read: if true;

      // CREAR: Solo usuarios autenticados no anónimos
      allow create: if request.auth != null
                   && request.auth.token.firebase.sign_in_provider != 'anonymous'
                   && request.auth.uid == request.resource.data.userId
                   && request.resource.data.userId is string
                   && request.resource.data.nickname is string
                   && request.resource.data.score is number
                   && request.resource.data.score >= 0;

      // ACTUALIZAR: Solo el propietario puede actualizar su record si mejora
      allow update: if request.auth != null
                   && request.auth.token.firebase.sign_in_provider != 'anonymous'
                   && request.auth.uid == resource.data.userId
                   && request.auth.uid == request.resource.data.userId
                   && request.resource.data.score >= resource.data.score;

      // No permitir delete para mantener integridad
      allow delete: if false;
    }nced (ARQUITECTURA CORREGIDA)

## � CONFIGURACIÓN CRÍTICA PARA RESOLVER ERRORES DE PERMISOS

**Problema detectado:** El código usa las nuevas colecciones (`leaderboard_scores`, `user_game_history`, `user_stats`) pero las reglas de Firestore están configuradas para colecciones antiguas.

## 📋 REGLAS ACTUALIZADAS (COPIAR EXACTAMENTE)

Ve a [Firebase Console → Firestore → Rules](https://console.firebase.google.com/project/flappy-bird-enhanced/firestore/rules) y reemplaza completamente las reglas con esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 👤 USUARIOS: Gestión de perfiles y nicknames
    match /users/{userId} {
      // Lectura pública para verificar nicknames únicos
      allow read: if true;

      // Escritura solo para el usuario propietario autenticado no anónimo
      allow write: if request.auth != null
                  && request.auth.token.firebase.sign_in_provider != 'anonymous'
                  && request.auth.uid == userId;
    }

    // � LEADERBOARD GLOBAL: Nueva colección principal
    match /leaderboard_scores/{scoreId} {
      // LECTURA PÚBLICA: Todos pueden ver el leaderboard
      allow read: if true;

      // ESCRITURA: Solo usuarios autenticados no anónimos
      allow create: if request.auth != null
                   && request.auth.token.firebase.sign_in_provider != 'anonymous'
                   && request.auth.uid == request.resource.data.userId
                   && request.resource.data.userId is string
                   && request.resource.data.nickname is string
                   && request.resource.data.score is number
                   && request.resource.data.score >= 0;

      // No permitir updates - cada score es un registro único
      allow update, delete: if false;
    }

    // 📚 HISTORIAL PERSONAL: Partidas por usuario
    match /user_game_history/{userId} {
      // Solo el usuario puede leer su propio historial
      allow read: if request.auth != null
                 && request.auth.uid == userId;

      // Solo el usuario puede escribir en su colección
      allow write: if request.auth != null
                  && request.auth.token.firebase.sign_in_provider != 'anonymous'
                  && request.auth.uid == userId;

      // Subcolección de partidas individuales
      match /games/{gameId} {
        // Solo el usuario puede acceder a sus partidas
        allow read, write: if request.auth != null
                          && request.auth.token.firebase.sign_in_provider != 'anonymous'
                          && request.auth.uid == userId;
      }
    }

    // 📊 ESTADÍSTICAS DE USUARIO: Datos agregados
    match /user_stats/{userId} {
      // LECTURA: Solo el usuario puede ver sus estadísticas
      allow read: if request.auth != null
                 && request.auth.uid == userId;

      // ESCRITURA: Solo el usuario puede actualizar sus estadísticas
      allow write: if request.auth != null
                  && request.auth.token.firebase.sign_in_provider != 'anonymous'
                  && request.auth.uid == userId;
    }

    // 🗑️ COLECCIONES DEPRECATED (mantenidas para compatibilidad)
    match /game_sessions/{sessionId} {
      allow read: if false;
      allow write: if false;
    }

    match /leaderboard/{recordId} {
      allow read: if false;
      allow write: if false;
    }
  }
}
```

## � NUEVA ARQUITECTURA DE COLECCIONES

### 1. **`leaderboard_scores`** - Leaderboard Global

- **Propósito:** UN REGISTRO ÚNICO por usuario con su MEJOR SCORE
- **Acceso:** Lectura pública, escritura/actualización solo del propietario
- **Lógica:** Crear en primera partida, actualizar solo si supera record anterior

### 2. **`user_game_history/{userId}/games/{gameId}`** - Historial Personal

- **Propósito:** Historial completo de partidas por usuario
- **Acceso:** Solo el usuario propietario
- **Lógica:** Subcolección para organizar datos por usuario

### 3. **`user_stats/{userId}`** - Estadísticas Agregadas

- **Propósito:** Estadísticas calculadas por usuario (totalGames, bestScore, etc.)
- **Acceso:** Solo el usuario propietario
- **Lógica:** Un documento por usuario con datos agregados

## ✅ VALIDACIONES INCLUIDAS

- ✅ **Solo usuarios registrados** (no anónimos) pueden guardar scores
- ✅ **Validación de ownership** - usuarios solo pueden modificar sus datos
- ✅ **Validación de datos** - score debe ser número positivo
- ✅ **Leaderboard público** - cualquiera puede ver rankings
- ✅ **Privacidad personal** - solo el usuario ve su historial y stats

## 🚀 PASOS PARA APLICAR (URGENTE)

1. **Copiar** las reglas de arriba EXACTAMENTE
2. **Ir** a [Firebase Console → tu proyecto → Firestore → Rules](https://console.firebase.google.com/project/flappy-bird-enhanced/firestore/rules)
3. **Reemplazar completamente** las reglas existentes
4. **Publicar** cambios (botón "Publish" o "Publicar")
5. **Esperar 1-2 minutos** para propagación

## 🎮 FLUJO PROFESIONAL DE LEADERBOARD

Tu propuesta es excelente y se implementará así:

### **Lógica para Cada Usuario:**

1. **Primera partida** → Crea entrada en `leaderboard_scores`
2. **Partidas siguientes** → Siempre crean nueva entrada en `leaderboard_scores`
3. **Ranking dinámico** → Se calcula en tiempo real basado en todos los scores
4. **Mejor score personal** → Se obtiene consultando el max score del usuario

### **Ventajas del Sistema:**

- ✅ **Historial completo:** Todas las partidas se guardan
- ✅ **Ranking justo:** Se basa en el mejor score real de cada usuario
- ✅ **Performance:** Queries optimizadas con índices
- ✅ **Escalabilidad:** Funciona con miles de usuarios

## 🔧 DESPUÉS DE APLICAR REGLAS

1. **Probar inmediatamente** el juego local
2. **Verificar** que se guardan scores sin errores
3. **Confirmar** que el leaderboard se muestra correctamente
4. **Continuar** con implementación de UI del leaderboard

---

**⚠️ CRÍTICO:** Estas reglas deben aplicarse AHORA mismo para resolver los errores de permisos que viste en las pruebas.

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
```
