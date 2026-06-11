# ⚡ FitHome Pro

**Tu entrenador personal premium para entrenar en casa, sin equipo y 100% funcional.**

Aplicación web completa (HTML + CSS + JavaScript puro, sin dependencias ni build) que te dice **qué hacer cada día y cómo hacerlo**, con un **holograma animado** que muestra la técnica correcta de cada ejercicio.

## 🚀 Cómo usarla

Opción 1 — abrir directamente:

```
Abre index.html en tu navegador
```

Opción 2 — servidor local (recomendado):

```bash
cd Pr
python3 -m http.server 8080
# abre http://localhost:8080
```

Funciona perfecta en móvil y escritorio. Todos tus datos se guardan en tu navegador (localStorage): no necesita internet ni cuenta.

## ✨ Funcionalidades

| Módulo | Qué hace |
|---|---|
| 🧭 **Onboarding** | Crea tu perfil (objetivo, nivel, datos corporales) y genera tu plan personalizado |
| 🏠 **Inicio** | Entrenamiento del día, anillo de progreso semanal, racha 🔥, hidratación |
| 📅 **Calendario** | Plan mensual completo: días programados, completados y de descanso. Toca cualquier día para ver su rutina |
| 🏋️ **Entrenador guiado** | Temporizador por intervalos con rondas, descansos, avisos sonoros y pausa/saltar |
| 🧬 **Holograma** | Figura holográfica animada en canvas que ejecuta cada ejercicio en bucle para que copies la técnica |
| 📖 **Biblioteca** | 17 ejercicios con instrucciones paso a paso, errores comunes, consejo pro y enlace a video |
| 🥗 **Dieta** | Calorías y macros calculados (Mifflin-St Jeor) según tu objetivo + menú semanal de 7 días con checklist |
| 📈 **Progreso** | Racha, sesiones, minutos, kcal, gráfica de actividad de 7 días, registro y gráfica de peso, historial |

## 🎯 Planes según objetivo

- **🔥 Perder grasa** — Full body + HIIT + core, con déficit calórico (~-400 kcal)
- **💪 Ganar músculo** — Rutina dividida tren superior/inferior, con superávit (~+300 kcal)
- **⚖️ Mantenerme** — Plan equilibrado de salud general

Cada plan se adapta a 3 niveles (principiante / intermedio / avanzado) que ajustan tiempo de trabajo, descanso y número de rondas.

## 🗂 Estructura

```
index.html        Estructura de la app (vistas, modales, onboarding)
css/styles.css    Diseño premium dark + glassmorphism
js/data.js        Ejercicios, animaciones, rutinas, planes y menús
js/hologram.js    Motor de animación holográfica (canvas)
js/app.js         Lógica: estado, navegación, player, dieta, progreso
```
