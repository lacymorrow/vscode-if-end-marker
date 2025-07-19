#!/bin/bash

echo "Building and installing If End Marker extension..."

# Compile TypeScript
npm run compile

# Package the extension
npx vsce package --no-dependencies --allow-missing-repository

# Find the generated .vsix file with highest version
VSIX_FILE=$(ls *.vsix | sort -V | tail -n 1)

if [ -z "$VSIX_FILE" ]; then
    echo "Error: No .vsix file found!"
    exit 1
fi

echo "Installing $VSIX_FILE..."

# Install the extension
cursor --install-extension "$VSIX_FILE"
 
echo "Installation complete! Restart VS Code to activate the extension."
echo ""
echo "To test the extension:"
echo "1. Open a JavaScript or TypeScript file"
echo "2. Write an if statement that spans multiple lines"
echo "3. You should see the condition as a marker at the closing brace"
echo ""
echo "Example test code:"
echo "if (someCondition &&"
echo "    anotherCondition) {"
echo "    console.log('test');"
echo "} // Marker should appear here"