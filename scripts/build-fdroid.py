#!/usr/bin/env python3
"""Generate F-Droid repo index (index.xml + index.jar + GPG signature)."""

import argparse
import base64
import hashlib
import os
import subprocess
import struct
import time
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path


def get_gpg_pubkey(gpg_key_name: str) -> str:
    """Export GPG public key as raw base64 (no armor)."""
    result = subprocess.run(
        ["gpg", "--export", gpg_key_name],
        capture_output=True,
    )
    if result.returncode != 0 or not result.stdout:
        raise RuntimeError(f"GPG key '{gpg_key_name}' not found")
    return base64.b64encode(result.stdout).decode()


def get_apk_sig(apk_path: str) -> str:
    """Extract APK signing certificate SHA-256 fingerprint."""
    try:
        result = subprocess.run(
            ["unzip", "-l", apk_path],
            capture_output=True, text=True,
        )
        sig_files = [l.split()[-1] for l in result.stdout.split("\n") if ".RSA" in l or ".EC" in l or ".DSA" in l]
        if not sig_files:
            return ""
        sig_data = subprocess.run(
            ["unzip", "-p", apk_path, sig_files[0]],
            capture_output=True,
        )
        if sig_data.returncode != 0:
            return ""
        cert = subprocess.run(
            ["openssl", "pkcs7", "-inform", "DER", "-print_certs"],
            input=sig_data.stdout, capture_output=True,
        )
        fp = subprocess.run(
            ["openssl", "x509", "-fingerprint", "-sha256", "-noout"],
            input=cert.stdout, capture_output=True, text=True,
        )
        if fp.returncode != 0:
            return ""
        return fp.stdout.strip().split("=")[1].replace(":", "")
    except Exception:
        return ""


def format_timestamp() -> int:
    """Current time in milliseconds since epoch."""
    return int(time.time() * 1000)


def build_index_xml(
    apk_name: str,
    apk_size: int,
    apk_sha256: str,
    apk_sig: str,
    version_code: str,
    version_name: str,
    min_sdk: int,
    target_sdk: int,
    pubkey: str,
    timestamp: int,
    repo_url: str,
) -> bytes:
    """Build index.xml content."""
    date = time.strftime("%Y-%m-%d", time.gmtime())

    root = ET.Element("fdroid")

    repo = ET.SubElement(root, "repo")
    repo.set("icon", "icon.png")
    repo.set("name", "Kasir App Repository")
    repo.set("pubkey", pubkey)
    repo.set("timestamp", str(timestamp))
    repo.set("version", "18")
    repo.set("url", repo_url)
    repo.set("maxage", "7")
    desc = ET.SubElement(repo, "description")
    desc.text = "Private F-Droid repository for Kasir App - POS & Inventory Management"

    app = ET.SubElement(root, "application")
    app.set("id", "com.kasir.app")
    for tag, text in [
        ("id", "com.kasir.app"),
        ("added", date),
        ("lastupdated", date),
        ("name", "Kasir App"),
        ("summary", "POS & Inventory Management"),
        ("icon", "com.kasir.app.1.png"),
        ("desc", "Aplikasi kasir dan manajemen inventori multi-cabang dengan dukungan offline."),
        ("categories", "Business"),
        ("license", "Proprietary"),
        ("author", "Kasir App Team"),
        ("web", "https://kasir-app-lake.vercel.app"),
        ("source", "https://github.com/invita-sin/kasir-app"),
        ("trackid", "com.kasir.app"),
    ]:
        el = ET.SubElement(app, tag)
        el.text = text

    pkg = ET.SubElement(app, "package")
    pkg.set("versioncode", version_code)
    pkg.set("versionname", version_name)
    for tag, text in [
        ("versioncode", version_code),
        ("versionname", version_name),
        ("apkname", apk_name),
        ("hash", apk_sha256),
        ("size", str(apk_size)),
        ("sdkver", str(min_sdk)),
        ("targetSdkVersion", str(target_sdk)),
        ("added", date),
        ("sig", apk_sig),
        ("permissions", "INTERNET,ACCESS_NETWORK_STATE"),
    ]:
        el = ET.SubElement(pkg, tag)
        el.text = text
        if tag == "hash":
            el.set("type", "sha256")

    ET.indent(root)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("apk_path", type=str)
    parser.add_argument("output_dir", type=str)
    parser.add_argument("--version-code", default="1")
    parser.add_argument("--version-name", default="1.0.0")
    parser.add_argument("--min-sdk", type=int, default=24)
    parser.add_argument("--target-sdk", type=int, default=34)
    parser.add_argument("--gpg-key", default="Kasir App")
    parser.add_argument("--repo-url", default="https://invita-sin.github.io/kasir-app/fdroid/repo")
    args = parser.parse_args()

    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)

    apk_path = Path(args.apk_path)
    apk_data = apk_path.read_bytes()

    apk_sig = get_apk_sig(str(apk_path))
    apk_sha256 = hashlib.sha256(apk_data).hexdigest()
    pubkey = get_gpg_pubkey(args.gpg_key)
    timestamp = format_timestamp()

    xml_content = build_index_xml(
        apk_name=apk_path.name,
        apk_size=len(apk_data),
        apk_sha256=apk_sha256,
        apk_sig=apk_sig,
        version_code=args.version_code,
        version_name=args.version_name,
        min_sdk=args.min_sdk,
        target_sdk=args.target_sdk,
        pubkey=pubkey,
        timestamp=timestamp,
        repo_url=args.repo_url,
    )

    index_jar = out / "index.jar"
    with zipfile.ZipFile(index_jar, "w", zipfile.ZIP_STORED) as zf:
        zf.writestr("index.xml", xml_content)

    subprocess.run(
        ["gpg", "--batch", "--yes", "--detach-sign",
         "--output", str(out / "index.jar.sig"),
         str(index_jar)],
        check=True,
        env={**os.environ, "GPG_TTY": "/dev/null"},
    )

    print(f"index.jar: {index_jar.stat().st_size} bytes")
    print(f"index.jar.sig: {(out / 'index.jar.sig').stat().st_size} bytes")
    print(f"APK SHA256: {apk_sha256}")
    print(f"APK SIG: {apk_sig}")
    print(f"Timestamp: {timestamp}")
    print("F-Droid repo generated OK")


if __name__ == "__main__":
    main()
