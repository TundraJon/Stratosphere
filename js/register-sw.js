    // Offline cache -- registers sw.js (see sw.js for the caching strategy).
    // Wrapped so that an unsupported or failed registration changes nothing
    // about the app.
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const wasControlled = !!navigator.serviceWorker.controller;
            navigator.serviceWorker.register('sw.js')
                .then(() => navigator.serviceWorker.ready)
                .then((reg) => {
                    // First visit: this page finished loading before the worker
                    // was active, so none of its files passed through it. Hand
                    // it the list of what loaded so it can save them now.
                    if (!wasControlled && reg.active) {
                        const urls = [location.origin + location.pathname].concat(
                            performance.getEntriesByType('resource')
                                .map((e) => e.name)
                                .filter((n) => n.indexOf(location.origin) === 0)
                        );
                        reg.active.postMessage({ type: 'cache-urls', urls: urls });
                    }
                })
                .catch(() => {});
        });
    }
