export default function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log('[SW] Registered successfully');

          // Check for updates every 60 seconds
          setInterval(() => {
            registration.update();
          }, 60000);

          // Handle updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New service worker available, reload to get fresh content
                console.log('[SW] New version available, reloading...');
                window.location.reload();
              }
            });
          });
        })
        .catch((err) => console.warn("SW registration failed:", err));

      // Handle controller change (when new SW takes over)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log('[SW] Controller changed, reloading...');
        window.location.reload();
      });
    });
  }
}
