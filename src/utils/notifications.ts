export const sendNotification = (title: string, options?: NotificationOptions) => {
  if (!('Notification' in window)) {
    console.error('This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
};

export const isNotificationsEnabled = () => {
  return localStorage.getItem('notificationsEnabled') === 'true' && 
         Notification.permission === 'granted';
};
