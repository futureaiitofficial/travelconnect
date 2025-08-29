/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 */

// Polyfill for MutationObserver to handle null targets
(function() {
  const originalObserve = MutationObserver.prototype.observe;
  MutationObserver.prototype.observe = function(target, options) {
    if (!target) {
      console.warn('MutationObserver: Attempt to observe a null or undefined target');
      return;
    }
    return originalObserve.call(this, target, options);
  };
})();
