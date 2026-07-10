#!/usr/bin/env python3
"""Generate F-Droid repo index files.

- index.jar (XML format, JAR-signed with SHA1) — for old F-Droid 1.x clients
- index-v1.jar (JSON format, JAR-signed with SHA1) — for new F-Droid 2.x clients
"""

import argparse
import hashlib
import json
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

    perm_el = ET.SubElement(pkg, "permissions")
    perm_el.text = "INTERNET,ACCESS_NETWORK_STATE"

    ET.indent(root)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def build_index_json(
    apk_name: str,
    apk_size: int,
    apk_sha256: str,
    version_code: str,
    version_name: str,
    min_sdk: int,
    target_sdk: int,
    timestamp: int,
    repo_url: str,
) -> str:
    data = {
        "repo": {
            "timestamp": timestamp,
            "version": 18,
            "maxage": 7,
            "name": "Kasir App Repository",
            "icon": "icon.png",
            "address": repo_url,
            "description": "Private F-Droid repository for Kasir App - POS & Inventory Management",
            "mirrors": [],
        },
        "requests": {"install": [], "uninstall": []},
        "apps": [
            {
                "packageName": "com.kasir.app",
                "name": "Kasir App",
                "summary": "POS & Inventory Management",
                "icon": "com.kasir.app.1.png",
                "description": "Aplikasi kasir dan manajemen inventori multi-cabang dengan dukungan offline.",
                "license": "Proprietary",
                "categories": ["Business"],
                "authorName": "Kasir App Team",
                "webSite": "https://kasir-app-lake.vercel.app",
                "sourceCode": "https://github.com/invita-sin/kasir-app",
                "added": int(time.time() * 1000),
                "lastUpdated": int(time.time() * 1000),
                "suggestedVersionCode": version_code,
            }
        ],
        "packages": {
            "com.kasir.app": [
                {
                    "apkName": apk_name,
                    "hash": apk_sha256,
                    "hashType": "sha256",
                    "packageName": "com.kasir.app",
                    "size": apk_size,
                    "versionName": version_name,
                    "versionCode": int(version_code),
                    "minSdkVersion": min_sdk,
                    "targetSdkVersion": target_sdk,
                    "added": int(time.time() * 1000),
                    "uses-permission": [
                        ["android.permission.INTERNET", None],
                        ["android.permission.ACCESS_NETWORK_STATE", None],
                    ],
                }
            ]
        },
    }
    return json.dumps(data, indent=2, separators=(",", ": ")) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("apk_path", type=str)
    parser.add_argument("output_dir", type=str)
    parser.add_argument("--version-code", default="1")
    parser.add_argument("--version-name", default="1.0.0")
    parser.add_argument("--min-sdk", type=int, default=24)
    parser.add_argument("--target-sdk", type=int, default=34)
    parser.add_argument("--pubkey-hex", required=True)
    parser.add_argument("--repo-url", default="https://invita-sin.github.io/kasir-app/fdroid/repo")
    args = parser.parse_args()

    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)

    apk_data = Path(args.apk_path).read_bytes()
    apk_sha256 = hashlib.sha256(apk_data).hexdigest()
    apk_size = len(apk_data)
    timestamp = int(time.time())

    # Generate index.jar (XML format for old clients)
    xml_content = build_index_xml(
        apk_name=Path(args.apk_path).name,
        apk_size=apk_size,
        apk_sha256=apk_sha256,
        version_code=args.version_code,
        version_name=args.version_name,
        min_sdk=args.min_sdk,
        target_sdk=args.target_sdk,
        pubkey_hex=args.pubkey_hex,
        timestamp=timestamp,
        repo_url=args.repo_url,
    )
    with zipfile.ZipFile(out / "index.jar", "w", zipfile.ZIP_STORED) as zf:
        zf.writestr("index.xml", xml_content)
    print(f"Unsigned index.jar (XML): {(out / 'index.jar').stat().st_size} bytes")

    # Generate index-v1.jar (JSON format for new clients)
    json_content = build_index_json(
        apk_name=Path(args.apk_path).name,
        apk_size=apk_size,
        apk_sha256=apk_sha256,
        version_code=args.version_code,
        version_name=args.version_name,
        min_sdk=args.min_sdk,
        target_sdk=args.target_sdk,
        timestamp=timestamp,
        repo_url=args.repo_url,
    )
    with zipfile.ZipFile(out / "index-v1.jar", "w", zipfile.ZIP_STORED) as zf:
        zf.writestr("index-v1.json", json_content)
    print(f"Unsigned index-v1.jar (JSON): {(out / 'index-v1.jar').stat().st_size} bytes")

    print(f"APK SHA256: {apk_sha256}")
    print(f"APK size: {apk_size}")
    print(f"Timestamp: {timestamp}")
    print("F-Droid repo index files generated OK")


if __name__ == "__main__":
    main()
