// Test file for If End Ghost Text extension

function testFunction() {
    const userIsLoggedIn = true;
    const hasPermission = true;
    const isExpired = false;
    const hasValidToken = true;

    // This if statement shows ghost text 
    if (userIsLoggedIn && 
        hasPermission &&
        !isExpired) {
        console.log('User can access the resource');
        performAction();
    }

    // This one too (with a longer condition)
    if (userIsLoggedIn && 
        hasPermission &&
        !isExpired &&
        hasValidToken &&
        checkAdditionalCondition()) {
        console.log('All conditions met');
    }

    // Short if statements won't show ghost text
    if (userIsLoggedIn) {
        console.log('User is logged in');
    }

    // Nested if statements
    if (userIsLoggedIn) {
        console.log('Checking permissions...');
        
        if (hasPermission &&
            !isExpired &&
            hasValidToken) {
            console.log('Access granted');
            performSecureAction();
        }
    }
}

function performAction() {
    console.log('Action performed');
}

function performSecureAction() {
    console.log('Secure action performed');
}

function checkAdditionalCondition() {
    return Math.random() > 0.5;
}