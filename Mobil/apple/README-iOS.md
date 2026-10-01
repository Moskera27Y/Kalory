# Kalory · Apple (iPhone 13 Pro)

Todo lo necesario para compilar la app en **iOS**. La compilación final
exige **macOS + Xcode** (Apple no permite compilar iOS en Windows); esta
carpeta + `../ios/` dejan el proyecto al 100% para abrir y darle Run.

```
Mobil/
├── ios/                  → proyecto nativo (generado, listo para Xcode)
├── apple/
│   ├── README-iOS.md     → esta guía
│   └── build-ipa.sh      → compila el .ipa en el Mac (requiere firma)
├── make-ios-icons.cjs    → iconos AppIcon (ya generados)
└── make-ios-splash.cjs   → splash 2732px (ya generado)
```

La app es la misma web de Kalory (animaciones, onboarding, servidor online).
En iOS los datos usan el servidor + `localStorage` como respaldo.

## Requisitos en el Mac

- macOS Sonoma o superior + **Xcode 15+** (App Store, gratis)
- **CocoaPods**: `sudo gem install cocoapods`
- Un **Apple ID** (gratis sirve para probar en tu propio iPhone; el
  certificado dura 7 días y se renueva solo al reconectar)
- iPhone 13 Pro con iOS 15+ y cable (o mismo WiFi para deploy inalámbrico)

## Compilar y probar en tu iPhone 13 Pro

```bash
# 1. En el Mac, clona el repo y entra a la carpeta Mobil
git clone https://github.com/Moskera27Y/Kalory.git
cd Kalory/Mobil
npm install

# 2. Sincroniza la última versión web (si hubo cambios en ../src)
npm run build-web 2>/dev/null || (cd .. && npm run build && cd Mobil)
npx cap sync ios

# 3. Instala los pods nativos
cd ios/App && pod install && cd ../..

# 4. Abre el proyecto en Xcode
open ios/App/App.xcworkspace
```

En Xcode:
1. Selecciona el target **App** → **Signing & Capabilities** → **Team** → tu Apple ID.
   El **Bundle Identifier** ya es `com.kalory.app` (si Xcode protesta que está
   ocupado, cámbialo a `com.kalory.app.tu-nombre`).
2. Conecta el iPhone 13 Pro → arriba elige tu **iPhone** como destino → ▶ **Run**.
3. En el iPhone: Ajustes → General → VPN y gestión de dispositivos →
   **confía** en tu certificado de desarrollador.
4. Abre **Kalory** y entra con correo + contraseña (igual que en Android,
   el login con Google nativo queda como fase 2).

## Generar el .ipa (para distribuir)

Con el proyecto abierto y la firma configurada:

```bash
cd Mobil/apple
./build-ipa.sh
```

Pide tu **Team ID** la primera vez (developer.apple.com → Membership).
El `.ipa` queda en `Mobil/apple/build/`.

## Notas

- Icono y splash con los colores del logo ya incluidos.
- Cada vez que cambie la web: `npx cap sync ios` y volver a Run.
- iPhone 13 Pro (A15, 120 Hz ProMotion): las animaciones van fluidas;
  el canvas de aurora se adapta solo (DPR máx. 2).
