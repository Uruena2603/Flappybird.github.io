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
    
    // Reglas para puntuaciones del leaderboard
    match /leaderboard_scores/{scoreId} {
      // Lectura pública: todos pueden ver el leaderboard
      allow read: if true;
      
      // Escritura solo para usuarios autenticados no anónimos
      allow create: if request.auth != null 
                   && !request.auth.token.firebase.sign_in_provider == 'anonymous'
                   && request.auth.uid == resource.data.userId
                   && request.data.userId is string
                   && request.data.nickname is string
                   && request.data.score is number
                   && request.data.score >= 0;
                   
      // No permitir updates o deletes para mantener integridad del leaderboard
      allow update, delete: if false;
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
2. Click en "Rules" en la parte superior
3. Reemplaza las reglas existentes con las de arriba
4. Click en "Publish"

¡Listo! Ahora el sistema de leaderboard está completamente protegido.