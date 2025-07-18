// Test file for marker update behavior
// This file tests that markers properly appear and disappear

function testGhostTextUpdate() {
    const condition = true;
    
    // Step 1: Start with a multi-line if statement (should show marker)
    if (condition && 
        someOtherCondition &&
        yetAnotherCondition) {
        console.log('This should show ghost text');
    }
    
    // Step 2: Edit the above to be single line:
    // if (condition) {
    //     console.log('This should NOT show marker');
    // }
    
    // Step 3: Then expand it again:
    // if (condition && 
    //     someOtherCondition &&
    //     yetAnotherCondition) {
    //     console.log('Marker should reappear');
    // }
}

// Another test case
function testRapidEditing() {
    // Rapidly type and delete to test debouncing
    if (true &&
        false &&
        maybe) {
        // Marker should update smoothly
    }
}