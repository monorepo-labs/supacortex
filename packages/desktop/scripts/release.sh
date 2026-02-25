#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# Supacortex Desktop Release Script
# Usage: ./scripts/release.sh <version>
# Example: ./scripts/release.sh 0.2.0
# ──────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TAURI_DIR="$DESKTOP_DIR/src-tauri"

# ── Config ──────────────────────────────────────
IDENTITY="Developer ID Application: Yogesh Dhakal (7WYP3LRDL8)"
NOTARY_PROFILE="redlightgreenlight"
APP_NAME="Supacortex"
GITHUB_REPO="monorepo-labs/supacortex"
ENTITLEMENTS="$TAURI_DIR/entitlements.plist"
TARGET="aarch64-apple-darwin"

# ── Version ─────────────────────────────────────
VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>  (e.g. 0.2.0)"
  exit 1
fi

echo "=== Building Supacortex v$VERSION ==="
echo ""

# ── Pre-flight checks ───────────────────────────
if [ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" ]; then
  echo "ERROR: TAURI_SIGNING_PRIVATE_KEY is not set"
  echo "Add to ~/.zshrc: export TAURI_SIGNING_PRIVATE_KEY=\"\$(cat \$HOME/.tauri/supacortex.key)\""
  exit 1
fi

command -v gh >/dev/null 2>&1 || { echo "ERROR: gh CLI not installed"; exit 1; }
command -v xcrun >/dev/null 2>&1 || { echo "ERROR: xcrun not found (need Xcode CLI tools)"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq not installed (brew install jq)"; exit 1; }

# ── Step 1: Update version ──────────────────────
echo "[1/9] Updating version to $VERSION"
sed -i '' "s/^version = \".*\"/version = \"$VERSION\"/" "$TAURI_DIR/Cargo.toml"
tmp=$(mktemp)
jq --arg v "$VERSION" '.version = $v' "$TAURI_DIR/tauri.conf.json" > "$tmp"
mv "$tmp" "$TAURI_DIR/tauri.conf.json"

# ── Step 2: Build ────────────────────────────────
echo "[2/9] Building (target: $TARGET)"
cd "$DESKTOP_DIR"
pnpm tauri build --target "$TARGET"

BUILD_DIR="$TAURI_DIR/target/$TARGET/release/bundle"
APP_PATH="$BUILD_DIR/macos/$APP_NAME.app"
DMG_FROM_BUILD="$BUILD_DIR/dmg/${APP_NAME}_${VERSION}_aarch64.dmg"
UPDATER_TARBALL="$BUILD_DIR/macos/${APP_NAME}.app.tar.gz"
UPDATER_SIG="$BUILD_DIR/macos/${APP_NAME}.app.tar.gz.sig"

if [ ! -d "$APP_PATH" ]; then
  echo "ERROR: App not found at $APP_PATH"
  echo "Available files in bundle dir:"
  ls -R "$BUILD_DIR" 2>/dev/null || echo "(dir doesn't exist)"
  exit 1
fi

# ── Step 3: Code sign ────────────────────────────
echo "[3/9] Code signing $APP_NAME.app"
codesign --force --deep \
  --sign "$IDENTITY" \
  --options runtime \
  --timestamp \
  --entitlements "$ENTITLEMENTS" \
  "$APP_PATH"

echo "  Verifying signature..."
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

# ── Step 4: Create DMG ───────────────────────────
DMG_NAME="${APP_NAME}-${VERSION}.dmg"
DMG_PATH="/tmp/$DMG_NAME"
DMG_STAGING="/tmp/dmg_staging_$$"

echo "[4/9] Creating DMG: $DMG_NAME"
rm -rf "$DMG_STAGING"
mkdir -p "$DMG_STAGING"
cp -R "$APP_PATH" "$DMG_STAGING/"
ln -sf /Applications "$DMG_STAGING/Applications"

hdiutil create "$DMG_PATH" \
  -volname "$APP_NAME" \
  -srcfolder "$DMG_STAGING" \
  -format UDZO \
  -ov

rm -rf "$DMG_STAGING"

# ── Step 5: Sign DMG ─────────────────────────────
echo "[5/9] Signing DMG"
codesign --force \
  --sign "$IDENTITY" \
  --timestamp \
  "$DMG_PATH"

# ── Step 6: Notarize ─────────────────────────────
echo "[6/9] Notarizing (takes 2-5 minutes)..."
xcrun notarytool submit "$DMG_PATH" \
  --keychain-profile "$NOTARY_PROFILE" \
  --wait

# ── Step 7: Staple ───────────────────────────────
echo "[7/9] Stapling notarization ticket"
xcrun stapler staple "$DMG_PATH"

# ── Step 8: Generate latest.json ─────────────────
echo "[8/9] Generating latest.json"

if [ ! -f "$UPDATER_SIG" ]; then
  echo "ERROR: Updater signature not found at $UPDATER_SIG"
  echo "Ensure createUpdaterArtifacts is true in tauri.conf.json"
  echo "and TAURI_SIGNING_PRIVATE_KEY is set"
  exit 1
fi

SIGNATURE=$(cat "$UPDATER_SIG")
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TARBALL_FILENAME=$(basename "$UPDATER_TARBALL")
DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/v$VERSION/$TARBALL_FILENAME"

LATEST_JSON_PATH="/tmp/latest.json"
jq -n \
  --arg version "$VERSION" \
  --arg pub_date "$PUB_DATE" \
  --arg url "$DOWNLOAD_URL" \
  --arg signature "$SIGNATURE" \
  --arg notes "See https://github.com/$GITHUB_REPO/releases/tag/v$VERSION for release notes" \
  '{version: $version, pub_date: $pub_date, url: $url, signature: $signature, notes: $notes}' \
  > "$LATEST_JSON_PATH"

echo "  latest.json:"
cat "$LATEST_JSON_PATH"
echo ""

# ── Step 9: Create GitHub Release ────────────────
RELEASE_TAG="v$VERSION"
echo "[9/9] Creating GitHub Release: $RELEASE_TAG"

gh release create "$RELEASE_TAG" \
  --repo "$GITHUB_REPO" \
  --title "Supacortex $VERSION" \
  --notes "Desktop app release v$VERSION" \
  "$DMG_PATH" \
  "$UPDATER_TARBALL" \
  "$UPDATER_SIG" \
  "$LATEST_JSON_PATH"

echo ""
echo "=== Done! Supacortex v$VERSION released ==="
echo ""
echo "  DMG:      $DMG_PATH"
echo "  Release:  https://github.com/$GITHUB_REPO/releases/tag/$RELEASE_TAG"
echo "  Updater:  https://github.com/$GITHUB_REPO/releases/latest/download/latest.json"
echo ""
echo "Next: commit the version bump"
echo "  git add packages/desktop/src-tauri/Cargo.toml packages/desktop/src-tauri/tauri.conf.json"
echo "  git commit -m 'chore: bump desktop to v$VERSION'"
