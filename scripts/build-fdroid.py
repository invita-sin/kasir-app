#!/usr/bin/env python3
"""Generate F-Droid repo index (index.xml + index.jar).

Uses JAR signing (jarsigner) to match official F-Droid format.
The pubkey is a hex-encoded DER certificate, NOT a GPG key.
"""

import argparse
import hashlib
import os
import subprocess
import time
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path


def build_index_xml(
    apk_name: str,
    apk_size: int,
    apk_sha256: str,
    version_code: str,
    version_name: str,
    min_sdk: int,
    target_sdk: int,
    pubkey_hex: str,
    timestamp: int,
    repo_url: str,
) -> bytes:
    date = time.strftime("%Y-%m-%d", time.gmtime())

    root = ET.Element("fdroid")

    repo = ET.SubElement(root, "repo")
    repo.set("icon", "icon.png")
    repo.set("name", "Kasir App Repository")
    repo.set("pubkey", pubkey_hex)
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
        ("category", "Business"),
        ("license", "Proprietary"),
        ("author", "Kasir App Team"),
        ("web", "https://kasir-app-lake.vercel.app"),
        ("source", "https://github.com/invita-sin/kasir-app"),
    ]:
        el = ET.SubElement(app, tag)
        el.text = text

    pkg = ET.SubElement(app, "package")
    for tag, text in [
        ("version", version_name),
        ("versioncode", version_code),
        ("apkname", apk_name),
        ("hash", apk_sha256),
        ("size", str(apk_size)),
        ("sdkver", str(min_sdk)),
        ("targetSdkVersion", str(target_sdk)),
        ("added", date),
    ]:
        el = ET.SubElement(pkg, tag)
        el.text = text
        if tag == "hash":
            el.set("type", "sha256")

    ET.indent(root)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def get_apk_info(apk_path: str):
    apk_data = Path(apk_path).read_bytes()
    return {
        "sha256": hashlib.sha256(apk_data).hexdigest(),
        "size": len(apk_data),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("apk_path", type=str)
    parser.add_argument("output_dir", type=str)
    parser.add_argument("--version-code", default="1")
    parser.add_argument("--version-name", default="1.0.0")
    parser.add_argument("--min-sdk", type=int, default=24)
    parser.add_argument("--target-sdk", type=int, default=34)
    parser.add_argument("--pubkey-hex", required=True, help="Hex-encoded DER certificate (from keytool -exportcert)")
    parser.add_argument("--repo-url", default="https://invita-sin.github.io/kasir-app/fdroid/repo")
    args = parser.parse_args()

    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)

    apk_info = get_apk_info(args.apk_path)
    timestamp = int(time.time() * 1000)

    xml_content = build_index_xml(
        apk_name=Path(args.apk_path).name,
        apk_size=apk_info["size"],
        apk_sha256=apk_info["sha256"],
        version_code=args.version_code,
        version_name=args.version_name,
        min_sdk=args.min_sdk,
        target_sdk=args.target_sdk,
        pubkey_hex=args.pubkey_hex,
        timestamp=timestamp,
        repo_url=args.repo_url,
    )

    index_jar = out / "index.jar"
    with zipfile.ZipFile(index_jar, "w", zipfile.ZIP_STORED) as zf:
        zf.writestr("index.xml", xml_content)

    print(f"Unsigned index.jar: {index_jar.stat().st_size} bytes")
    print(f"APK SHA256: {apk_info['sha256']}")
    print(f"APK size: {apk_info['size']}")
    print(f"Timestamp: {timestamp}")
    print("Unsigned F-Droid repo index generated OK")


if __name__ == "__main__":
    main()
