#!/usr/bin/env python3
"""Generate F-Droid V1 repo index (index-v1.jar with index-v1.json).

JSON format matching IndexV1 data model (Kotlin kotlinx.serialization).
JAR-signed with jarsigner.
"""

import argparse
import hashlib
import json
import time
import zipfile
from pathlib import Path


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
    pubkey_hex: str,
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
        "requests": {
            "install": [],
            "uninstall": [],
        },
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
                    "sig": "",
                    "uses-permission": [
                        ["INTERNET"],
                        ["ACCESS_NETWORK_STATE"],
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
        pubkey_hex=args.pubkey_hex,
    )

    index_jar = out / "index-v1.jar"
    with zipfile.ZipFile(index_jar, "w", zipfile.ZIP_STORED) as zf:
        zf.writestr("index-v1.json", json_content)

    print(f"Unsigned index-v1.jar: {index_jar.stat().st_size} bytes")
    print(f"APK SHA256: {apk_sha256}")
    print(f"APK size: {apk_size}")
    print(f"Timestamp: {timestamp}")
    print("Unsigned F-Droid V1 repo index generated OK")


if __name__ == "__main__":
    main()
