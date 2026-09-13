self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Baralho de Reflexões', body: 'Sua reflexão de hoje chegou.' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
