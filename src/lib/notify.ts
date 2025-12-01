// src/lib/notify.ts
export function showNotification(title: string, body?: string) {
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") new Notification(title, { body });
      });
    }
  }
}

export function mockMorningNotification() {
  showNotification("☀️ Good Morning, Runner!", "Your new adaptive plan is ready in Mizzion.");
}
