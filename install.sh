#!/bin/bash

echo "Building and installing If End Ghost Text extension..."

# Compile TypeScript
npm run compile

# Package the extension
npx vsce package --no-dependencies --allow-missing-repository

# Find the generated .vsix file
VSIX_FILE=$(ls *.vsix | head -n 1)

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
echo "3. You should see the condition as ghost text at the closing brace"
echo ""
echo "Example test code:"
echo "if (someCondition &&"
echo "    anotherCondition) {"
echo "    console.log('test');"
echo "} // Ghost text should appear here"