#!/usr/bin/env python3
"""
Fix Playwright HTML report file ordering.

The Playwright HTML reporter displays test files in an unpredictable order.
This script post-processes the report to sort files alphabetically.

Usage:
    python scripts/fix-report-order.py reports/bridge/index.html
"""

import base64
import io
import json
import re
import sys
import zipfile


def fix_report_order(html_path: str) -> bool:
    """Fix the file ordering in a Playwright HTML report."""

    print(f"Processing: {html_path}")

    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the embedded base64 zip data (starts with UEsD which is PK in base64)
    # The data is at the end of the file in a script tag
    zip_pattern = r'(UEsD[A-Za-z0-9+/=]+)'
    match = re.search(zip_pattern, content)

    if not match:
        print("Error: Could not find embedded report data")
        return False

    original_b64 = match.group(1)

    # Decode and extract
    try:
        # Ensure proper padding
        padded = original_b64
        padding = 4 - len(padded) % 4
        if padding != 4:
            padded += '=' * padding

        decoded = base64.b64decode(padded)

        if decoded[:2] != b'PK':
            print("Error: Decoded data is not a valid zip file")
            return False
    except Exception as e:
        print(f"Error decoding base64: {e}")
        return False

    # Read the zip and modify report.json
    try:
        input_zip = zipfile.ZipFile(io.BytesIO(decoded))
        output_buffer = io.BytesIO()

        with zipfile.ZipFile(output_buffer, 'w', zipfile.ZIP_DEFLATED) as output_zip:
            for item in input_zip.namelist():
                data = input_zip.read(item)

                if item == 'report.json':
                    # Parse, sort, and re-serialize
                    report = json.loads(data.decode('utf-8'))

                    original_order = [f.get('fileName', '') for f in report.get('files', [])]

                    # Sort files alphabetically by fileName
                    if 'files' in report:
                        report['files'].sort(key=lambda x: x.get('fileName', ''))

                    new_order = [f.get('fileName', '') for f in report.get('files', [])]

                    if original_order != new_order:
                        print(f"Reordered {len(report.get('files', []))} files alphabetically")
                    else:
                        print("Files were already in correct order")

                    data = json.dumps(report, separators=(',', ':')).encode('utf-8')

                output_zip.writestr(item, data)

        input_zip.close()

        # Encode back to base64
        new_b64 = base64.b64encode(output_buffer.getvalue()).decode('ascii')

        # Remove padding for consistency with original format
        new_b64 = new_b64.rstrip('=')

        # Replace in content
        new_content = content.replace(original_b64, new_b64)

        # Write back
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"Successfully updated: {html_path}")
        return True

    except Exception as e:
        print(f"Error processing zip: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python fix-report-order.py <report.html>")
        print("Example: python fix-report-order.py reports/bridge/index.html")
        sys.exit(1)

    html_path = sys.argv[1]

    if not fix_report_order(html_path):
        sys.exit(1)


if __name__ == '__main__':
    main()
