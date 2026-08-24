import React from 'react';
import { 
  Home, 
  Settings, 
  FileText, 
  Calendar, 
  Clock, 
  ExternalLink, 
  Cloud, 
  ChevronRight,
  Folder,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';

interface SectionHubDashboardProps {
  post: any;
  posts: any[];
  onSelectPost: (post: any) => void;
  onGoHome: () => void;
}

interface HubItem {
  title: string;
  icon: string;
  searchKeywords?: string[];
  linkUrl?: string;
}

export function SectionHubDashboard({
  post,
  posts,
  onSelectPost,
  onGoHome
}: SectionHubDashboardProps) {
  const sectionTitle = (post.title || '').toUpperCase().trim();

  // Helper to find target post from database by keywords or title
  const findPost = (keywords: string[] | string): any => {
    const list = Array.isArray(keywords) ? keywords : [keywords];
    for (const kw of list) {
      const q = kw.toLowerCase().trim();
      
      // Look for candidates that match by numeric ID
      if (/^\d+$/.test(q)) {
        const idMatch = posts.find((p) => p.id === parseInt(q, 10));
        if (idMatch) return idMatch;
      }

      // 1. Exact matches (prioritize table posts)
      const exactMatches = posts.filter(
        (p) => (p.title || '').toLowerCase().trim() === q
      );
      if (exactMatches.length > 0) {
        const tableMatch = exactMatches.find((p) => p.content && p.content.includes('|'));
        return tableMatch || exactMatches[0];
      }

      // 2. Exact match with section prefix or suffix (e.g. "Daily Laboratorium" or "Daily")
      const sectionMatches = posts.filter((p) => {
        const t = (p.title || '').toLowerCase();
        return t === `${q} ${sectionTitle.toLowerCase()}` || t === `${sectionTitle.toLowerCase()} ${q}`;
      });
      if (sectionMatches.length > 0) {
        const tableMatch = sectionMatches.find((p) => p.content && p.content.includes('|'));
        return tableMatch || sectionMatches[0];
      }

      // 3. Match containing both keyword and section
      const bothMatches = posts.filter((p) => {
        const t = (p.title || '').toLowerCase();
        return t.includes(q) && (t.includes(sectionTitle.toLowerCase()) || sectionTitle.toLowerCase().includes(t));
      });
      if (bothMatches.length > 0) {
        const tableMatch = bothMatches.find((p) => p.content && p.content.includes('|'));
        return tableMatch || bothMatches[0];
      }

      // 4. General match
      const generalMatches = posts.filter((p) => (p.title || '').toLowerCase().includes(q));
      if (generalMatches.length > 0) {
        const tableMatch = generalMatches.find((p) => p.content && p.content.includes('|'));
        return tableMatch || generalMatches[0];
      }
    }
    return null;
  };

  const handleItemClick = (item: HubItem) => {
    if (item.linkUrl) {
      window.open(item.linkUrl, '_blank');
      return;
    }
    const target = findPost(item.searchKeywords || item.title);
    if (target) {
      onSelectPost(target);
    } else {
      // Create fallback dummy view or alert
      alert(`Halaman '${item.title}' belum memiliki data.`);
    }
  };

  // Section configurations matching Notion design
  const getSectionConfig = () => {
    if (sectionTitle.includes('ADMINISTRASI')) {
      return {
        icon: '📋',
        bannerUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine', icon: '📑', searchKeywords: ['Non Routine', '517'] },
          { title: 'Daily', icon: '📐', searchKeywords: ['Daily', '518'] },
          { title: 'Weekly', icon: '📑', searchKeywords: ['Weekly', '519'] },
          { title: 'Monthly', icon: '📑', searchKeywords: ['Monthly', '520'] },
          { title: 'Biannual', icon: '📑', searchKeywords: ['Biannual', '521'] },
          { title: 'Yearly', icon: '📑', searchKeywords: ['Yearly', '522'] },
          { title: 'Archived', icon: '📑', searchKeywords: ['Archived', '523'] },
          { title: 'PIC Job Admin', icon: '💻', searchKeywords: ['PIC Job Admin', 'Job Admin'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Karyawan Baru', icon: '💃', searchKeywords: ['Karyawan Baru', '524'] },
          { title: 'Cuti Karyawan', icon: '✈', searchKeywords: ['Cuti Karyawan', '525'] },
          { title: 'Induksi Online Karyawan Balik Cuti', icon: '📝', searchKeywords: ['Induksi Online', '526'] },
          { title: 'TES SIMPER', icon: '🚒', searchKeywords: ['TES SIMPER', 'SIMPER', '527'] },
          { title: 'Interview Kandidat', icon: '⁉', searchKeywords: ['Interview', '528'] },
          { title: 'Pengajuan PTK', icon: '➕', searchKeywords: ['Pengajuan PTK', 'PTK', '529'] },
          { title: 'Penilaian Karyawan', icon: '🎴', searchKeywords: ['Penilaian Karyawan', '530'] },
          { title: 'Meal Order', icon: '🍲', searchKeywords: ['Meal Order', '531'] },
          { title: 'Information Administrasi', icon: '📄', searchKeywords: ['Information Administrasi', '532'] },
          { title: 'Jam Kerja Karyawan', icon: '⏰', searchKeywords: ['Jam Kerja Karyawan', '533'] },
        ],
        extraLinks: [
          { title: 'Linktree Administrasi PrepLab', url: 'https://linktr.ee/Administrasi.PrepLab' }
        ]
      };
    }

    if (sectionTitle.includes('LABORATORIUM')) {
      return {
        icon: '🧪',
        bannerUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine Laboratorium', icon: '📑', searchKeywords: ['Non Routine Laboratorium', '535', 'Non Routine'] },
          { title: 'Daily Laboratorium', icon: '📐', searchKeywords: ['Daily Laboratorium', '541', 'Daily'] },
          { title: 'Weekly Laboratorium', icon: '📑', searchKeywords: ['Weekly Laboratorium', '542', 'Weekly'] },
          { title: 'Monthly Laboratorium', icon: '📑', searchKeywords: ['Monthly Laboratorium', '543', 'Monthly'] },
          { title: 'Quarterly Laboratorium', icon: '📑', searchKeywords: ['Quarterly Laboratorium', '545', 'Quarterly'] },
          { title: 'Biannual Laboratorium', icon: '📑', searchKeywords: ['Biannual Laboratorium', '564', 'Biannual'] },
          { title: 'Yearly Laboratorium', icon: '📑', searchKeywords: ['Yearly Laboratorium', '549', 'Yearly'] },
          { title: 'Arsip Laboratorium', icon: '📂', searchKeywords: ['Arsip Laboratorium', 'Arsip'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Information Laboratorium', icon: '📄', searchKeywords: ['Information Laboratorium', '576'] },
          { title: 'Standard Methods', icon: '📘', searchKeywords: ['Standard Methods'] },
          { title: 'Manual Book Instrument dan Alat', icon: '🔬', searchKeywords: ['Manual Book Instrument dan Alat', 'Manual Book'] },
          { title: 'CRM', icon: '🏷️', searchKeywords: ['CRM'] },
          { title: 'Inhouse', icon: '🏢', searchKeywords: ['Inhouse'] },
          { title: 'Data Aset', icon: '📊', searchKeywords: ['Data Aset'] },
          { title: 'Monitoring Centralized', icon: '📡', searchKeywords: ['Monitoring Centralized', 'Kawasi - Monitoring Centralized'] },
          { title: 'Agenda Laboratorium', icon: '📅', searchKeywords: ['Agenda Laboratorium'] },
        ],
        extraLinks: []
      };
    }

    if (sectionTitle.includes('PREPARASI')) {
      return {
        icon: '🪨',
        bannerUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine Preparasi', icon: '📑', searchKeywords: ['Non Routine Preparasi', '416'] },
          { title: 'Daily Preparasi', icon: '📐', searchKeywords: ['Daily Preparasi', '447'] },
          { title: 'Weekly Preparasi', icon: '📑', searchKeywords: ['Weekly Preparasi', '407'] },
          { title: 'Monthly Preparasi', icon: '📑', searchKeywords: ['Monthly Preparasi', '420'] },
          { title: 'Quarterly Preparasi', icon: '📑', searchKeywords: ['Quarterly Preparasi', '469'] },
          { title: 'Biannual Preparasi', icon: '📑', searchKeywords: ['Biannual Preparasi', '468'] },
          { title: 'Yearly Preparasi', icon: '📑', searchKeywords: ['Yearly Preparasi', '467'] },
          { title: 'Routine Preparasi', icon: '⚙️', searchKeywords: ['Routine Preparasi', '429'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Information Preparasi', icon: '📄', searchKeywords: ['Information Preparasi', '444'] },
          { title: 'Penimbangan Increment Sampel', icon: '⚖️', searchKeywords: ['Penimbangan Increment', '12'] },
          { title: 'Update PIC Kotak P3K Basah', icon: '🩹', searchKeywords: ['Kotak P3K Preparasi Basah', '13'] },
          { title: 'Update PIC Kotak P3K Kering', icon: '🩹', searchKeywords: ['Kotak P3K Preparasi Kering', '14'] },
          { title: 'Update Spill Kit Preparasi', icon: '🧰', searchKeywords: ['spill kit Preparasi', '15'] },
          { title: 'Monitoring Eye Wash (IUP)', icon: '👁️', searchKeywords: ['Eye Wash (Preparasi Basah IUP)', '17'] },
          { title: 'Monitoring Eye Wash (Logpond)', icon: '👁️', searchKeywords: ['Eye Wash (Preparasi Basah LOGPOND)', '31'] },
          { title: 'Pembagian Tugas Piket', icon: '📋', searchKeywords: ['Pembagian tugas piket Preparasi', '20'] },
        ],
        extraLinks: []
      };
    }

    if (sectionTitle.includes('QUALITY ASSURANCE')) {
      return {
        icon: '🛡️',
        bannerUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine Quality Assurance', icon: '📑', searchKeywords: ['Non Routine Quality Assurance', '406'] },
          { title: 'Daily Quality Assurance', icon: '📐', searchKeywords: ['Daily Quality Assurance', '448'] },
          { title: 'Weekly Quality Assurance', icon: '📑', searchKeywords: ['Weekly Quality Assurance', '423'] },
          { title: 'Monthly Quality Assurance', icon: '📑', searchKeywords: ['Monthly Quality Assurance', '426'] },
          { title: 'Quarterly Quality Assurance', icon: '📑', searchKeywords: ['Quarterly Quality Assurance', '439'] },
          { title: 'Biannual Quality Assurance', icon: '📑', searchKeywords: ['Biannual Quality Assurance', '472'] },
          { title: 'Yearly Quality Assurance', icon: '📑', searchKeywords: ['Yearly Quality Assurance', '438'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Information Quality Assurance', icon: '📄', searchKeywords: ['Information Quality Assurance', '445'] },
          { title: 'Pengajuan PTK QA', icon: '➕', searchKeywords: ['Pengajuan PTK', '77'] },
          { title: 'Weekly Mutu', icon: '🏆', searchKeywords: ['weekly mutu', '582'] },
          { title: 'Standard QC & QA SOP', icon: '📘', searchKeywords: ['Standard Methods'] },
        ],
        extraLinks: []
      };
    }

    if (sectionTitle.includes('MAINTENANCE')) {
      return {
        icon: '🔧',
        bannerUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine Maintenance', icon: '📑', searchKeywords: ['Non Routine Maintenance', '412'] },
          { title: 'Daily Maintenance', icon: '📐', searchKeywords: ['Daily Maintenance', '427'] },
          { title: 'Weekly Maintenance', icon: '📑', searchKeywords: ['Weekly Maintenance', '424'] },
          { title: 'Monthly Maintenance', icon: '📑', searchKeywords: ['Monthly Maintenance', '422'] },
          { title: 'Quarterly Maintenance', icon: '📑', searchKeywords: ['Quarterly Maintenance', '428'] },
          { title: 'Biannual Maintenance', icon: '📑', searchKeywords: ['Biannual Maintenance', '465'] },
          { title: 'Yearly Maintenance', icon: '📑', searchKeywords: ['Yearly Maintenance', '464'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Information Maintenance', icon: '📄', searchKeywords: ['Information Maintenance', '443'] },
          { title: 'Pembersihan AC Press Room', icon: '❄️', searchKeywords: ['Pembersihan AC', '537'] },
          { title: 'Pembangunan Workshop Maintenance', icon: '🏗️', searchKeywords: ['workshop maintenance', '107'] },
          { title: 'Monitoring PO GTS', icon: '📦', searchKeywords: ['Monitoring PO GTS', '408'] },
        ],
        extraLinks: []
      };
    }

    if (sectionTitle.includes('WAREHOUSE') || sectionTitle.includes('INVENTORY')) {
      return {
        icon: '📦',
        bannerUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine Warehouse', icon: '📑', searchKeywords: ['Non Routine Warehouse', '432'] },
          { title: 'Daily Warehouse', icon: '📐', searchKeywords: ['Daily Warehouse', '463'] },
          { title: 'Weekly Warehouse', icon: '📑', searchKeywords: ['Weekly Warehouse', '431'] },
          { title: 'Monthly Warehouse', icon: '📑', searchKeywords: ['Monthly Warehouse', '462'] },
          { title: 'Quarterly Warehouse', icon: '📑', searchKeywords: ['Quarterly Warehouse', '461'] },
          { title: 'Biannual Warehouse', icon: '📑', searchKeywords: ['Biannual Warehouse', '460'] },
          { title: 'Yearly Warehouse', icon: '📑', searchKeywords: ['Yearly Warehouse', '459'] },
          { title: 'Agenda Warehouse', icon: '📅', searchKeywords: ['Agenda Warehouse', '476'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Information Warehouse', icon: '📄', searchKeywords: ['Information Warehouse', '441'] },
          { title: 'Stock & Inventory Control', icon: '📊', searchKeywords: ['WAREHOUSE / INVENTORY CONTROL', '76'] },
          { title: 'Karyawan Baru Warehouse', icon: '💃', searchKeywords: ['Karyawan Baru', '524'] },
        ],
        extraLinks: []
      };
    }

    if (sectionTitle.includes('MANAJEMEN MUTU') || sectionTitle.includes('MUTU')) {
      return {
        icon: '🚀',
        bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine Manajemen Mutu', icon: '🔹', searchKeywords: ['Non Routine Manajemen Mutu', '585'] },
          { title: 'Daily Manajemen Mutu', icon: '🔹', searchKeywords: ['Daily Manajemen Mutu', '586'] },
          { title: 'Weekly Manajemen Mutu', icon: '🔹', searchKeywords: ['Weekly Manajemen Mutu', '587'] },
          { title: 'Monthly Manajemen Mutu', icon: '🔹', searchKeywords: ['Monthly Manajemen Mutu', '588'] },
          { title: 'Quarterly Manajemen Mutu', icon: '🔹', searchKeywords: ['Quarterly Manajemen Mutu', '589'] },
          { title: 'Biannual Manajemen Mutu', icon: '🔹', searchKeywords: ['Biannual Manajemen Mutu', '590'] },
          { title: 'Yearly Manajemen Mutu', icon: '🔹', searchKeywords: ['Yearly Manajemen Mutu', '591'] },
          { title: 'Information Manajemen Mutu', icon: '🗂️', searchKeywords: ['Information Manajemen Mutu', '592'] },
          { title: 'Monthly Report', icon: '📗', searchKeywords: ['Monthly Report', '593'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Audit ISO 45001', icon: '⏳', searchKeywords: ['Audit ISO 45001', '594'] },
          { title: 'Audit ISO 14001', icon: '⏳', searchKeywords: ['Audit ISO 14001', '595'] },
          { title: 'Rules Alat Baru', icon: '⏳', searchKeywords: ['Rules Alat Baru', '596'] },
          { title: 'Rules Kalibrasi & Uji Riksa', icon: '⏳', searchKeywords: ['Rules Kalibrasi & Uji Riksa', '597'] },
          { title: 'Rules Perizinan XRF', icon: '⏳', searchKeywords: ['Rules Perizinan XRF', '598'] },
        ],
        extraLinks: []
      };
    }

    // Default configuration for general section hubs
    return {
      icon: '📂',
      bannerUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      infoTitle: 'INFO',
      infoItems: [
        { title: 'Non Routine', icon: '📑', searchKeywords: ['Non Routine'] },
        { title: 'Daily', icon: '📐', searchKeywords: ['Daily'] },
        { title: 'Weekly', icon: '📑', searchKeywords: ['Weekly'] },
        { title: 'Monthly', icon: '📑', searchKeywords: ['Monthly'] },
        { title: 'Quarterly', icon: '📑', searchKeywords: ['Quarterly'] },
        { title: 'Biannual', icon: '📑', searchKeywords: ['Biannual'] },
        { title: 'Yearly', icon: '📑', searchKeywords: ['Yearly'] },
      ],
      rulesTitle: 'RULES',
      rulesItems: [
        { title: 'Kebijakan Perusahaan', icon: '📜', searchKeywords: ['Kebijakan Perusahaan'] },
        { title: 'Induksi Internal', icon: '🎓', searchKeywords: ['Induksi Internal'] },
        { title: 'Golden Rules', icon: '⭐', searchKeywords: ['Golden Rules'] },
        { title: 'Standard Methods', icon: '📘', searchKeywords: ['Standard Methods'] },
      ],
      extraLinks: []
    };
  };

  const config = getSectionConfig();

  return (
    <div className="w-full max-w-none space-y-6 animate-in fade-in duration-300 select-none pb-20">
      {/* Cover Banner Image (Full-Width Canvas) */}
      <div className="w-full h-48 md:h-64 lg:h-72 rounded-3xl overflow-hidden shadow-2xl border border-[#2a2a2a] relative group bg-[#151515]">
        <img
          src={post.coverImage && post.coverImage.startsWith('http') ? post.coverImage : config.bannerUrl}
          alt={sectionTitle}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = config.bannerUrl;
          }}
          className="w-full h-full object-cover object-center brightness-90 group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b1b1b] via-black/20 to-transparent opacity-80" />
      </div>

      {/* Header Info Area */}
      <div className="space-y-4 px-2">
        {/* Section Emoji / Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#242424] border border-[#333] flex items-center justify-center text-3xl shadow-xl -mt-14 relative z-10">
          {config.icon}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-black text-slate-100 tracking-tight">
          {sectionTitle}
        </h1>

        {/* Navigation Action Pill: HOME TBP & GPS */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onGoHome}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#252525] hover:bg-[#2f2f2f] text-slate-200 hover:text-teal-300 text-xs font-bold border border-[#383838] hover:border-teal-500/50 shadow-md transition-all group cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform" />
            <span>HOME TBP & GPS</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: INFO & RULES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Left Column: INFO */}
        <div className="rounded-2xl overflow-hidden border border-[#253850] bg-[#162238]/60 backdrop-blur-md shadow-xl flex flex-col">
          {/* Column Header: INFO */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-[#193252] to-[#162740] border-b border-[#2a4566] flex items-center justify-between">
            <span className="font-serif italic font-black text-xl text-[#8ec8ff] tracking-widest">
              {config.infoTitle}
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
              {config.infoItems.length} Sub-Items
            </span>
          </div>

          {/* List of Buttons */}
          <div className="p-3 space-y-1.5 flex-1">
            {config.infoItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#1b2f4a]/70 hover:bg-[#203c61] text-slate-200 hover:text-white border border-[#234269]/60 hover:border-[#4279b8] text-xs font-semibold tracking-wide transition-all group shadow-sm text-left"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="text-sm flex-shrink-0">{item.icon}</span>
                  <span className="truncate group-hover:text-blue-200">
                    {item.title}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-blue-400/50 group-hover:text-blue-300 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: RULES */}
        <div className="rounded-2xl overflow-hidden border border-[#483e1e] bg-[#292413]/60 backdrop-blur-md shadow-xl flex flex-col">
          {/* Column Header: RULES */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-[#3e3415] to-[#2d2610] border-b border-[#5c4f24] flex items-center justify-between">
            <span className="font-serif italic font-black text-xl text-[#f3d37a] tracking-widest">
              {config.rulesTitle}
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700/50">
              {config.rulesItems.length} SOP & Rules
            </span>
          </div>

          {/* List of Buttons */}
          <div className="p-3 space-y-1.5 flex-1">
            {config.rulesItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#332b16]/70 hover:bg-[#453b1e] text-slate-200 hover:text-white border border-[#4d4020]/60 hover:border-[#8f7739] text-xs font-semibold tracking-wide transition-all group shadow-sm text-left"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="text-sm flex-shrink-0">{item.icon}</span>
                  <span className="truncate group-hover:text-amber-200">
                    {item.title}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400/50 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* HARITA CORE VALUE Banner (Matches Notion page) */}
      <div className="rounded-2xl border border-emerald-800/40 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-emerald-950/40 p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-900/40 border border-emerald-600/40 text-emerald-400 text-base">
            🌟
          </div>
          <div>
            <h3 className="font-serif italic font-bold text-sm tracking-wider text-emerald-300">
              HARITA CORE VALUE
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              <strong className="text-emerald-400">H</strong>umble • <strong className="text-emerald-400">A</strong>gile • <strong className="text-emerald-400">R</strong>esilient • <strong className="text-emerald-400">I</strong>ntegrity • <strong className="text-emerald-400">T</strong>ransparency • <strong className="text-emerald-400">A</strong>ccountability
            </p>
          </div>
        </div>
      </div>

      {/* Extra Links / Bookmarks if present */}
      {config.extraLinks && config.extraLinks.length > 0 && (
        <div className="pt-2">
          <div className="p-4 rounded-xl bg-[#202020] border border-[#303030] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-700/40 text-emerald-400">
                <LinkIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {config.extraLinks[0].title}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  {config.extraLinks[0].url}
                </p>
              </div>
            </div>
            <a
              href={config.extraLinks[0].url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition-colors"
            >
              <span>Buka Tautan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
