export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

interface NotifyOptions {
  tag?: string;
  body: string;
  url?: string;
}

export async function sendNotification(title: string, { body, tag, url = "/" }: NotifyOptions): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const options: NotificationOptions = {
    body,
    tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url },
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      window.location.href = url;
    };
    return true;
  } catch {
    return false;
  }
}
