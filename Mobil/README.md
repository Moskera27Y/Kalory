# Kalory · Mobil (Android)

Carpeta con todo lo necesario para usar Kalory en teléfonos Android con las
mismas animaciones e integraciones (Framer Motion, Lucide, servidor online).

```
Mobil/
├── capacitor.config.ts   → appId com.kalory.app, splash, status bar, teclado
├── package.json          → @capacitor/* (core, android, splash, status, keyboard)
├── make-android-icons.cjs→ genera iconos + splash desde el logo
├── android/              → proyecto nativo (se genera con `cap add android`)
├── tools/                → utilidades locales (JDK, zips — no se sube a Git)
└── README.md
```

La app web vive en `../src` y se compila a `../dist`; Capacitor la empaqueta
tal cual: **cero código duplicado**. En el móvil los datos usan el servidor
online (URL oficial integrada) y `localStorage` como respaldo offline.

## Requisitos (solo para compilar el APK)

- **JDK 21** (`JAVA_HOME` apuntando a él; Capacitor 7 lo exige)
- **Android SDK** (platforms + build-tools; `ANDROID_HOME`/`ANDROID_SDK_ROOT`)
- Node 20+

## Compilar el APK

```bash
cd Mobil
npm install
npm run build-web        # compila ../dist
node make-android-icons.cjs
npx cap sync android
cd android
$env:JAVA_HOME="...jdk-21"; $env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
.\gradlew.bat assembleDebug --no-daemon
```

El APK sale en `android/app/build/outputs/apk/debug/app-debug.apk`.
Pásalo al teléfono (USB/Drive/WhatsApp), permite “instalar apps desconocidas”
y listo. Para publicar en Play Store se firma en modo `release` (fase 2).

## Notas

- Animaciones, onboarding, dashboard, rutinas, dieta, perfil y medallas:
  funcionan igual que en escritorio (WebView moderno).
- **Login con Google en móvil:** el flujo de escritorio (callback local) no
  existe en Android; usa **correo + contraseña** contra el servidor online.
  El login nativo con Google (plugin) queda como fase 2.
- Icono adaptativo + splash con los colores del logo ya incluidos.
