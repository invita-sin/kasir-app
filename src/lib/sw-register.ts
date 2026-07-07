export function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(
      (reg) => {
        reg.onupdatefound = () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.onstatechange = () => {
            if (installing.state === "activated") {
              if (navigator.serviceWorker.controller) {
                window.location.reload();
              }
            }
          };
        };
      },
      () => {
        // silently fail
      }
    );
  });
}
