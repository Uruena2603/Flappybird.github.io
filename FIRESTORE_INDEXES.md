# Índices de Firestore para Flappy Bird Enhanced

## Índices Requeridos

### Para la colección `leaderboard_scores`

```json
{
  "collectionGroup": "leaderboard_scores",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "score",
      "order": "DESCENDING"
    },
    {
      "fieldPath": "timestamp",
      "order": "DESCENDING"
    }
  ]
}
```

### Para la colección `user_game_history`

```json
{
  "collectionGroup": "games",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    {
      "fieldPath": "userId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "timestamp",
      "order": "DESCENDING"
    }
  ]
}
```

## Configuración en Firebase Console

1. Ve a Firebase Console → Firestore Database → Indexes
2. Click en "Add Index"
3. Crea los índices mostrados arriba
4. Los índices se construyen automáticamente (puede tomar unos minutos)

## Comandos CLI (Alternativa)

Si tienes Firebase CLI configurado:

```bash
firebase deploy --only firestore:indexes
```

> **Nota:** Los índices simples (un solo campo) se crean automáticamente.
> Solo necesitas crear manualmente los índices compuestos mostrados arriba.
