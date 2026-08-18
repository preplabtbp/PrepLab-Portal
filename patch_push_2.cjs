const fs = require('fs');
let code = fs.readFileSync('src/push-notifications.ts', 'utf8');

code = code.replace(/const registration = await navigator\.serviceWorker\.ready;/, `
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.log('Registering service worker manually...');
      registration = await navigator.serviceWorker.register(
        import.meta.env.DEV ? '/src/custom-sw.js' : '/custom-sw.js',
        { type: import.meta.env.DEV ? 'module' : 'classic' }
      );
    }
    
    // Wait for the service worker to be ready
    registration = await navigator.serviceWorker.ready;
`);

fs.writeFileSync('src/push-notifications.ts', code);
console.log("Patched push notifications logic");
