import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Wind, Play, Pause, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const WeatherIcon = ({ code, className }: { code: number, className?: string }) => {
  if (code < 3) return <Sun className={`text-yellow-400 ${className}`} />;
  if (code < 50) return <Cloud className={`text-slate-300 ${className}`} />;
  return <CloudRain className={`text-blue-400 ${className}`} />;
};

interface TbpDashboardProps {
  posts: any[];
  onSelectPost: (post: any) => void;
}

export function TbpDashboard({ posts, onSelectPost }: TbpDashboardProps) {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNav = (title: string) => {
    const searchStr = title.toLowerCase().trim();
    
    // 1. Exact match
    let post = posts.find(p => p.title && p.title.trim().toLowerCase() === searchStr);
    
    // 2. Exact match with " Information " prefix (because Notion migration might have prefixed some with 'Information')
    if (!post) {
      post = posts.find(p => p.title && p.title.trim().toLowerCase() === `information ${searchStr}`);
    }

    // 3. Partial match
    if (!post) {
      post = posts.find(p => p.title && p.title.toLowerCase().includes(searchStr));
    }

    if (post) {
      onSelectPost(post);
    } else {
      alert(`Halaman '${title}' belum ditemukan.`);
    }
  };

  const sections = [
    { title: 'Information' },
    { title: 'Administrasi' },
    { title: 'Laboratorium' },
    { title: 'Preparasi' },
    { title: 'Maintenance' },
    { title: 'Inventory' },
    { title: 'Manajemen Mutu' },
    { title: 'General Issue' },
    { title: 'Prosedur' }
  ];

  const rules = [
    { title: 'Administrasi' },
    { title: 'Laboratorium' },
    { title: 'Manajemen Mutu' },
    { title: 'Preparasi' },
    { title: 'Maintenance' }
  ];

  return (
    <div className="w-full h-full bg-[#1e1e1e] overflow-y-auto text-slate-200">
      <div className="w-full h-48 md:h-64 lg:h-80 relative overflow-hidden">
        <img src="/images/dashboard/prep_lab_banner.jpg" alt="Banner" className="w-full h-full object-cover object-center brightness-75" />
      </div>

      <div className="px-6 md:px-12 py-8 w-full space-y-8">
        <h1 className="text-3xl font-black text-white tracking-wider">PT. TBP & GPS</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className="aspect-video rounded-xl overflow-hidden shadow-lg border border-slate-700/50">
              <img src={`/images/dashboard/gallery_${num}.jpg`} alt={`Gallery ${num}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#2a2a2a] rounded-lg overflow-hidden border border-[#333]">
              <div className="bg-[#1e3c2f] px-4 py-2 font-bold text-slate-100 tracking-wider">SECTION</div>
              <div className="flex flex-col">
                {sections.map((item, idx) => (
                  <button key={idx} onClick={() => handleNav(item.title)} className="flex items-center text-sm px-4 py-2 hover:bg-[#333] transition-colors border-b border-[#333] last:border-0 text-left text-slate-300">
                    <span className="mr-2 text-xs opacity-70">📄</span> {item.title.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#2a2a2a] rounded-lg overflow-hidden border border-[#333]">
              <div className="bg-[#1f3044] px-4 py-2 font-bold text-slate-100 tracking-wider">RULES</div>
              <div className="flex flex-col">
                {rules.map((item, idx) => (
                  <button key={idx} onClick={() => handleNav(`Rules ${item.title}`)} className="flex items-center text-sm px-4 py-2 hover:bg-[#333] transition-colors border-b border-[#333] last:border-0 text-left text-slate-300">
                    <span className="mr-2 text-xs opacity-70">▶</span> {item.title.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-transparent text-center pt-2 pb-6">
              <h3 className="text-sm font-semibold tracking-wider mb-6 text-slate-300 uppercase">Kawasi Weather</h3>
              <div className="flex items-center justify-center mb-6">
                <Cloud className="w-8 h-8 text-slate-400 mr-3" />
                <div className="text-left">
                  <div className="text-2xl font-bold">24°C</div>
                  <div className="text-xs text-slate-400">overcast clouds</div>
                </div>
              </div>
              <div className="flex justify-between items-center max-w-sm mx-auto text-sm">
                {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                  <div key={day} className="flex flex-col items-center">
                    <span className="mb-2 font-medium">{day}</span>
                    <WeatherIcon code={i % 3 === 0 ? 0 : 50} className="w-5 h-5 mb-2" />
                    <span className="text-xs">29°</span>
                    <span className="text-xs text-slate-500">23°</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl overflow-hidden flex flex-col items-center justify-center p-6 shadow-md">
                <div className="flex items-center gap-1 mb-2">
                  <div className="bg-slate-900 text-white font-mono text-4xl px-3 py-2 rounded-lg font-bold">{time.getHours().toString().padStart(2, '0')}</div>
                  <span className="text-slate-800 text-3xl font-bold">:</span>
                  <div className="bg-slate-900 text-white font-mono text-4xl px-3 py-2 rounded-lg font-bold">{time.getMinutes().toString().padStart(2, '0')}</div>
                  <span className="text-slate-800 text-3xl font-bold">:</span>
                  <div className="bg-slate-900 text-white font-mono text-4xl px-3 py-2 rounded-lg font-bold">{time.getSeconds().toString().padStart(2, '0')}</div>
                </div>
                <div className="text-slate-600 font-semibold tracking-wide text-sm mt-2">
                  {time.toLocaleDateString('en-US', { weekday: 'long' })} | {time.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 shadow-md">
                <div className="relative rounded-lg overflow-hidden h-32 mb-3">
                  <img src="/images/dashboard/lofi_girl.jpg" alt="Lofi" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.8)]"></div>
                </div>
                <div className="text-slate-800 text-xs font-bold mb-2 px-1">
                  {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}<br/>
                  {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="bg-teal-500/20 rounded-full px-4 py-2 flex items-center justify-between mt-1">
                  <button className="text-teal-600 hover:text-teal-800"><Pause className="w-4 h-4 fill-current" /></button>
                  <button className="text-teal-600 hover:text-teal-800"><Play className="w-4 h-4 fill-current" /></button>
                  <button className="text-teal-600 hover:text-teal-800"><RotateCcw className="w-4 h-4" /></button>
                  <div className="w-16 h-1 bg-teal-600/30 rounded-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full w-2/3 bg-teal-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
