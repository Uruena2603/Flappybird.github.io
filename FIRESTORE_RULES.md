# Reglas de Firestore para Flappy Bird Enhanced

## Configuración en Firebase Console

Ve a [Firebase Console](https://console.firebase.google.com/project/flappy-bird-enhanced/firestore/rules) y actualiza las reglas:

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

    // 🏆 LEADERBOARD GLOBAL: Un registro único por usuario
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
  }
}
```

## Por qué estas reglas:

1. **`/users/{userId}`**:

   - **Lectura pública**: Necesaria para verificar nicknames únicos
   - **Escritura privada**: Solo el usuario puede modificar su propio perfil

2. **`/leaderboard_scores/{scoreId}`**:
   - **Lectura pública**: Todos pueden ver el leaderboard
   - **Escritura autenticada**: Solo usuarios registrados (no anónimos) pueden guardar scores

## Pasos para configurar:

1. Ve a Firebase Console → tu proyecto → Firestore Database
2. Click en "Rules" en la parte superior
3. Reemplaza las reglas existentes con las de arriba
4. Click en "Publish"

¡Listo! Ahora la aplicación podrá crear y leer documentos de usuarios.
