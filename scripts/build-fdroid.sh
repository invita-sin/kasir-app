#!/bin/bash
set -euo pipefail

APK_PATH="${1:?Usage: build-fdroid.sh <apk-path> [output-dir]}"
OUTPUT_DIR="$(realpath "${2:-public/fdroid/repo}")"
mkdir -p "$OUTPUT_DIR"

APK_FILE=$(basename "$APK_PATH")
cp "$APK_PATH" "$OUTPUT_DIR/$APK_FILE"

APK_SIZE=$(stat -c%s "$APK_PATH")
APK_SHA256=$(sha256sum "$APK_PATH" | cut -d' ' -f1)

VERSION_CODE="${3:-1}"
VERSION_NAME="${4:-1.0.0}"
MIN_SDK="${5:-24}"
TARGET_SDK="${6:-34}"

# Extract APK signing certificate SHA-256 fingerprint
APK_SIG=""
KEY_PASSWORD="${KEY_PASSWORD:-kasir123456}"
KEY_FILE="android/kasir-app.keystore"
if [ -f "$KEY_FILE" ] && command -v keytool &>/dev/null; then
  APK_SIG=$(keytool -exportcert -alias kasir-app -keystore "$KEY_FILE" -storepass "$KEY_PASSWORD" 2>/dev/null | openssl x509 -fingerprint -sha256 -noout 2>/dev/null | cut -d= -f2 | tr -d ':') || true
fi

# Export raw public key (base64-encoded binary, no armor)
RAW_PUBKEY=$(gpg --export "Kasir App" 2>/dev/null | base64 -w0)
if [ -z "$RAW_PUBKEY" ]; then
  echo "WARNING: GPG key not found. Trying to list keys..."
  gpg --list-keys || true
fi

# Generate index.xml
TIMESTAMP=$(date -u +%s)000
DATE=$(date -u +%Y-%m-%d)

cat > /tmp/index.xml << EOF
<?xml version="1.0" encoding="utf-8"?>
<fdroid>
  <repo icon="icon.png"
        name="Kasir App Repository"
        pubkey="$RAW_PUBKEY"
        timestamp="$TIMESTAMP"
        version="18">
    <description>Private F-Droid repository for Kasir App - POS &amp; Inventory Management</description>
  </repo>
  <application id="com.kasir.app">
    <id>com.kasir.app</id>
    <added>$DATE</added>
    <lastupdated>$DATE</lastupdated>
    <name>Kasir App</name>
    <summary>POS &amp; Inventory Management</summary>
    <desc>Aplikasi kasir dan manajemen inventori multi-cabang dengan dukungan offline.</desc>
    <categories>Business</categories>
    <license>Proprietary</license>
    <author>Kasir App Team</author>
    <web>https://kasir-app-lake.vercel.app</web>
    <source>https://github.com/invita-sin/kasir-app</source>
    <trackid>com.kasir.app</trackid>
  </application>
  <package versioncode="$VERSION_CODE" versionname="$VERSION_NAME">
    <versioncode>$VERSION_CODE</versioncode>
    <versionname>$VERSION_NAME</versionname>
    <apkname>$APK_FILE</apkname>
    <hash type="sha256">$APK_SHA256</hash>
    <size>$APK_SIZE</size>
    <sdkver>$MIN_SDK</sdkver>
    <targetSdkVersion>$TARGET_SDK</targetSdkVersion>
    <added>$DATE</added>
    <sig>$APK_SIG</sig>
    <permissions>INTERNET,ACCESS_NETWORK_STATE</permissions>
  </package>
</fdroid>
EOF

# Create index.jar (zip containing index.xml)
cd /tmp
zip -0 -q "$OUTPUT_DIR/index.jar" index.xml

# GPG sign index.jar (binary detached signature)
gpg --batch --yes --detach-sign --output "$OUTPUT_DIR/index.jar.sig" "$OUTPUT_DIR/index.jar"

# Generate index.html
cat > "$OUTPUT_DIR/index.html" << EOF
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Kasir App F-Droid Repo</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:sans-serif;max-width:600px;margin:auto;padding:20px}
a{color:#2563eb}pre{background:#f5f5f5;padding:10px;overflow-x:auto}</style>
</head>
<body>
<h2>Kasir App F-Droid Repo</h2>
<p>Tambah repo ini di aplikasi F-Droid:</p>
<pre><code>https://invita-sin.github.io/kasir-app/fdroid/repo/</code></pre>
<h3>Fingerprint GPG</h3>
<pre><code>2789C1B3892C4DBE1DFBFE1E9DA5A61B69C87CB2</code></pre>
<hr>
<h3>APK</h3>
<ul>
<li><a href="$APK_FILE">$APK_FILE</a></li>
</ul>
<hr>
<small>Repo updated: $(date -u)</small>
</body>
</html>
EOF

rm -f /tmp/index.xml
echo "F-Droid repo generated at: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR/"
