/* ============================================================
   FitHome Pro — Base de datos
   Ejercicios (técnica + animación), rutinas, planes y dieta.
   ============================================================ */
'use strict';

const EXERCISES = {
  'jumping-jacks': {
    nombre: 'Jumping Jacks', emoji: '🤸', grupo: 'cardio', dificultad: 1, met: 8,
    musculos: ['Cuerpo completo', 'Cardio'],
    instrucciones: [
      'De pie, pies juntos y brazos pegados al cuerpo.',
      'Salta abriendo las piernas al ancho de hombros mientras subes los brazos por encima de la cabeza.',
      'Salta de nuevo para volver a la posición inicial.',
      'Mantén un ritmo constante y aterriza suave sobre la punta de los pies.'
    ],
    errores: ['Aterrizar con las rodillas bloqueadas', 'No completar el rango de los brazos'],
    consejo: 'Mantén el abdomen activo para proteger la zona lumbar.',
    anim: { view: 'front', kfs: [
      { px: 0, py: 0, spine: 180, head: 180, thighL: 6, shinL: 3, thighR: -6, shinR: -3, armL: 20, farmL: 10, armR: -20, farmR: -10, d: 0.38 },
      { px: 0, py: -9, spine: 180, head: 180, thighL: 32, shinL: 28, thighR: -32, shinR: -28, armL: 162, farmL: 168, armR: -162, farmR: -168, d: 0.38 }
    ]}
  },
  'high-knees': {
    nombre: 'Rodillas al pecho', emoji: '🏃', grupo: 'cardio', dificultad: 2, met: 9,
    musculos: ['Piernas', 'Core', 'Cardio'],
    instrucciones: [
      'Corre en el sitio elevando las rodillas hasta la altura de la cadera.',
      'Mueve los brazos de forma alterna como al correr.',
      'Mantén el torso erguido y el core firme.',
      'Apoya solo la punta del pie, con contacto breve y explosivo.'
    ],
    errores: ['Inclinar el torso hacia atrás', 'Elevar poco las rodillas'],
    consejo: 'Imagina que el suelo quema: contactos rápidos y ligeros.',
    anim: { view: 'side', kfs: [
      { py: -4, spine: 176, head: 178, thighL: 85, shinL: 5, thighR: -4, shinR: -2, armL: -40, farmL: -75, armR: 42, farmR: 78, d: 0.27 },
      { py: -4, spine: 176, head: 178, thighR: 85, shinR: 5, thighL: -4, shinL: -2, armR: -40, farmR: -75, armL: 42, farmL: 78, d: 0.27 }
    ]}
  },
  'burpees': {
    nombre: 'Burpees', emoji: '💥', grupo: 'cardio', dificultad: 3, met: 10,
    musculos: ['Cuerpo completo', 'Cardio'],
    instrucciones: [
      'De pie, baja a cuclillas y apoya las manos en el suelo.',
      'Lanza los pies atrás hasta quedar en posición de plancha.',
      'Haz una flexión (opcional), regresa los pies a cuclillas de un salto.',
      'Salta vertical con los brazos extendidos por encima de la cabeza.'
    ],
    errores: ['Arquear la espalda en la plancha', 'Aterrizar con las piernas rígidas'],
    consejo: 'Si pierdes la técnica por fatiga, elimina el salto y sigue a tu ritmo.',
    anim: { view: 'side', kfs: [
      { py: 0, spine: 180, head: 184, thighL: 5, shinL: 2, thighR: -3, shinR: -1, armL: 12, farmL: 6, armR: -10, farmR: -5, d: 0.38 },
      { py: 45, spine: 122, head: 132, thighL: 75, shinL: -15, thighR: 70, shinR: -10, armL: 58, farmL: 52, armR: 52, farmR: 48, d: 0.3 },
      { py: 46, spine: 99, head: 116, thighL: -80, shinL: -83, thighR: -76, shinR: -80, armL: 20, farmL: 10, armR: 24, farmR: 14, d: 0.45 },
      { py: 45, spine: 122, head: 132, thighL: 75, shinL: -15, thighR: 70, shinR: -10, armL: 58, farmL: 52, armR: 52, farmR: 48, d: 0.3 },
      { py: -26, spine: 182, head: 185, thighL: 3, shinL: 1, thighR: -3, shinR: -1, armL: 172, farmL: 176, armR: 166, farmR: 170, d: 0.42 },
      { py: 0, spine: 180, head: 184, thighL: 5, shinL: 2, thighR: -3, shinR: -1, armL: 12, farmL: 6, armR: -10, farmR: -5, d: 0.35 }
    ]}
  },
  'squat': {
    nombre: 'Sentadillas', emoji: '🦵', grupo: 'piernas', dificultad: 1, met: 5.5,
    musculos: ['Cuádriceps', 'Glúteos', 'Core'],
    instrucciones: [
      'De pie, pies al ancho de hombros y puntas ligeramente hacia fuera.',
      'Baja empujando la cadera hacia atrás, como si te sentaras en una silla.',
      'Desciende hasta que los muslos queden paralelos al suelo, pecho erguido.',
      'Empuja con los talones para volver arriba apretando los glúteos.'
    ],
    errores: ['Que las rodillas se vayan hacia dentro', 'Levantar los talones del suelo', 'Redondear la espalda'],
    consejo: 'Los brazos extendidos al frente te ayudan a equilibrarte.',
    anim: { view: 'side', kfs: [
      { py: 0, spine: 178, head: 182, thighL: 6, shinL: 2, thighR: -2, shinR: 0, armL: 10, farmL: 5, armR: -5, farmR: -2, d: 0.85 },
      { py: 36, spine: 152, head: 162, thighL: 76, shinL: -14, thighR: 70, shinR: -10, armL: 92, farmL: 90, armR: 86, farmR: 84, d: 0.85 }
    ]}
  },
  'jump-squat': {
    nombre: 'Sentadilla con salto', emoji: '🚀', grupo: 'piernas', dificultad: 3, met: 9,
    musculos: ['Cuádriceps', 'Glúteos', 'Gemelos'],
    instrucciones: [
      'Realiza una sentadilla normal hasta la posición baja.',
      'Explota hacia arriba saltando lo más alto posible.',
      'Aterriza suave, con rodillas flexionadas, y enlaza la siguiente repetición.',
      'Usa los brazos como impulso en cada salto.'
    ],
    errores: ['Aterrizar con piernas rígidas', 'Bajar poco antes de saltar'],
    consejo: 'La calidad del aterrizaje importa más que la altura del salto.',
    anim: { view: 'side', kfs: [
      { py: 36, spine: 152, head: 162, thighL: 76, shinL: -14, thighR: 70, shinR: -10, armL: 60, farmL: 55, armR: 55, farmR: 50, d: 0.38 },
      { py: -24, spine: 182, head: 184, thighL: 3, shinL: 1, thighR: -3, shinR: -1, armL: -35, farmL: -25, armR: -30, farmR: -20, d: 0.45 }
    ]}
  },
  'lunges': {
    nombre: 'Zancadas', emoji: '🚶', grupo: 'piernas', dificultad: 2, met: 6,
    musculos: ['Cuádriceps', 'Glúteos', 'Isquiotibiales'],
    instrucciones: [
      'De pie, da un paso largo hacia delante.',
      'Baja la cadera hasta que ambas rodillas formen 90°.',
      'La rodilla trasera casi toca el suelo; el torso permanece vertical.',
      'Empuja con el talón delantero para volver y alterna de pierna.'
    ],
    errores: ['Que la rodilla delantera pase la punta del pie', 'Paso demasiado corto', 'Inclinar el torso'],
    consejo: 'Piensa en bajar en vertical, no en avanzar hacia delante.',
    anim: { view: 'side', kfs: [
      { py: 0, spine: 178, head: 181, thighL: 5, shinL: 2, thighR: -5, shinR: -2, armL: 10, farmL: 5, armR: -10, farmR: -5, d: 0.55 },
      { py: 32, spine: 172, head: 176, thighL: 62, shinL: -8, thighR: -55, shinR: -82, armL: 14, farmL: 8, armR: -12, farmR: -6, d: 0.7 }
    ]}
  },
  'glute-bridge': {
    nombre: 'Puente de glúteos', emoji: '🌉', grupo: 'piernas', dificultad: 1, met: 4,
    musculos: ['Glúteos', 'Isquiotibiales', 'Lumbar'],
    instrucciones: [
      'Túmbate boca arriba con las rodillas flexionadas y los pies apoyados.',
      'Brazos a los lados, palmas hacia abajo.',
      'Eleva la cadera apretando los glúteos hasta alinear hombros-cadera-rodillas.',
      'Mantén 1-2 segundos arriba y baja con control.'
    ],
    errores: ['Arquear demasiado la zona lumbar', 'Empujar con la espalda en vez de glúteos'],
    consejo: 'Aprieta los glúteos arriba como si sujetaras una moneda.',
    anim: { view: 'side', kfs: [
      { py: 74, spine: -92, head: -94, thighL: 118, shinL: 26, thighR: 112, shinR: 22, armL: -95, farmL: -94, armR: -90, farmR: -89, d: 0.6 },
      { py: 46, spine: -64, head: -76, thighL: 96, shinL: 26, thighR: 91, shinR: 22, armL: -85, farmL: -84, armR: -80, farmR: -79, d: 0.6 }
    ]}
  },
  'calf-raises': {
    nombre: 'Elevación de talones', emoji: '🦶', grupo: 'piernas', dificultad: 1, met: 3.5,
    musculos: ['Gemelos', 'Sóleo'],
    instrucciones: [
      'De pie, pies al ancho de cadera, cerca de una pared por si necesitas apoyo.',
      'Eleva los talones hasta quedar de puntillas, lo más alto posible.',
      'Pausa 1 segundo arriba apretando los gemelos.',
      'Baja lento y controlado sin apoyar del todo el talón.'
    ],
    errores: ['Rebotar usando inercia', 'Rango de movimiento incompleto'],
    consejo: 'Hazlo a una pierna cuando te resulte fácil.',
    anim: { view: 'side', kfs: [
      { py: 0, spine: 180, head: 182, thighL: 4, shinL: 2, thighR: -4, shinR: -2, armL: 10, farmL: 5, armR: -10, farmR: -5, d: 0.55 },
      { py: -8, spine: 181, head: 183, thighL: 4, shinL: 2, thighR: -4, shinR: -2, armL: 12, farmL: 6, armR: -12, farmR: -6, d: 0.55 }
    ]}
  },
  'pushup': {
    nombre: 'Flexiones', emoji: '💪', grupo: 'pecho', dificultad: 2, met: 7,
    musculos: ['Pecho', 'Tríceps', 'Hombros', 'Core'],
    instrucciones: [
      'En plancha alta: manos bajo los hombros, cuerpo en línea recta.',
      'Baja el pecho flexionando los codos a unos 45° del cuerpo.',
      'Desciende hasta casi rozar el suelo con el pecho.',
      'Empuja el suelo con fuerza para volver arriba sin perder la línea.'
    ],
    errores: ['Cadera caída o levantada', 'Codos totalmente abiertos a 90°', 'Rango incompleto'],
    consejo: 'Si aún no puedes, apoya las rodillas: misma técnica, menos carga.',
    anim: { view: 'side', kfs: [
      { py: 46, spine: 100, head: 118, thighL: -83, shinL: -85, thighR: -80, shinR: -82, armL: 22, farmL: 10, armR: 26, farmR: 14, d: 0.7 },
      { py: 62, spine: 102, head: 112, thighL: -84, shinL: -86, thighR: -81, shinR: -83, armL: -50, farmL: 55, armR: -46, farmR: 60, d: 0.7 }
    ]}
  },
  'pike-pushup': {
    nombre: 'Flexión pica', emoji: '⛰️', grupo: 'pecho', dificultad: 3, met: 7,
    musculos: ['Hombros', 'Tríceps', 'Trapecio'],
    instrucciones: [
      'Desde plancha, camina los pies hacia las manos elevando la cadera (V invertida).',
      'Flexiona los codos para llevar la cabeza hacia el suelo, entre las manos.',
      'Empuja con los hombros para volver a extender los brazos.',
      'Mantén las piernas lo más rectas posible.'
    ],
    errores: ['Cadera demasiado baja (se vuelve flexión normal)', 'Mirar al frente en lugar de a los pies'],
    consejo: 'Es el mejor paso previo a las flexiones en pino.',
    anim: { view: 'side', kfs: [
      { py: 6, spine: 55, head: 78, thighL: -36, shinL: -30, thighR: -33, shinR: -27, armL: 14, farmL: 7, armR: 18, farmR: 11, d: 0.7 },
      { py: 15, spine: 63, head: 86, thighL: -37, shinL: -31, thighR: -34, shinR: -28, armL: -42, farmL: 48, armR: -38, farmR: 52, d: 0.7 }
    ]}
  },
  'plank': {
    nombre: 'Plancha', emoji: '🛡️', grupo: 'core', dificultad: 1, met: 4,
    musculos: ['Core completo', 'Hombros', 'Glúteos'],
    instrucciones: [
      'Apóyate sobre los antebrazos y las puntas de los pies.',
      'Codos justo debajo de los hombros.',
      'Forma una línea recta de cabeza a talones: aprieta abdomen y glúteos.',
      'Respira de forma constante y aguanta el tiempo indicado.'
    ],
    errores: ['Cadera caída (daña la lumbar)', 'Cadera demasiado alta', 'Aguantar la respiración'],
    consejo: 'Imagina que vas a recibir un golpe en el abdomen: esa es la tensión.',
    anim: { view: 'side', kfs: [
      { py: 50, spine: 97, head: 116, thighL: -82, shinL: -84, thighR: -79, shinR: -81, armL: 18, farmL: 88, armR: 22, farmR: 92, d: 1.2 },
      { py: 47, spine: 96, head: 113, thighL: -82, shinL: -84, thighR: -79, shinR: -81, armL: 18, farmL: 88, armR: 22, farmR: 92, d: 1.2 }
    ]}
  },
  'mountain-climbers': {
    nombre: 'Escaladores', emoji: '🧗', grupo: 'core', dificultad: 2, met: 8,
    musculos: ['Core', 'Hombros', 'Cardio'],
    instrucciones: [
      'En plancha alta con las manos bajo los hombros.',
      'Lleva una rodilla hacia el pecho de forma explosiva.',
      'Alterna las piernas a ritmo de carrera sin mover la cadera.',
      'Los hombros se mantienen siempre sobre las manos.'
    ],
    errores: ['Rebotar la cadera arriba y abajo', 'Apoyar las manos muy adelante'],
    consejo: 'Empieza lento dominando la postura y sube el ritmo poco a poco.',
    anim: { view: 'side', kfs: [
      { py: 44, spine: 98, head: 116, thighL: 42, shinL: -30, thighR: -80, shinR: -83, armL: 16, farmL: 8, armR: 20, farmR: 12, d: 0.28 },
      { py: 44, spine: 98, head: 116, thighL: -80, shinL: -83, thighR: 42, shinR: -30, armL: 16, farmL: 8, armR: 20, farmR: 12, d: 0.28 }
    ]}
  },
  'crunch': {
    nombre: 'Abdominales crunch', emoji: '🔥', grupo: 'core', dificultad: 1, met: 4.5,
    musculos: ['Recto abdominal'],
    instrucciones: [
      'Túmbate boca arriba con rodillas flexionadas y pies apoyados.',
      'Manos suaves detrás de la cabeza o cruzadas en el pecho.',
      'Despega hombros y parte alta de la espalda contrayendo el abdomen.',
      'Baja con control sin dejar caer la cabeza.'
    ],
    errores: ['Tirar del cuello con las manos', 'Subir con impulso', 'Levantar toda la espalda'],
    consejo: 'Exhala al subir: la contracción será más intensa.',
    anim: { view: 'side', kfs: [
      { py: 76, spine: -93, head: -96, thighL: 120, shinL: 30, thighR: 114, shinR: 26, armL: -120, farmL: -150, armR: -116, farmR: -146, d: 0.55 },
      { py: 76, spine: -122, head: -118, thighL: 120, shinL: 30, thighR: 114, shinR: 26, armL: -140, farmL: -170, armR: -136, farmR: -166, d: 0.55 }
    ]}
  },
  'leg-raises': {
    nombre: 'Elevación de piernas', emoji: '🦿', grupo: 'core', dificultad: 2, met: 4.5,
    musculos: ['Abdomen inferior', 'Flexores de cadera'],
    instrucciones: [
      'Túmbate boca arriba con las piernas extendidas y manos bajo los glúteos.',
      'Eleva las piernas rectas hasta los 90°.',
      'Baja lento sin que los talones toquen el suelo.',
      'La zona lumbar permanece pegada al suelo en todo momento.'
    ],
    errores: ['Despegar la lumbar al bajar', 'Doblar mucho las rodillas', 'Bajar demasiado rápido'],
    consejo: 'Si la lumbar se despega, reduce el rango de bajada.',
    anim: { view: 'side', kfs: [
      { py: 78, spine: -92, head: -94, thighL: 88, shinL: 86, thighR: 91, shinR: 89, armL: -92, farmL: -91, armR: -88, farmR: -87, d: 0.62 },
      { py: 78, spine: -92, head: -94, thighL: 168, shinL: 170, thighR: 172, shinR: 174, armL: -92, farmL: -91, armR: -88, farmR: -87, d: 0.62 }
    ]}
  },
  'bicycle': {
    nombre: 'Bicicleta', emoji: '🚴', grupo: 'core', dificultad: 2, met: 5,
    musculos: ['Oblicuos', 'Recto abdominal'],
    instrucciones: [
      'Boca arriba, manos detrás de la cabeza y piernas elevadas.',
      'Lleva una rodilla al pecho mientras extiendes la otra pierna.',
      'Gira el torso acercando el codo contrario a la rodilla que sube.',
      'Alterna lados con un ritmo controlado, como pedaleando.'
    ],
    errores: ['Tirar del cuello', 'Pedalear sin girar el torso', 'Ir demasiado rápido'],
    consejo: 'El giro sale del torso, no de los codos.',
    anim: { view: 'side', kfs: [
      { py: 76, spine: -112, head: -110, thighL: 122, shinL: 55, thighR: 96, shinR: 93, armL: -148, farmL: -160, armR: -144, farmR: -156, d: 0.4 },
      { py: 76, spine: -112, head: -110, thighL: 96, shinL: 93, thighR: 122, shinR: 55, armL: -148, farmL: -160, armR: -144, farmR: -156, d: 0.4 }
    ]}
  },
  'superman': {
    nombre: 'Superman', emoji: '🦸', grupo: 'espalda', dificultad: 1, met: 4,
    musculos: ['Lumbar', 'Glúteos', 'Espalda alta'],
    instrucciones: [
      'Túmbate boca abajo con brazos extendidos hacia delante.',
      'Eleva a la vez brazos, pecho y piernas del suelo.',
      'Mantén 2 segundos arriba apretando espalda y glúteos.',
      'Baja con control y repite. La mirada apunta al suelo.'
    ],
    errores: ['Levantar la cabeza forzando el cuello', 'Movimientos bruscos'],
    consejo: 'Hazlo lento: es un ejercicio de control, no de velocidad.',
    anim: { view: 'side', kfs: [
      { py: 76, spine: 92, head: 95, thighL: -90, shinL: -88, thighR: -92, shinR: -90, armL: 88, farmL: 86, armR: 90, farmR: 88, d: 0.62 },
      { py: 76, spine: 109, head: 113, thighL: -106, shinL: -104, thighR: -108, shinR: -106, armL: 116, farmL: 119, armR: 113, farmR: 116, d: 0.62 }
    ]}
  },
  'punches': {
    nombre: 'Golpes al aire', emoji: '🥊', grupo: 'cardio', dificultad: 1, met: 7,
    musculos: ['Hombros', 'Brazos', 'Cardio'],
    instrucciones: [
      'Posición de boxeo: pies separados, rodillas semiflexionadas, puños en guardia.',
      'Lanza golpes rectos alternos rotando ligeramente el torso.',
      'Regresa el puño a la guardia tras cada golpe.',
      'Mantén el ritmo y no bloquees los codos al extender.'
    ],
    errores: ['Extender el codo de golpe (bloqueo)', 'Bajar la guardia', 'Pies planos sin rebote'],
    consejo: 'Suma velocidad por intervalos: 10 s fuerte, 10 s suave.',
    anim: { view: 'front', kfs: [
      { py: 4, spine: 178, head: 180, thighL: 14, shinL: 8, thighR: -14, shinR: -8, armL: 92, farmL: 98, armR: -30, farmR: -115, d: 0.3 },
      { py: 4, spine: 182, head: 180, thighL: 14, shinL: 8, thighR: -14, shinR: -8, armL: 30, farmL: 115, armR: -92, farmR: -98, d: 0.3 }
    ]}
  },
  'side-plank': {
    nombre: 'Plancha lateral', emoji: '🧱', grupo: 'core', dificultad: 2, met: 4,
    musculos: ['Oblicuos', 'Core lateral', 'Hombro'],
    instrucciones: [
      'Túmbate de lado apoyado sobre el antebrazo, codo bajo el hombro.',
      'Eleva la cadera hasta formar una línea recta de cabeza a pies.',
      'El brazo libre apunta al techo o descansa en la cadera.',
      'Aguanta el tiempo indicado y cambia de lado en la siguiente serie.'
    ],
    errores: ['Cadera caída hacia el suelo', 'Hombro adelantado respecto al codo', 'Girar el torso'],
    consejo: 'Aprieta el glúteo de abajo: estabiliza toda la línea.',
    anim: { view: 'side', kfs: [
      { py: 56, spine: -122, head: -118, thighL: 78, shinL: 78, thighR: 82, shinR: 82, armL: 15, farmL: 95, armR: -172, farmR: -170, d: 1.1 },
      { py: 62, spine: -117, head: -113, thighL: 79, shinL: 79, thighR: 83, shinR: 83, armL: 15, farmL: 95, armR: -172, farmR: -170, d: 1.1 }
    ]}
  },
  'shoulder-taps': {
    nombre: 'Toques de hombro', emoji: '🖐️', grupo: 'pecho', dificultad: 2, met: 6,
    musculos: ['Core', 'Hombros', 'Pecho'],
    instrucciones: [
      'Colócate en plancha alta con los pies algo separados.',
      'Levanta una mano y toca el hombro contrario.',
      'Vuelve a apoyarla y alterna de lado.',
      'La cadera no debe balancearse: el core trabaja para evitarlo.'
    ],
    errores: ['Balancear la cadera de lado a lado', 'Ir demasiado rápido perdiendo control'],
    consejo: 'Cuanto más separes los pies, más estable estarás.',
    anim: { view: 'side', kfs: [
      { py: 46, spine: 100, head: 118, thighL: -83, shinL: -85, thighR: -80, shinR: -82, armL: -35, farmL: -145, armR: 18, farmR: 8, d: 0.45 },
      { py: 46, spine: 100, head: 118, thighL: -83, shinL: -85, thighR: -80, shinR: -82, armR: -35, farmR: -145, armL: 22, farmL: 12, d: 0.45 }
    ]}
  },
  'dead-bug': {
    nombre: 'Insecto muerto', emoji: '🪲', grupo: 'core', dificultad: 1, met: 3.5,
    musculos: ['Core profundo', 'Coordinación'],
    instrucciones: [
      'Boca arriba, brazos hacia el techo y rodillas dobladas a 90°.',
      'Extiende a la vez el brazo derecho hacia atrás y la pierna izquierda al frente.',
      'Sin que la lumbar se despegue del suelo, vuelve al centro.',
      'Alterna lados con movimientos lentos y controlados.'
    ],
    errores: ['Arquear la zona lumbar', 'Mover brazo y pierna del mismo lado', 'Ir con prisa'],
    consejo: 'Es un ejercicio de control: hazlo lento y exhala al extender.',
    anim: { view: 'side', kfs: [
      { py: 78, spine: -92, head: -94, armL: -105, farmL: -104, armR: -178, farmR: -176, thighL: 150, shinL: 60, thighR: 95, shinR: 93, d: 0.75 },
      { py: 78, spine: -92, head: -94, armR: -105, farmR: -104, armL: -178, farmL: -176, thighR: 150, shinR: 60, thighL: 95, shinL: 93, d: 0.75 }
    ]}
  },
  'bird-dog': {
    nombre: 'Perro de caza', emoji: '🐕', grupo: 'espalda', dificultad: 1, met: 3.5,
    musculos: ['Lumbar', 'Glúteos', 'Core', 'Equilibrio'],
    instrucciones: [
      'A cuatro patas: manos bajo hombros y rodillas bajo caderas.',
      'Extiende a la vez el brazo derecho al frente y la pierna izquierda atrás.',
      'Mantén 2 segundos con la espalda neutra y la cadera nivelada.',
      'Vuelve al centro y alterna de lado.'
    ],
    errores: ['Rotar la cadera al extender la pierna', 'Arquear el cuello mirando al frente'],
    consejo: 'Imagina un vaso de agua sobre tu espalda: que no se derrame.',
    anim: { view: 'side', kfs: [
      { py: 30, spine: 95, head: 112, armR: 95, farmR: 93, armL: 12, farmL: 6, thighL: -95, shinL: -93, thighR: -35, shinR: -90, d: 0.95 },
      { py: 30, spine: 95, head: 112, armL: 95, farmL: 93, armR: 12, farmR: 6, thighR: -95, shinR: -93, thighL: -35, shinL: -90, d: 0.95 }
    ]}
  },
  'russian-twist': {
    nombre: 'Giro ruso', emoji: '🌀', grupo: 'core', dificultad: 2, met: 5,
    musculos: ['Oblicuos', 'Recto abdominal'],
    instrucciones: [
      'Siéntate con las rodillas dobladas y el torso inclinado hacia atrás (~45°).',
      'Junta las manos frente al pecho; si puedes, eleva los pies.',
      'Gira el torso llevando las manos de un lado al otro de la cadera.',
      'El giro nace del abdomen, no de los brazos.'
    ],
    errores: ['Redondear la espalda', 'Mover solo los brazos sin girar el torso'],
    consejo: 'Mantén el pecho abierto: el ejercicio es del tronco.',
    anim: { view: 'side', kfs: [
      { py: 68, spine: -138, head: -130, thighL: 118, shinL: 48, thighR: 112, shinR: 44, armL: 100, farmL: 100, armR: 96, farmR: 96, d: 0.4 },
      { py: 68, spine: -142, head: -134, thighL: 118, shinL: 48, thighR: 112, shinR: 44, armL: 145, farmL: 148, armR: 141, farmR: 144, d: 0.4 }
    ]}
  },
  'flutter-kicks': {
    nombre: 'Tijeras verticales', emoji: '✂️', grupo: 'core', dificultad: 2, met: 4.5,
    musculos: ['Abdomen inferior', 'Flexores de cadera'],
    instrucciones: [
      'Boca arriba con las manos bajo los glúteos.',
      'Eleva las piernas rectas unos 30-40 cm del suelo.',
      'Patalea alternando piernas arriba y abajo, con recorrido corto.',
      'La lumbar permanece pegada al suelo todo el tiempo.'
    ],
    errores: ['Despegar la lumbar', 'Doblar las rodillas', 'Recorridos demasiado amplios'],
    consejo: 'Si la lumbar se despega, eleva más las piernas.',
    anim: { view: 'side', kfs: [
      { py: 78, spine: -95, head: -97, thighL: 100, shinL: 99, thighR: 128, shinR: 127, armL: -92, farmL: -91, armR: -88, farmR: -87, d: 0.3 },
      { py: 78, spine: -95, head: -97, thighL: 128, shinL: 127, thighR: 100, shinR: 99, armL: -92, farmL: -91, armR: -88, farmR: -87, d: 0.3 }
    ]}
  },
  'hollow-hold': {
    nombre: 'Hollow hold', emoji: '🥣', grupo: 'core', dificultad: 3, met: 4,
    musculos: ['Core completo', 'Tensión corporal'],
    instrucciones: [
      'Boca arriba, brazos extendidos por detrás de la cabeza.',
      'Despega a la vez hombros y piernas formando una "banana".',
      'Aprieta el abdomen empujando la lumbar contra el suelo.',
      'Aguanta la posición respirando de forma controlada.'
    ],
    errores: ['Lumbar despegada (arqueo)', 'Cuello tenso mirando arriba', 'Piernas demasiado altas'],
    consejo: 'Si es muy duro, dobla las rodillas o sube más las piernas.',
    anim: { view: 'side', kfs: [
      { py: 74, spine: -112, head: -106, thighL: 112, shinL: 110, thighR: 116, shinR: 114, armL: -130, farmL: -132, armR: -126, farmR: -128, d: 1.2 },
      { py: 75, spine: -110, head: -104, thighL: 114, shinL: 112, thighR: 118, shinR: 116, armL: -128, farmL: -130, armR: -124, farmR: -126, d: 1.2 }
    ]}
  },
  'inchworm': {
    nombre: 'Oruga', emoji: '🐛', grupo: 'cardio', dificultad: 2, met: 6,
    musculos: ['Cuerpo completo', 'Hombros', 'Isquiotibiales'],
    instrucciones: [
      'De pie, flexiona la cadera y apoya las manos en el suelo.',
      'Camina con las manos hacia delante hasta quedar en plancha.',
      'Pausa 1 segundo y camina las manos de vuelta hacia los pies.',
      'Incorpórate y repite. Las piernas, lo más rectas que puedas.'
    ],
    errores: ['Doblar mucho las rodillas', 'Dejar caer la cadera en la plancha'],
    consejo: 'Excelente para calentar: moviliza hombros e isquios a la vez.',
    anim: { view: 'side', kfs: [
      { py: 0, spine: 180, head: 183, thighL: 4, shinL: 2, thighR: -4, shinR: -2, armL: 10, farmL: 5, armR: -10, farmR: -5, d: 0.45 },
      { py: 14, spine: 55, head: 75, thighL: -18, shinL: -12, thighR: -14, shinR: -10, armL: 35, farmL: 30, armR: 30, farmR: 25, d: 0.55 },
      { py: 46, spine: 100, head: 118, thighL: -83, shinL: -85, thighR: -80, shinR: -82, armL: 18, farmL: 8, armR: 22, farmR: 12, d: 0.7 },
      { py: 14, spine: 55, head: 75, thighL: -18, shinL: -12, thighR: -14, shinR: -10, armL: 35, farmL: 30, armR: 30, farmR: 25, d: 0.6 }
    ]}
  },
  'skaters': {
    nombre: 'Patinadores', emoji: '⛸️', grupo: 'cardio', dificultad: 2, met: 8,
    musculos: ['Piernas', 'Glúteos', 'Cardio', 'Equilibrio'],
    instrucciones: [
      'Salta lateralmente aterrizando sobre una pierna.',
      'La pierna libre cruza por detrás sin tocar el suelo.',
      'Los brazos acompañan el impulso como al patinar.',
      'Encadena saltos de lado a lado con ritmo constante.'
    ],
    errores: ['Aterrizar con la pierna rígida', 'Torso totalmente erguido (inclínate un poco)'],
    consejo: 'Cuanto más te agaches al aterrizar, más trabajan glúteos y piernas.',
    anim: { view: 'front', kfs: [
      { px: -14, py: 8, spine: 172, head: 174, thighL: 30, shinL: 24, thighR: -48, shinR: -14, armL: -45, farmL: -55, armR: 50, farmR: 65, d: 0.42 },
      { px: 14, py: 8, spine: 188, head: 186, thighR: -30, shinR: -24, thighL: 48, shinL: 14, armR: 45, farmR: 55, armL: -50, farmL: -65, d: 0.42 }
    ]}
  },
  'donkey-kicks': {
    nombre: 'Patada de glúteo', emoji: '🐴', grupo: 'piernas', dificultad: 1, met: 4,
    musculos: ['Glúteos', 'Isquiotibiales', 'Lumbar'],
    instrucciones: [
      'A cuatro patas con la espalda neutra.',
      'Con la rodilla doblada a 90°, eleva una pierna llevando el talón al techo.',
      'Aprieta el glúteo arriba 1 segundo.',
      'Baja sin tocar el suelo y repite; cambia de pierna en la siguiente serie.'
    ],
    errores: ['Arquear la lumbar al subir', 'Abrir la cadera hacia el lado'],
    consejo: 'El movimiento es corto: la fuerza sale del glúteo, no de la espalda.',
    anim: { view: 'side', kfs: [
      { py: 30, spine: 95, head: 112, armL: 12, farmL: 6, armR: 18, farmR: 10, thighL: -35, shinL: -90, thighR: -38, shinR: -92, d: 0.5 },
      { py: 30, spine: 95, head: 112, armL: 12, farmL: 6, armR: 18, farmR: 10, thighL: -128, shinL: -172, thighR: -38, shinR: -92, d: 0.5 }
    ]}
  },
  'plank-updown': {
    nombre: 'Plancha arriba-abajo', emoji: '🔼', grupo: 'pecho', dificultad: 3, met: 7,
    musculos: ['Core', 'Hombros', 'Tríceps', 'Pecho'],
    instrucciones: [
      'Empieza en plancha sobre los antebrazos.',
      'Apoya una mano y luego la otra para subir a plancha alta.',
      'Baja de nuevo a los antebrazos, un brazo cada vez.',
      'Alterna el brazo que inicia y evita balancear la cadera.'
    ],
    errores: ['Cadera bailando de lado a lado', 'Manos muy adelantadas al subir'],
    consejo: 'Pies más anchos = más estabilidad. Ritmo constante, no velocidad.',
    anim: { view: 'side', kfs: [
      { py: 50, spine: 97, head: 115, thighL: -82, shinL: -84, thighR: -79, shinR: -81, armL: 18, farmL: 88, armR: 22, farmR: 92, d: 0.55 },
      { py: 44, spine: 99, head: 117, thighL: -82, shinL: -84, thighR: -79, shinR: -81, armL: 18, farmL: 8, armR: 24, farmR: 14, d: 0.55 }
    ]}
  },
  'tuck-jump': {
    nombre: 'Salto rodillas al pecho', emoji: '🦘', grupo: 'cardio', dificultad: 3, met: 9,
    musculos: ['Piernas', 'Core', 'Potencia'],
    instrucciones: [
      'Desde media sentadilla, salta lo más alto posible.',
      'En el aire, lleva ambas rodillas hacia el pecho.',
      'Aterriza suave con las rodillas flexionadas.',
      'Resetea un segundo y repite. Calidad antes que velocidad.'
    ],
    errores: ['Inclinar el pecho hacia las rodillas (deben subir ellas)', 'Aterrizar rígido'],
    consejo: 'Ejercicio avanzado: si eres nuevo, sustitúyelo por sentadilla con salto.',
    anim: { view: 'side', kfs: [
      { py: 26, spine: 160, head: 166, thighL: 55, shinL: -8, thighR: 50, shinR: -5, armL: -30, farmL: -20, armR: -25, farmR: -15, d: 0.38 },
      { py: -42, spine: 178, head: 180, thighL: 88, shinL: 5, thighR: 82, shinR: 2, armL: 60, farmL: 80, armR: -50, farmR: -60, d: 0.42 }
    ]}
  },
  'sumo-squat': {
    nombre: 'Sentadilla sumo', emoji: '💠', grupo: 'piernas', dificultad: 1, met: 5.5,
    musculos: ['Aductores', 'Glúteos', 'Cuádriceps'],
    instrucciones: [
      'Pies bien separados (más que los hombros) y puntas hacia fuera ~45°.',
      'Baja recto, con el torso vertical, abriendo las rodillas hacia las puntas.',
      'Desciende hasta donde mantengas la espalda recta.',
      'Sube apretando glúteos y cara interna del muslo.'
    ],
    errores: ['Rodillas colapsando hacia dentro', 'Inclinar el torso adelante', 'Talones despegados'],
    consejo: 'Piensa en "abrir el suelo" con los pies: activa los glúteos.',
    anim: { view: 'front', kfs: [
      { py: 0, spine: 180, head: 181, thighL: 24, shinL: 20, thighR: -24, shinR: -20, armL: 14, farmL: 8, armR: -14, farmR: -8, d: 0.8 },
      { py: 32, spine: 178, head: 180, thighL: 62, shinL: 8, thighR: -62, shinR: -8, armL: 95, farmL: 100, armR: -95, farmR: -100, d: 0.8 }
    ]}
  }
};

/* ---------- Tipos de sesión ---------- */
const SESIONES = {
  fullbody: { nombre: 'Cuerpo completo', icon: '🏋️', desc: 'Fuerza total: piernas, empuje y core en una sola sesión.',
    lista: ['jumping-jacks', 'squat', 'pushup', 'lunges', 'inchworm', 'glute-bridge', 'plank', 'crunch'] },
  hiit: { nombre: 'Cardio HIIT', icon: '⚡', desc: 'Intervalos de alta intensidad para quemar al máximo.',
    lista: ['jumping-jacks', 'burpees', 'high-knees', 'jump-squat', 'skaters', 'mountain-climbers', 'tuck-jump', 'punches'] },
  core: { nombre: 'Core y abdomen', icon: '🎯', desc: 'Abdomen fuerte y estable: la base de todo movimiento.',
    lista: ['crunch', 'plank', 'leg-raises', 'russian-twist', 'bicycle', 'flutter-kicks', 'side-plank', 'dead-bug'] },
  lower: { nombre: 'Tren inferior', icon: '🦵', desc: 'Piernas y glúteos: fuerza y potencia desde la base.',
    lista: ['squat', 'lunges', 'sumo-squat', 'glute-bridge', 'donkey-kicks', 'jump-squat', 'calf-raises'] },
  upper: { nombre: 'Tren superior', icon: '💪', desc: 'Pecho, hombros, brazos y espalda sin material.',
    lista: ['pushup', 'pike-pushup', 'shoulder-taps', 'plank-updown', 'punches', 'superman', 'plank'] },
  mobility: { nombre: 'Movilidad y recuperación', icon: '🧘', desc: 'Sesión suave para activar la circulación y recuperar.',
    lista: ['bird-dog', 'glute-bridge', 'superman', 'dead-bug', 'calf-raises', 'plank'] },
  rest: { nombre: 'Descanso', icon: '😴', desc: 'Hoy toca recuperar. El músculo crece cuando descansas.', lista: [] }
};

/* ---------- Plan semanal por objetivo (índice 0 = lunes) ---------- */
const PLANES = {
  perder:   ['fullbody', 'hiit', 'core', 'lower', 'hiit', 'mobility', 'rest'],
  ganar:    ['upper', 'lower', 'core', 'upper', 'lower', 'mobility', 'rest'],
  mantener: ['fullbody', 'hiit', 'core', 'upper', 'lower', 'mobility', 'rest']
};

/* ---------- Niveles ---------- */
const NIVELES = {
  principiante: { nombre: 'Principiante', work: 30, rest: 20, rondas: 2 },
  intermedio:   { nombre: 'Intermedio',   work: 40, rest: 15, rondas: 3 },
  avanzado:     { nombre: 'Avanzado',     work: 45, rest: 12, rondas: 4 }
};

/* ---------- Menú semanal (índice 0 = lunes) ---------- */
const MENU = [
  { desayuno: { n: 'Avena con plátano y canela', d: 'Avena cocida en leche, plátano en rodajas, canela y un puñado de nueces.', kcal: 420, e: '🥣' },
    comida:   { n: 'Pollo a la plancha con arroz integral', d: 'Pechuga a la plancha, arroz integral y brócoli al vapor con aceite de oliva.', kcal: 580, e: '🍗' },
    cena:     { n: 'Salmón al horno con verduras', d: 'Salmón con espárragos y calabacín asados, ensalada verde de guarnición.', kcal: 520, e: '🐟' },
    snack:    { n: 'Yogur griego con arándanos', d: 'Yogur griego natural con arándanos frescos y semillas de chía.', kcal: 200, e: '🫐' } },
  { desayuno: { n: 'Tostadas integrales con aguacate y huevo', d: 'Dos tostadas integrales, medio aguacate y dos huevos a la plancha.', kcal: 450, e: '🥑' },
    comida:   { n: 'Bowl de atún y quinoa', d: 'Quinoa, atún, tomate cherry, maíz, pepino y limón.', kcal: 560, e: '🥗' },
    cena:     { n: 'Tortilla de espinacas con ensalada', d: 'Tortilla de 3 huevos con espinacas y queso fresco, ensalada de tomate.', kcal: 460, e: '🍳' },
    snack:    { n: 'Manzana con crema de cacahuete', d: 'Una manzana en gajos con una cucharada de crema de cacahuete.', kcal: 210, e: '🍎' } },
  { desayuno: { n: 'Batido verde con proteína', d: 'Espinacas, plátano, leche, proteína en polvo (o yogur) y avena.', kcal: 400, e: '🥤' },
    comida:   { n: 'Lentejas estofadas con verduras', d: 'Lentejas con zanahoria, pimiento y cebolla. Pan integral de acompañamiento.', kcal: 590, e: '🍲' },
    cena:     { n: 'Pechuga de pavo con boniato asado', d: 'Pavo a la plancha, boniato al horno y judías verdes salteadas.', kcal: 500, e: '🍠' },
    snack:    { n: 'Puñado de frutos secos', d: '30 g de almendras y nueces sin sal.', kcal: 190, e: '🥜' } },
  { desayuno: { n: 'Yogur con granola y fruta', d: 'Yogur griego, granola casera, fresas y miel.', kcal: 430, e: '🍓' },
    comida:   { n: 'Pasta integral con pollo y pesto', d: 'Pasta integral, tiras de pollo, pesto ligero y tomates secos.', kcal: 620, e: '🍝' },
    cena:     { n: 'Crema de calabaza + huevos duros', d: 'Crema de calabaza casera con dos huevos duros y picatostes integrales.', kcal: 440, e: '🎃' },
    snack:    { n: 'Requesón con miel y nueces', d: 'Requesón o queso cottage con un toque de miel y nueces.', kcal: 200, e: '🍯' } },
  { desayuno: { n: 'Tortitas de avena y plátano', d: 'Tortitas de avena, huevo y plátano, con fruta fresca por encima.', kcal: 440, e: '🥞' },
    comida:   { n: 'Arroz salteado con ternera y verduras', d: 'Ternera magra salteada con arroz, pimiento, cebolla y salsa de soja ligera.', kcal: 610, e: '🥩' },
    cena:     { n: 'Tacos de pescado blanco', d: 'Merluza a la plancha en tortillas de maíz con col morada y yogur-lima.', kcal: 480, e: '🌮' },
    snack:    { n: 'Hummus con palitos de zanahoria', d: 'Hummus casero con bastones de zanahoria y pepino.', kcal: 180, e: '🥕' } },
  { desayuno: { n: 'Huevos revueltos con pan de centeno', d: 'Tres huevos revueltos, pan de centeno y zumo de naranja natural.', kcal: 460, e: '🍞' },
    comida:   { n: 'Garbanzos con espinacas y bacalao', d: 'Potaje ligero de garbanzos, espinacas y bacalao desmigado.', kcal: 570, e: '🍛' },
    cena:     { n: 'Pizza casera de base integral', d: 'Base integral fina, tomate, mozzarella light, pollo y rúcula. ¡Disfrútala!', kcal: 550, e: '🍕' },
    snack:    { n: 'Onza de chocolate negro + café', d: 'Chocolate ≥85% con café o infusión. Capricho inteligente.', kcal: 150, e: '🍫' } },
  { desayuno: { n: 'Bowl de açaí o smoothie de frutas', d: 'Base de frutas batidas con topping de granola, coco y plátano.', kcal: 430, e: '🍇' },
    comida:   { n: 'Pollo asado con patatas al horno', d: 'Comida familiar: pollo asado, patatas al horno y ensalada grande.', kcal: 640, e: '🍗' },
    cena:     { n: 'Cena ligera: sopa + sándwich de pavo', d: 'Sopa de verduras y sándwich integral de pavo, queso fresco y tomate.', kcal: 430, e: '🥪' },
    snack:    { n: 'Fruta de temporada', d: 'La fruta que más te apetezca, sin culpa.', kcal: 120, e: '🍊' } }
];

const DIETA_TIPS = {
  perder: [
    'Mantén un déficit moderado (~400 kcal): perder 0,5 kg/semana es sostenible.',
    'Prioriza proteína en cada comida: protege tu músculo y sacia más.',
    'Bebe un vaso de agua antes de cada comida.',
    'Las verduras son volumen libre: llena medio plato con ellas.'
  ],
  ganar: [
    'Superávit ligero (~300 kcal): gana músculo, no grasa.',
    'Reparte la proteína en 4-5 tomas a lo largo del día.',
    'Los carbohidratos alrededor del entrenamiento son tus aliados.',
    'Si no subes de peso en 2 semanas, añade un snack extra.'
  ],
  mantener: [
    'Regla 80/20: come bien el 80% del tiempo y disfruta el 20% restante.',
    'Escucha tu hambre real: come despacio y sin pantallas.',
    'Mantén la proteína alta aunque no busques cambios.',
    'La constancia en el sueño también es nutrición: 7-8 h.'
  ]
};

const OBJETIVOS = {
  perder:   { nombre: 'Perder grasa', emoji: '🔥', ajuste: -400, prot: 2.0 },
  ganar:    { nombre: 'Ganar músculo', emoji: '💪', ajuste: 300, prot: 1.8 },
  mantener: { nombre: 'Mantenerme en forma', emoji: '⚖️', ajuste: 0, prot: 1.6 }
};

const GRUPOS = { todos: 'Todos', cardio: 'Cardio', piernas: 'Piernas', pecho: 'Empuje', core: 'Core', espalda: 'Espalda' };

/* ---------- Logros (cond recibe las estadísticas globales) ---------- */
const LOGROS = [
  { id: 'primera',  nombre: 'Primer paso',          desc: 'Completa tu primer entrenamiento',        emoji: '🥇', cond: s => s.sesiones >= 1 },
  { id: 'racha3',   nombre: 'En llamas',            desc: 'Consigue una racha de 3 días',            emoji: '🔥', cond: s => s.racha >= 3 },
  { id: 'racha7',   nombre: 'Semana perfecta',      desc: 'Consigue una racha de 7 días',            emoji: '⚡', cond: s => s.racha >= 7 },
  { id: 'racha14',  nombre: 'Imparable',            desc: 'Consigue una racha de 14 días',           emoji: '🚀', cond: s => s.racha >= 14 },
  { id: 'racha30',  nombre: 'Leyenda',              desc: 'Consigue una racha de 30 días',           emoji: '👑', cond: s => s.racha >= 30 },
  { id: 'ses10',    nombre: 'Constante',            desc: 'Completa 10 entrenamientos',              emoji: '💪', cond: s => s.sesiones >= 10 },
  { id: 'ses25',    nombre: 'Disciplina de hierro', desc: 'Completa 25 entrenamientos',              emoji: '🛡️', cond: s => s.sesiones >= 25 },
  { id: 'ses50',    nombre: 'Máquina',              desc: 'Completa 50 entrenamientos',              emoji: '🤖', cond: s => s.sesiones >= 50 },
  { id: 'kcal1000', nombre: 'Quemador',             desc: 'Quema 1.000 kcal acumuladas',             emoji: '♨️', cond: s => s.kcal >= 1000 },
  { id: 'kcal5000', nombre: 'Horno humano',         desc: 'Quema 5.000 kcal acumuladas',             emoji: '🌋', cond: s => s.kcal >= 5000 },
  { id: 'min300',   nombre: 'Maratoniano',          desc: 'Acumula 300 minutos de entrenamiento',    emoji: '⏱️', cond: s => s.min >= 300 },
  { id: 'hidra',    nombre: 'Hidratación perfecta', desc: 'Bebe los 8 vasos de agua en un día',      emoji: '💧', cond: s => s.diasAgua >= 1 },
  { id: 'chef',     nombre: 'Día de chef',          desc: 'Marca las 4 comidas de un mismo día',     emoji: '👨‍🍳', cond: s => s.diasComidas >= 1 },
  { id: 'peso5',    nombre: 'Bajo control',         desc: 'Registra tu peso 5 veces',                emoji: '⚖️', cond: s => s.nPesos >= 5 },
  { id: 'medidas3', nombre: 'Medición pro',         desc: 'Registra 3 medidas corporales',           emoji: '📏', cond: s => s.nMedidas >= 3 },
  { id: 'nivel5',   nombre: 'Élite',                desc: 'Alcanza el nivel 5',                      emoji: '🏆', cond: s => s.nivel >= 5 }
];

/* ---------- Retos semanales (rotan cada semana) ---------- */
const RETOS = [
  { id: 'entrena4', nombre: 'Completa 4 entrenamientos esta semana', emoji: '🏋️', meta: 4,   prog: w => w.entrenos, unidad: 'entrenos' },
  { id: 'kcal600',  nombre: 'Quema 600 kcal esta semana',            emoji: '🔥', meta: 600, prog: w => w.kcal,     unidad: 'kcal' },
  { id: 'agua4',    nombre: 'Bebe 8 vasos de agua 4 días',           emoji: '💧', meta: 4,   prog: w => w.diasAgua, unidad: 'días' },
  { id: 'min90',    nombre: 'Acumula 90 minutos de ejercicio',       emoji: '⏱️', meta: 90,  prog: w => w.min,      unidad: 'min' }
];

/* ---------- Medidas corporales ---------- */
const MEDIDAS = {
  cintura: { nombre: 'Cintura', emoji: '🎯' },
  pecho:   { nombre: 'Pecho',   emoji: '🫁' },
  cadera:  { nombre: 'Cadera',  emoji: '🍑' },
  brazo:   { nombre: 'Brazo',   emoji: '💪' },
  muslo:   { nombre: 'Muslo',   emoji: '🦵' }
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
