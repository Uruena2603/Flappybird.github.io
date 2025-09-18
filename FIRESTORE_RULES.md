# Reglas de Firestore para Flappy Bird Enhanced

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
    
    // Reglas para leaderboard (se usarán en Etapa 5)
    match /leaderboard_scores/{scoreId} {
      allow read: if true;
      allow write: if request.auth != null && !request.auth.token.firebase.sign_in_provider == 'anonymous';
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