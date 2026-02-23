#!/bin/bash

# Build script for VU Education Lab AI Assistant Chrome Extension
# Creates a clean ZIP file ready for Chrome Web Store upload

set -e

# Configuration
EXTENSION_NAME="vu-education-lab-ai-assistant"
VERSION=$(grep '"version"' manifest.json | sed -E 's/.*"version": "([^"]+)".*/\1/')
OUTPUT_DIR="dist"
ZIP_NAME="${EXTENSION_NAME}-v${VERSION}.zip"

echo "🔧 Building VU Education Lab AI Assistant v${VERSION}"
echo "=================================================="

# Create dist directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Remove old build if exists
if [ -f "$OUTPUT_DIR/$ZIP_NAME" ]; then
    rm "$OUTPUT_DIR/$ZIP_NAME"
    echo "🗑️  Removed old build"
fi

# Create the ZIP file, excluding development files
echo "📦 Creating extension package..."

zip -r "$OUTPUT_DIR/$ZIP_NAME" . \
    -x "*.git*" \
    -x "*.DS_Store" \
    -x "Thumbs.db" \
    -x "*.zip" \
    -x "dist/*" \
    -x "build.sh" \
    -x "*.pem" \
    -x "*.crx" \
    -x "node_modules/*" \
    -x ".vscode/*" \
    -x ".idea/*" \
    -x ".claude/*" \
    -x "*.swp" \
    -x "*.swo" \
    -x "docs/*" \
    -x "images/icons/*" \
    -x "README.md" \
    -x "PRIVACY_POLICY.md"

echo ""
echo "✅ Build complete!"
echo "📁 Output: $OUTPUT_DIR/$ZIP_NAME"
echo ""

# Show file size
FILE_SIZE=$(du -h "$OUTPUT_DIR/$ZIP_NAME" | cut -f1)
echo "📊 Package size: $FILE_SIZE"

# List contents of ZIP for verification
echo ""
echo "📋 Package contents:"
unzip -l "$OUTPUT_DIR/$ZIP_NAME"

echo ""
echo "🚀 Ready to upload to Chrome Web Store!"
echo ""
echo "Next steps:"
echo "1. Go to https://chrome.google.com/webstore/devconsole"
echo "2. Click 'Upload new version' or create a new item"
echo "3. Upload the file: $OUTPUT_DIR/$ZIP_NAME"
echo "4. Fill in the store listing details"
echo "5. Submit for review"
