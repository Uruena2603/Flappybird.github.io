# 🧪 Checklist de Pruebas - Backend Firebase Corregido

## 🎯 Objetivo
Verificar que todas las correcciones del backend Firebase funcionan correctamente después de resolver los errores de permisos.

## ⚡ Configuración Previa Completada ✅
- [x] Reglas de Firestore actualizadas y publicadas
- [x] Archivo de índices FIRESTORE_INDEXES.md actualizado  
- [x] Métodos críticos corregidos: saveScore, getGlobalLeaderboard, getUserRanking
- [x] Servidor local ejecutándose en http://localhost:8000

## 🔬 Pruebas Sistemáticas a Realizar

### 1. 🔐 Autenticación de Usuario
**Pasos:**
- [ ] Abrir http://localhost:8000
- [ ] Verificar que el juego carga correctamente
- [ ] Ir a configuración y establecer un nickname de prueba
- [ ] Verificar que se puede registrar/login con email

**Resultado esperado:**
- Usuario debe autenticarse exitosamente
- Consola debe mostrar: "✅ Usuario autenticado exitosamente"
- No debe haber errores de permisos en la consola

### 2. 💾 Guardado de Scores (saveScore batch operations)
**Pasos:**
- [ ] Jugar una partida y obtener al menos 1 punto
- [ ] Verificar que la partida termine correctamente
- [ ] Abrir DevTools → Console y buscar logs de Firebase

**Resultados esperados:**
- ✅ "🔥 FirebaseManager: Iniciando operaciones batch..."
- ✅ "🔥 FirebaseManager: Agregado al batch - leaderboard global"
- ✅ "🔥 FirebaseManager: Agregado al batch - historial personal"  
- ✅ "🔥 FirebaseManager: Agregado al batch - estadísticas personales"
- ✅ "🔥 FirebaseManager: ✅ Score guardado exitosamente con batch operations"

**NO debe aparecer:**
- ❌ "permission-denied" 
- ❌ "Missing or insufficient permissions"

### 3. 🏆 Leaderboard Global (getGlobalLeaderboard)
**Pasos:**
- [ ] En la consola del navegador ejecutar: `window.FlappyBirdGame.debug.testLeaderboard()`
- [ ] O acceder al leaderboard a través de la UI del juego

**Resultados esperados:**
- ✅ "🔥 FirebaseManager: Obteniendo leaderboard global (top 10)..."
- ✅ "🔥 FirebaseManager: Intentando consulta con índice compuesto..."
- ✅ "🔥 FirebaseManager: ✅ Consulta exitosa con X resultados"
- ✅ "🔥 FirebaseManager: ✅ Leaderboard obtenido (X records)"

**Si hay problemas de índices:**
- ⚠️ "🔥 FirebaseManager: ⚠️ Índices no listos - usando consulta simple por score"
- ✅ "🔥 FirebaseManager: ✅ Consulta fallback exitosa con X resultados"

### 4. 📊 Ranking Personal (getUserRanking)
**Pasos:**
- [ ] En la consola ejecutar: `window.FlappyBirdGame.debug.getUserRanking()`
- [ ] Verificar que se obtienen las estadísticas del usuario actual

**Resultados esperados:**
- ✅ "🔥 FirebaseManager: Obteniendo ranking de usuario..."
- ✅ "🔥 FirebaseManager: Buscando mejor score del usuario..."
- ✅ "🔥 FirebaseManager: Mejor score encontrado: X"
- ✅ "🔥 FirebaseManager: Calculando ranking (scores > X)..."
- ✅ "🔥 FirebaseManager: Posición en ranking: #X"
- ✅ "🔥 FirebaseManager: ✅ Ranking de usuario completo:"

### 5. 🎯 Pruebas de Integración
**Escenario completo:**
- [ ] Jugar 3 partidas consecutivas con diferentes puntajes
- [ ] Verificar que todos los scores se guardan correctamente
- [ ] Verificar que el leaderboard se actualiza en tiempo real
- [ ] Verificar que las estadísticas personales son correctas

## 🚨 Errores Comunes y Soluciones

### Error de Permisos
```
🚨 Error de permisos - Verificar reglas de Firestore:
- ¿Las reglas están publicadas? ✅ (Ya completado)
- ¿El usuario está autenticado? [Verificar]
- ¿Usuario anónimo? [Debe ser false]
```

**Solución:** Asegurar que el usuario esté registrado (no anónimo)

### Error de Índices
```
🚨 SOLUCIÓN para índices faltantes:
1. Ve a Firebase Console → Firestore → Indexes
2. Crea índice compuesto: leaderboard_scores
   - Campo 1: score (Descending)
   - Campo 2: timestamp (Ascending)
```

**Solución:** Los índices pueden tardar unos minutos en estar listos

### Error de Conexión
```
🚨 Firebase temporalmente no disponible - reintentar más tarde
```

**Solución:** Verificar conexión a internet y estado de Firebase

## ✅ Criterios de Éxito

**Todo funcionando correctamente si:**
- [ ] Se pueden guardar scores sin errores de permisos
- [ ] El leaderboard global se carga correctamente
- [ ] Las estadísticas personales se calculan bien  
- [ ] No hay errores críticos en la consola
- [ ] El flujo completo de juego → guardar → leaderboard funciona

## 📝 Registro de Resultados

**Fecha de prueba:** [COMPLETAR]
**Usuario de prueba:** [COMPLETAR]  
**Navegador:** [COMPLETAR]

**Resultados:**
- Autenticación: [ ] ✅ / [ ] ❌
- Guardado de scores: [ ] ✅ / [ ] ❌  
- Leaderboard global: [ ] ✅ / [ ] ❌
- Ranking personal: [ ] ✅ / [ ] ❌
- Integración completa: [ ] ✅ / [ ] ❌

**Notas adicionales:**
[Espacio para comentarios y observaciones]

## 🎯 Próximos Pasos Tras Pruebas Exitosas

1. [ ] Marcar todo como "completed" en el todo list
2. [ ] Commit de cambios en feature/leaderboard-backend  
3. [ ] Merge a develop branch
4. [ ] Push al repositorio remoto
5. [ ] Proceder con desarrollo de UI del leaderboard

---

**💡 Tip:** Mantén las DevTools abiertas durante todas las pruebas para monitorear los logs de Firebase en tiempo real.