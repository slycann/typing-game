#!/bin/bash
# Build Letterlings for the App Store: web build → Capacitor sync → signed archive → optional upload.
# Signing needs the login keychain unlocked, so run this from the Mac's desktop session
# (Terminal or Xcode), not over SSH, where the keychain stays locked.
#
#   scripts/ios-release.sh           archive only
#   scripts/ios-release.sh upload    archive, then upload to App Store Connect (TestFlight)
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-archive}"
# Every upload needs a bigger build number: year, day of year, hour, minute (stays under 2^31).
BUILD_NUMBER="$(date +%y%j%H%M)"
OUT="ios/App/output" # ignored by git
ARCHIVE="$OUT/Letterlings-$BUILD_NUMBER.xcarchive"

echo "▶ Building the web game"
npm run build
npx cap sync ios

echo "▶ Archiving build $BUILD_NUMBER"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  archive

if [ "$MODE" = upload ]; then
  echo "▶ Uploading to App Store Connect"
  xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath "$OUT/export-$BUILD_NUMBER" \
    -exportOptionsPlist ios/ExportOptions.plist -allowProvisioningUpdates
fi

echo "✔ Done: $ARCHIVE"
