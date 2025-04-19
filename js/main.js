// Initialize TouchHandler for mobile devices
document.addEventListener('DOMContentLoaded', function() {
    // Import and initialize the TouchHandler
    if (typeof TouchHandler !== 'undefined') {
        const touchHandler = new TouchHandler();
        touchHandler.init();
        
        // Create a global reference for other scripts
        window.touchHandler = touchHandler;
        
        // Observe DOM changes to apply touch handling to new elements
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    touchHandler.setupTouchFeedback();
                    touchHandler.optimizeTouchExperience();
                }
            });
        });
        
        // Start observing the document with the configured parameters
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Handle cleanup on page unload
        window.addEventListener('beforeunload', function() {
            touchHandler.cleanup();
            observer.disconnect();
        });
    }
}); 