#!/bin/bash
# Compila el .ipa de Kalory en macOS (Xcode + firma configurada).
# Uso: ./build-ipa.sh [TEAM_ID]
set -e
cd "$(dirname "$0")/../ios/App"

TEAM_ID="${1:-$KALORY_TEAM_ID}"
if [ -z "$TEAM_ID" ]; then
  echo "Uso: ./build-ipa.sh TU_TEAM_ID  (o exporta KALORY_TEAM_ID)"
  exit 1
fi

# Asegura assets web y pods al día
cd ../../ && npx cap sync ios && cd ios/App && pod install && cd ..

OUT="../../apple/build"
mkdir -p "$OUT"

xcodebuild -workspace App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$OUT/Kalory.xcarchive" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  archive

cat > "$OUT/ExportOptions.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>development</string>
  <key>teamID</key><string>$TEAM_ID</string>
  <key>compileBitcode</key><false/>
</dict>
</plist>
EOF

xcodebuild -exportArchive \
  -archivePath "$OUT/Kalory.xcarchive" \
  -exportPath "$OUT" \
  -exportOptionsPlist "$OUT/ExportOptions.plist"

echo "IPA listo en $OUT"
