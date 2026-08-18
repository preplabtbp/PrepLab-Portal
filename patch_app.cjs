const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const swListener = `
  // Listen for SW messages (push received)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    
    const playNotificationSound = () => {
      const isEnabled = localStorage.getItem('p2h_sound_enabled') !== '0';
      if (!isEnabled) return;
      
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1); // C6
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {
        console.error('Failed to play sound', e);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_RECEIVED') {
        playNotificationSound();
        // Option to refresh notifications here if needed
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);
`;

code = code.replace(
  /const \[themeMode, setThemeMode\] = useState[\s\S]*?;/,
  match => match + '\n' + swListener
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
