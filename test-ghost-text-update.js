// Test file for ghost text update behavior
// This file tests that ghost text properly appears and disappears

function testGhostTextUpdate() {
    const condition = true;
    
    // Step 1: Start with a multi-line if statement (should show ghost text)
    if (condition && 
        someOtherCondition &&
        yetAnotherCondition) {
        console.log('This should show ghost text');
    }
    
    // Step 2: Edit the above to be single line:
    // if (condition) {
    //     console.log('This should NOT show ghost text');
    // }
    
    // Step 3: Then expand it again:
    // if (condition && 
    //     someOtherCondition &&
    //     yetAnotherCondition) {
    //     console.log('Ghost text should reappear');
    // }
}

// Another test case
function testRapidEditing() {
    // Rapidly type and delete to test debouncing
    if (true &&
        false &&
        maybe) {
        // Ghost text should update smoothly
    }
}