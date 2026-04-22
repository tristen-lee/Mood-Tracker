self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : { title: 'Cairn', body: 'Check in today.' };
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/assets/cairn-logo-512px.png',
            badge: '/assets/cairn-logo-512px.png',
            tag: 'cairn-notification',
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/dashboard.html'));
});
