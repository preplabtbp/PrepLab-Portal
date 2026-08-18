import { syncRosterData } from './src/syncRoster.js';
syncRosterData().then(() => console.log('Done')).catch(console.error);
