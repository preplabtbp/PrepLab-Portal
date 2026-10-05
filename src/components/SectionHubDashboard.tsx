import React, { useState, useMemo } from 'react';
import { 
  Home, 
  Calendar, 
  ExternalLink, 
  ChevronRight,
  ChevronLeft,
  Link as LinkIcon,
  CheckCircle2,
  MessageSquare,
  CalendarDays,
  Clock,
  MapPin
} from 'lucide-react';

interface SectionHubDashboardProps {
  post: any;
  posts: any[];
  activePt?: string;
  onSelectPost: (post: any) => void;
  onGoHome: () => void;
  agendaEvents?: any[];
  onOpenCalendar?: () => void;
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
  activePt,
  onSelectPost,
  onGoHome,
  agendaEvents = [],
  onOpenCalendar
}: SectionHubDashboardProps) {
  const sectionTitle = (post?.title || '').toUpperCase().trim();

  // Strict PT universe isolation: GTS vs TBP/GPS
  const currentUniverse = (activePt === 'GTS' || post?.pt === 'GTS') ? 'GTS' : 'TBP';
  const eligiblePosts = posts.filter(p => {
    const pUniverse = p.pt === 'GTS' ? 'GTS' : 'TBP';
    return pUniverse === currentUniverse;
  });

  // Calendar State for Section Agenda
  const [currentCalDate, setCurrentCalDate] = useState(() => new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dateStr: string; events: any[] } | null>(null);

  // Helper to find target post from database by keywords or title
  const findPost = (keywords: string[] | string): any => {
    const rawList = Array.isArray(keywords) ? keywords : [keywords];
    const expandedList: string[] = [];
    
    rawList.forEach(k => {
      expandedList.push(k);
      const kLower = k.toLowerCase();
      if (kLower.includes('warehouse')) {
        expandedList.push(k.replace(/warehouse/gi, 'Inventory'));
      }
      if (kLower.includes('inventory')) {
        expandedList.push(k.replace(/inventory/gi, 'Warehouse'));
      }
    });

    for (const kw of expandedList) {
      const q = kw.toLowerCase().trim();
      
      // Look for candidates that match by numeric ID strictly in the same PT universe
      if (/^\d+$/.test(q)) {
        const idMatch = eligiblePosts.find((p) => p.id === parseInt(q, 10));
        if (idMatch) return idMatch;
      }

      // 1. Exact matches (cleaned title)
      const exactMatches = eligiblePosts.filter(
        (p) => (p.title || '').replace(/^[#\s\-*]+/, '').toLowerCase().trim() === q
      );
      if (exactMatches.length > 0) {
        const tableMatch = exactMatches.find((p) => p.content && p.content.includes('|'));
        return tableMatch || exactMatches[0];
      }

      // 2. Exact match with section prefix or suffix (e.g. "Daily Laboratorium" or "Daily")
      const sectionMatches = eligiblePosts.filter((p) => {
        const t = (p.title || '').replace(/^[#\s\-*]+/, '').toLowerCase().trim();
        return t === `${q} ${sectionTitle.toLowerCase()}` || t === `${sectionTitle.toLowerCase()} ${q}`;
      });
      if (sectionMatches.length > 0) {
        const tableMatch = sectionMatches.find((p) => p.content && p.content.includes('|'));
        return tableMatch || sectionMatches[0];
      }

      // 3. Match containing both keyword and section
      const bothMatches = eligiblePosts.filter((p) => {
        const t = (p.title || '').replace(/^[#\s\-*]+/, '').toLowerCase().trim();
        return t.includes(q) && (t.includes(sectionTitle.toLowerCase()) || sectionTitle.toLowerCase().includes(t));
      });
      if (bothMatches.length > 0) {
        const tableMatch = bothMatches.find((p) => p.content && p.content.includes('|'));
        return tableMatch || bothMatches[0];
      }

      // 4. General match within same PT
      const generalMatches = eligiblePosts.filter((p) => (p.title || '').replace(/^[#\s\-*]+/, '').toLowerCase().trim().includes(q));
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
      const fallbackPost = {
        id: `doc-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: item.title,
        department: 'Prep & Lab',
        category: sectionTitle,
        content: `### ${item.title}\n\n*Halaman dokumentasi untuk ${item.title} (${sectionTitle}).*\n\nSilakan klik tombol **Edit Dokumen** di kanan atas untuk mulai menulis dokumen ini.`,
        pt: currentUniverse
      };
      onSelectPost(fallbackPost);
    }
  };

  // Section configurations matching exact Notion designs from Screenshots
  const getSectionConfig = () => {
    // 1. PROSEDUR (Image 1) - Single Column INFO with 9 items
    if (sectionTitle.includes('PROSEDUR') || sectionTitle === 'SOP') {
      return {
        icon: '📙',
        bannerUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'SOP Preparasi', icon: '📐', searchKeywords: ['SOP Preparasi', 'Preparasi Basah', 'Preparasi Kering'] },
          { title: 'JSA', icon: '💼', searchKeywords: ['JSA', 'Job Safety Analysis'] },
          { title: 'SOP Laboratorium', icon: '💈', searchKeywords: ['SOP Laboratorium', 'ED-XRF', 'LOI', 'Fused Bead'] },
          { title: 'SOP Smelter', icon: '🌐', searchKeywords: ['SOP Smelter', 'HJF', 'KPS'] },
          { title: 'SOP Lainnya', icon: '🔗', searchKeywords: ['SOP Lainnya', 'SOP Lain'] },
          { title: 'IK Preparasi', icon: '📐', searchKeywords: ['IK Preparasi', 'Jaw Crusher', 'Pulverizer', 'Oven'] },
          { title: 'IK Laboratorium', icon: '💈', searchKeywords: ['IK Laboratorium', 'Zetium', 'Epsilon', 'Muffle'] },
          { title: 'Flow Chart', icon: '🔀', searchKeywords: ['Flow Chart', 'Flow Sheet'] },
          { title: 'Guidance', icon: '</>', searchKeywords: ['Guidance', 'Panduan'] },
        ],
        rulesTitle: '',
        rulesItems: [],
        showAgenda: false,
        extraLinks: []
      };
    }

    // 2. INFORMATION (Image 2) - Single Column INFO with complete Notion items
    if (sectionTitle === 'INFORMATION' || sectionTitle.includes('INFORMASI')) {
      return {
        icon: '📘',
        bannerUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'INFORMATION', icon: '📜', searchKeywords: ['Information', 'Pengumuman'] },
          { title: 'INFORMASI IT', icon: '💻', searchKeywords: ['Informasi IT', 'IT'] },
          { title: 'HARITA CORE', icon: '💎', searchKeywords: ['Harita Core', 'Core'] },
          { title: 'QR CODE', icon: '📱', searchKeywords: ['QR Code'] },
          { title: 'GOLDEN RULES', icon: '👷', searchKeywords: ['Golden Rules'] },
          { title: 'PROMOSI K3', icon: '⚠️', searchKeywords: ['Promosi K3', 'K3'] },
          { title: 'PROMOSI TRAINER', icon: '👨‍🏫', searchKeywords: ['Promosi Trainer', 'Trainer'] },
          { title: 'PROMOSI HEALTH', icon: '🏥', searchKeywords: ['Promosi Health', 'Health'] },
          { title: 'MATERI BRIEFING (SAFETY TALK)', icon: '📢', searchKeywords: ['Materi Briefing', 'Safety Talk'] },
          { title: 'SAFETY FLASH & ALERT', icon: '🚨', searchKeywords: ['Safety Flash', 'Safety Alert'] },
          { title: 'ENVORMASI COMIC', icon: '🌍', searchKeywords: ['Envormasi Comic', 'Comic'] },
          { title: 'STANDARD METHODS', icon: '📑', searchKeywords: ['Standard Methods', 'SNI'] },
          { title: 'MANUAL BOOK INSTRUMENT DAN ALAT', icon: '📘', searchKeywords: ['Manual Book', 'Instrument'] },
          { title: 'CRM', icon: '⚠️', searchKeywords: ['CRM'] },
          { title: 'INHOUSE', icon: '🏢', searchKeywords: ['Inhouse'] },
          { title: 'SPDK DAN ATURAN PERUSAHAAN', icon: '⚖️', searchKeywords: ['SPDK', 'Aturan Perusahaan'] },
          { title: 'JOB DESCRIPTION', icon: '📋', searchKeywords: ['Job Description', 'Jobdesk'] },
          { title: 'JOB PENDING', icon: '⏳', searchKeywords: ['Job Pending', 'Pending'] },
          { title: 'IM IT', icon: '📗', searchKeywords: ['IM IT', 'Internal Memo IT'] },
          { title: 'IM HR', icon: '📕', searchKeywords: ['IM HR', 'Internal Memo HR'] },
          { title: 'IM SAFETY', icon: '📘', searchKeywords: ['IM Safety', 'Internal Memo Safety'] },
          { title: 'EM QC', icon: '📙', searchKeywords: ['EM QC', 'Edaran Mutu'] },
          { title: 'KEBIJAKAN PERUSAHAAN', icon: '🏛️', searchKeywords: ['Kebijakan Perusahaan'] },
          { title: 'INDUKSI INTERNAL', icon: '🎓', searchKeywords: ['Induksi Internal'] },
          { title: 'TRAINING NEED ANALYSIS (TNA)', icon: '📈', searchKeywords: ['TNA', 'Training Need Analysis'] },
          { title: 'IDENTIFIKASI BAHAYA DAN PENGENDALIAN RESIKO (IBPR)', icon: '❗', searchKeywords: ['IBPR', 'Identifikasi Bahaya'] },
          { title: 'IDENTIFIKASI ,EVALUASI ASPEK DAN DAMPAK LINGKUNGAN (IADL)', icon: '❄️', searchKeywords: ['IADL', 'Aspek dan Dampak Lingkungan'] },
          { title: 'SECURITY RISK ASSESMENT (SRA)', icon: '🔒', searchKeywords: ['SRA', 'Security Risk Assesment'] },
          { title: 'HASIL MEETING INTERNAL PREP & LAB', icon: '👥', searchKeywords: ['Hasil Meeting Internal', 'Meeting'] },
        ],
        rulesTitle: '',
        rulesItems: [],
        showAgenda: false,
        extraLinks: []
      };
    }

    // 3. LABORATORIUM (Image 3) - 2 Columns: Soft Blue INFO + Soft Cream RULES + Agenda
    if (sectionTitle.includes('LABORATORIUM')) {
      return {
        icon: '🥼',
        bannerUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine Laboratorium', icon: '▌', searchKeywords: ['Non Routine Laboratorium', '535', 'Non Routine'] },
          { title: 'Routine Laboratorium (Tentative)', icon: '▌', searchKeywords: ['Routine Laboratorium', 'Daily Laboratorium', '541'] },
          { title: 'Weekly Laboratorium', icon: '▌', searchKeywords: ['Weekly Laboratorium', '542'] },
          { title: 'Monthly Laboratorium', icon: '▌', searchKeywords: ['Monthly Laboratorium', '543'] },
          { title: 'Quarterly Laboratorium', icon: '▌', searchKeywords: ['Quarterly Laboratorium', '545'] },
          { title: 'Yearly Laboratorium', icon: '▌', searchKeywords: ['Yearly Laboratorium', '549'] },
          { title: 'Biannual Laboratorium', icon: '▌', searchKeywords: ['Biannual Laboratorium', '564'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Kedatangan Visitor/Vendor', icon: '✈️', searchKeywords: ['Kedatangan Visitor/Vendor', 'Visitor', 'Vendor'] },
          { title: 'Sampel Check Assay (CA)', icon: '📝', searchKeywords: ['Sampel Check Assay', 'CA', 'Check Assay'] },
          { title: 'Pengiriman TLD Badge ke BRIN', icon: '📋', searchKeywords: ['Pengiriman TLD Badge ke BRIN', 'TLD Badge BRIN', 'BRIN'] },
          { title: 'Pengiriman TLD Badge ke Gamaxindo', icon: '📋', searchKeywords: ['Pengiriman TLD Badge ke Gamaxindo', 'Gamaxindo'] },
          { title: 'Pengiriman Surveymeter & Pendose', icon: '🖊️', searchKeywords: ['Pengiriman Surveymeter & Pendose', 'Surveymeter', 'Pendose'] },
          { title: 'Penghapusan data Asset', icon: '🗑️', searchKeywords: ['Penghapusan data Asset', 'Data Asset', 'Asset'] },
          { title: 'Information Laboratorium', icon: '📦', searchKeywords: ['Information Laboratorium', '576'] },
        ],
        showAgenda: true,
        extraLinks: []
      };
    }

    // 4. ADMINISTRASI
    if (sectionTitle.includes('ADMINISTRASI')) {
      return {
        icon: '📋',
        bannerUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine', icon: '▌', searchKeywords: ['Non Routine', '517'] },
          { title: 'Daily', icon: '▌', searchKeywords: ['Daily', '518'] },
          { title: 'Weekly', icon: '▌', searchKeywords: ['Weekly', '519'] },
          { title: 'Monthly', icon: '▌', searchKeywords: ['Monthly', '520'] },
          { title: 'Biannual', icon: '▌', searchKeywords: ['Biannual', '521'] },
          { title: 'Yearly', icon: '▌', searchKeywords: ['Yearly', '522'] },
          { title: 'Archived', icon: '▌', searchKeywords: ['Archived', '523'] },
          { title: 'PIC Job Admin', icon: '▌', searchKeywords: ['PIC Job Admin', 'Job Admin'] },
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
        showAgenda: true,
        extraLinks: [
          { title: 'Linktree Administrasi PrepLab', url: 'https://linktr.ee/Administrasi.PrepLab' }
        ]
      };
    }

    // 5. PREPARASI
    if (sectionTitle.includes('PREPARASI')) {
      return {
        icon: '🪨',
        bannerUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine Preparasi', icon: '▌', searchKeywords: ['Non Routine Preparasi', '636'] },
          { title: 'Daily Preparasi', icon: '▌', searchKeywords: ['Daily Preparasi', '637'] },
          { title: 'Weekly Preparasi', icon: '▌', searchKeywords: ['Weekly Preparasi', '638'] },
          { title: 'Monthly Preparasi', icon: '▌', searchKeywords: ['Monthly Preparasi', '639'] },
          { title: 'Quarterly Preparasi', icon: '▌', searchKeywords: ['Quarterly Preparasi', '640'] },
          { title: 'Biannual Preparasi', icon: '▌', searchKeywords: ['Biannual Preparasi', '641'] },
          { title: 'Yearly Preparasi', icon: '▌', searchKeywords: ['Yearly Preparasi', '642'] },
          { title: 'Archived', icon: '▌', searchKeywords: ['Archived Preparasi', '634', 'Archived'] },
          { title: 'Information Preparasi', icon: '▌', searchKeywords: ['Information Preparasi', '643'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Pengangkutan Remainder', icon: '🚜', searchKeywords: ['PENGANGKUTAN REMAINDER', '632'] },
          { title: 'Pengerjaan Batuan/Boulder (LIM/SAP/BLEND)', icon: '🪨', searchKeywords: ['PENGERJAAN BATUAN', 'Boulder', '633'] },
        ],
        showAgenda: true,
        extraLinks: []
      };
    }

    // 6. QUALITY ASSURANCE
    if (sectionTitle.includes('QUALITY ASSURANCE') || sectionTitle === 'QA') {
      return {
        icon: '🛡️',
        bannerUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine Quality Assurance', icon: '▌', searchKeywords: ['Non Routine Quality Assurance', '406'] },
          { title: 'Daily Quality Assurance', icon: '▌', searchKeywords: ['Daily Quality Assurance', '448'] },
          { title: 'Weekly Quality Assurance', icon: '▌', searchKeywords: ['Weekly Quality Assurance', '423'] },
          { title: 'Monthly Quality Assurance', icon: '▌', searchKeywords: ['Monthly Quality Assurance', '426'] },
          { title: 'Quarterly Quality Assurance', icon: '▌', searchKeywords: ['Quarterly Quality Assurance', '439'] },
          { title: 'Biannual Quality Assurance', icon: '▌', searchKeywords: ['Biannual Quality Assurance', '472'] },
          { title: 'Yearly Quality Assurance', icon: '▌', searchKeywords: ['Yearly Quality Assurance', '438'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Information Quality Assurance', icon: '📄', searchKeywords: ['Information Quality Assurance', '445'] },
          { title: 'Pengajuan PTK QA', icon: '➕', searchKeywords: ['Pengajuan PTK', '77'] },
          { title: 'Weekly Mutu', icon: '🏆', searchKeywords: ['weekly mutu', '582'] },
          { title: 'Standard QC & QA SOP', icon: '📘', searchKeywords: ['Standard Methods'] },
        ],
        showAgenda: true,
        extraLinks: []
      };
    }

    // 7. MAINTENANCE
    if (sectionTitle.includes('MAINTENANCE')) {
      return {
        icon: '🔧',
        bannerUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine Maintenance', icon: '▌', searchKeywords: ['Non Routine Maintenance', '412'] },
          { title: 'Daily Maintenance', icon: '▌', searchKeywords: ['Daily Maintenance', '427'] },
          { title: 'Weekly Maintenance', icon: '▌', searchKeywords: ['Weekly Maintenance', '424'] },
          { title: 'Monthly Maintenance', icon: '▌', searchKeywords: ['Monthly Maintenance', '422'] },
          { title: 'Quarterly Maintenance', icon: '▌', searchKeywords: ['Quarterly Maintenance', '428'] },
          { title: 'Biannual Maintenance', icon: '▌', searchKeywords: ['Biannual Maintenance', '465'] },
          { title: 'Yearly Maintenance', icon: '▌', searchKeywords: ['Yearly Maintenance', '464'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Information Maintenance', icon: '📄', searchKeywords: ['Information Maintenance', '443'] },
          { title: 'Pembersihan AC Press Room', icon: '❄️', searchKeywords: ['Pembersihan AC', '537'] },
          { title: 'Pembangunan Workshop Maintenance', icon: '🏗️', searchKeywords: ['workshop maintenance', '107'] },
          { title: 'Monitoring PO GTS', icon: '📦', searchKeywords: ['Monitoring PO GTS', '408'] },
        ],
        showAgenda: true,
        extraLinks: []
      };
    }

    // 8. WAREHOUSE / INVENTORY
    if (sectionTitle.includes('WAREHOUSE') || sectionTitle.includes('INVENTORY')) {
      return {
        icon: '📦',
        bannerUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine Inventory', icon: '▌', searchKeywords: ['Non Routine Inventory', '668', 'Non Routine Warehouse', 'Non Routine'] },
          { title: 'Daily Inventory', icon: '▌', searchKeywords: ['Daily Inventory', '669', 'Daily Warehouse', 'Daily'] },
          { title: 'Weekly Inventory', icon: '▌', searchKeywords: ['Weekly Inventory', '670', 'Weekly Warehouse', 'Weekly'] },
          { title: 'Monthly Inventory', icon: '▌', searchKeywords: ['Monthly Inventory', '671', 'Monthly Warehouse', 'Monthly'] },
          { title: 'Quarterly Inventory', icon: '▌', searchKeywords: ['Quarterly Inventory', '672', 'Quarterly Warehouse', 'Quarterly'] },
          { title: 'Biannual Inventory', icon: '▌', searchKeywords: ['Biannual Inventory', '673', 'Biannual Warehouse', 'Biannual'] },
          { title: 'Yearly Inventory', icon: '▌', searchKeywords: ['Yearly Inventory', '674', 'Yearly Warehouse', 'Yearly'] },
          { title: 'Inventory Information', icon: '▌', searchKeywords: ['Inventory Information', '683', 'Information Warehouse', '441'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Data Asset', icon: '📊', searchKeywords: ['Data Asset', '681'] },
          { title: 'Scrap', icon: '🗑️', searchKeywords: ['Scrap', '682'] },
          { title: 'Monitoring PO TBP', icon: '📦', searchKeywords: ['Monitoring PO TBP', '675'] },
          { title: 'Monitoring PO GPS', icon: '📦', searchKeywords: ['Monitoring PO GPS', '676'] },
          { title: 'Monitoring PO GTS', icon: '📦', searchKeywords: ['Monitoring PO GTS', '677'] },
          { title: 'Monitoring PO JMP', icon: '📦', searchKeywords: ['Monitoring PO JMP', '678'] },
          { title: 'Kawasi - Monitoring Centralized', icon: '📍', searchKeywords: ['Kawasi - Monitoring Centralized', '679'] },
          { title: 'Outer - Monitoring Centralized', icon: '📍', searchKeywords: ['Outer - Monitoring Centralized', '680'] },
          { title: 'CARNAVAL TBP GPS', icon: '🎪', searchKeywords: ['CARNAVAL TBP GPS', '684'] },
          { title: 'Prosedur Pengajuan BA SCRAB (Alat Prep & Lab)', icon: '📜', searchKeywords: ['Prosedur Pengajuan BA SCRAB', '685'] },
          { title: 'Prosedur Pembuangan Barang SCRAB (Mandiri)', icon: '📜', searchKeywords: ['Prosedur Pembuangan Barang SCRAB', '686'] },
          { title: 'Prosedur Pembuatan Nermi', icon: '📜', searchKeywords: ['Prosedur Pembuatan Nermi', '687'] },
          { title: 'Prosedur Pengajuan UR RAB dan IM', icon: '📜', searchKeywords: ['Prosedur Pengajuan UR RAB dan IM', '688'] },
          { title: 'Prosedur Order Barang Internal', icon: '📜', searchKeywords: ['Prosedur Order Barang Internal', '689'] },
        ],
        showAgenda: true,
        extraLinks: []
      };
    }

    // 9. MANAJEMEN MUTU
    if (sectionTitle.includes('MANAJEMEN MUTU') || sectionTitle.includes('MUTU')) {
      return {
        icon: '🚀',
        bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Non Routine Manajemen Mutu', icon: '▌', searchKeywords: ['Non Routine Manajemen Mutu', '585'] },
          { title: 'Daily Manajemen Mutu', icon: '▌', searchKeywords: ['Daily Manajemen Mutu', '586'] },
          { title: 'Weekly Manajemen Mutu', icon: '▌', searchKeywords: ['Weekly Manajemen Mutu', '587'] },
          { title: 'Monthly Manajemen Mutu', icon: '▌', searchKeywords: ['Monthly Manajemen Mutu', '588'] },
          { title: 'Quarterly Manajemen Mutu', icon: '▌', searchKeywords: ['Quarterly Manajemen Mutu', '589'] },
          { title: 'Biannual Manajemen Mutu', icon: '▌', searchKeywords: ['Biannual Manajemen Mutu', '590'] },
          { title: 'Yearly Manajemen Mutu', icon: '▌', searchKeywords: ['Yearly Manajemen Mutu', '591'] },
          { title: 'Information Manajemen Mutu', icon: '▌', searchKeywords: ['Information Manajemen Mutu', '592'] },
          { title: 'Monthly Report', icon: '▌', searchKeywords: ['Monthly Report', '593'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Audit ISO 45001', icon: '⏳', searchKeywords: ['Audit ISO 45001', '594'] },
          { title: 'Audit ISO 14001', icon: '⏳', searchKeywords: ['Audit ISO 14001', '595'] },
          { title: 'Rules Alat Baru', icon: '⏳', searchKeywords: ['Rules Alat Baru', '596'] },
          { title: 'Rules Kalibrasi & Uji Riksa', icon: '⏳', searchKeywords: ['Rules Kalibrasi & Uji Riksa', '597'] },
          { title: 'Rules Perizinan XRF', icon: '⏳', searchKeywords: ['Rules Perizinan XRF', '598'] },
        ],
        showAgenda: true,
        extraLinks: []
      };
    }

    // Default configuration for general section hubs
    return {
      icon: '📂',
      bannerUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
      infoTitle: 'INFO',
      infoItems: [
        { title: 'Non Routine', icon: '▌', searchKeywords: ['Non Routine'] },
        { title: 'Daily', icon: '▌', searchKeywords: ['Daily'] },
        { title: 'Weekly', icon: '▌', searchKeywords: ['Weekly'] },
        { title: 'Monthly', icon: '▌', searchKeywords: ['Monthly'] },
        { title: 'Quarterly', icon: '▌', searchKeywords: ['Quarterly'] },
        { title: 'Biannual', icon: '▌', searchKeywords: ['Biannual'] },
        { title: 'Yearly', icon: '▌', searchKeywords: ['Yearly'] },
      ],
      rulesTitle: 'RULES',
      rulesItems: [
        { title: 'Kebijakan Perusahaan', icon: '📜', searchKeywords: ['Kebijakan Perusahaan'] },
        { title: 'Induksi Internal', icon: '🎓', searchKeywords: ['Induksi Internal'] },
        { title: 'Golden Rules', icon: '⭐', searchKeywords: ['Golden Rules'] },
        { title: 'Standard Methods', icon: '📘', searchKeywords: ['Standard Methods'] },
      ],
      showAgenda: true,
      extraLinks: []
    };
  };

  const config = getSectionConfig();
  const hasRules = Boolean(config.rulesItems && config.rulesItems.length > 0);

  // Month navigation helpers for Section Calendar
  const prevCalMonth = () => {
    setCurrentCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextCalMonth = () => {
    setCurrentCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const resetCalToToday = () => {
    setCurrentCalDate(new Date());
  };

  const formatIsoDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Filter agenda events relevant to this section / department
  const sectionAgendaEvents = useMemo(() => {
    const sLower = sectionTitle.toLowerCase();
    return (agendaEvents || []).filter(evt => {
      const cat = (evt.kategori || evt.department || '').toLowerCase();
      const t = (evt.title || '').toLowerCase();
      if (sLower.includes('lab') && (cat.includes('lab') || t.includes('lab'))) return true;
      if (sLower.includes('prep') && (cat.includes('prep') || t.includes('prep'))) return true;
      if (sLower.includes('admin') && (cat.includes('admin') || t.includes('admin'))) return true;
      if (sLower.includes('maint') && (cat.includes('maint') || t.includes('maint'))) return true;
      if (sLower.includes('ware') || sLower.includes('inven')) {
        if (cat.includes('ware') || cat.includes('inven') || t.includes('ware') || t.includes('inven')) return true;
      }
      if (sLower.includes('mutu') && (cat.includes('mutu') || t.includes('mutu') || cat.includes('qa'))) return true;
      // Default include if general or non-birthday
      return !evt.isBirthday && !t.includes('🎂');
    });
  }, [agendaEvents, sectionTitle]);

  // Calendar cells generation (Sunday to Saturday, matching Notion Image 3)
  const calendarGrid = useMemo(() => {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay(); // 0=Sun, 6=Sat (matching Image 3: Sun, Mon, Tue, Wed, Thu, Fri, Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      dayNum: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: any[];
    }> = [];

    const todayStr = formatIsoDate(new Date());

    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevD = new Date(year, month - 1, dNum);
      const key = formatIsoDate(prevD);
      cells.push({
        dayNum: dNum,
        dateKey: key,
        isCurrentMonth: false,
        isToday: key === todayStr,
        events: []
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const curD = new Date(year, month, day);
      const key = formatIsoDate(curD);
      const evts = sectionAgendaEvents.filter(e => {
        const rawDate = e.startDate || e.start;
        if (!rawDate) return false;
        return formatIsoDate(new Date(rawDate)) === key;
      });

      cells.push({
        dayNum: day,
        dateKey: key,
        isCurrentMonth: true,
        isToday: key === todayStr,
        events: evts
      });
    }

    // Next month padding to fill grid
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const remaining = totalCells - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextD = new Date(year, month + 1, day);
      const key = formatIsoDate(nextD);
      cells.push({
        dayNum: day,
        dateKey: key,
        isCurrentMonth: false,
        isToday: key === todayStr,
        events: []
      });
    }

    return cells;
  }, [currentCalDate, sectionAgendaEvents]);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 pb-20 bg-white min-h-screen">
      {/* 1. Cover Banner Image (Matching Notion Banner Aesthetics - Full Width) */}
      <div className="w-full h-48 sm:h-60 md:h-72 lg:h-80 overflow-hidden relative group rounded-2xl border border-slate-200/80 shadow-xs bg-slate-100">
        <img
          src={post.coverImage && post.coverImage.startsWith('http') ? post.coverImage : config.bannerUrl}
          alt={sectionTitle}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = config.bannerUrl;
          }}
          className="w-full h-full object-cover object-center group-hover:scale-101 transition-transform duration-700"
        />
      </div>

      {/* 2. Header Area: Floating Icon, Metadata Actions, Big Title, Home Button */}
      <div className="px-2 sm:px-4 md:px-6 space-y-2">
        {/* Floating Page Icon */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border border-slate-200/90 shadow-md flex items-center justify-center text-3xl md:text-4xl -mt-10 md:-mt-12 relative z-10">
          {config.icon}
        </div>

        {/* Action / Verification Row */}
        <div className="flex items-center gap-4 text-xs text-slate-400 font-medium pt-1">
          <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors cursor-pointer">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Add verification</span>
          </span>
          <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors cursor-pointer">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Add comment</span>
          </span>
        </div>

        {/* Section Title */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight pt-1">
          {sectionTitle}
        </h1>

        {/* Home Navigation Pill: HOME TBP & GPS */}
        <div className="pt-2">
          <button
            onClick={onGoHome}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-xs transition-all cursor-pointer group"
          >
            <Home className="w-3.5 h-3.5 text-slate-600 group-hover:scale-110 transition-transform" />
            <span>{currentUniverse === 'GTS' ? 'HOME GTS' : 'HOME TBP & GPS'}</span>
          </button>
        </div>
      </div>

      {/* 3. Section Content Columns:
          - If hasRules: 2 Columns side-by-side (INFO in soft blue, RULES in soft cream)
          - If !hasRules (e.g. PROSEDUR, INFORMATION): Single column spanning full width matching Notion screenshots
      */}
      <div className="px-2 sm:px-4 md:px-6 pt-4">
        {hasRules ? (
          /* Two Column Layout (Laboratorium, Administrasi, Preparasi, etc.) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Column 1: INFO (Soft Pastel Sky Blue) */}
            <div className="space-y-3">
              {/* INFO Title Banner Bar */}
              <div className="bg-[#eef5fc] border border-[#dcecfb] rounded-lg px-4 py-2 flex items-center justify-between">
                <span className="font-serif italic font-normal text-2xl md:text-3xl text-[#1e3a5f] tracking-wide">
                  {config.infoTitle || 'INFO'}
                </span>
                <span className="text-[11px] font-mono font-medium text-sky-800 bg-sky-100/70 border border-sky-200/60 px-2 py-0.5 rounded-md">
                  {config.infoItems.length} Items
                </span>
              </div>

              {/* Items List (Soft Sky Blue Rounded Pill Rows) */}
              <div className="space-y-1.5">
                {config.infoItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#f0f6fd] hover:bg-[#e4effb] text-slate-800 border border-[#e2edfa] text-sm font-medium transition-all group shadow-2xs text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-sky-600 font-bold text-xs select-none">
                        {item.icon === '▌' ? '▌' : item.icon}
                      </span>
                      <span className="truncate group-hover:text-sky-950">
                        {item.title}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-sky-400/60 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Column 2: RULES (Soft Pastel Warm Cream / Pale Amber) */}
            <div className="space-y-3">
              {/* RULES Title Banner Bar */}
              <div className="bg-[#faf5e8] border border-[#f5eed6] rounded-lg px-4 py-2 flex items-center justify-between">
                <span className="font-serif italic font-normal text-2xl md:text-3xl text-[#5c4314] tracking-wide">
                  {config.rulesTitle || 'RULES'}
                </span>
                <span className="text-[11px] font-mono font-medium text-amber-800 bg-amber-100/70 border border-amber-200/60 px-2 py-0.5 rounded-md">
                  {config.rulesItems.length} SOP & Rules
                </span>
              </div>

              {/* Items List (Soft Warm Cream Rounded Pill Rows) */}
              <div className="space-y-1.5">
                {config.rulesItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#fcf8ef] hover:bg-[#f6efe0] text-slate-800 border border-[#f5ebd8] text-sm font-medium transition-all group shadow-2xs text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-amber-700 text-xs flex-shrink-0">
                        {item.icon}
                      </span>
                      <span className="truncate group-hover:text-amber-950">
                        {item.title}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-500/50 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Single Column Layout (PROSEDUR & INFORMATION) - FULL FLUID WIDTH */
          <div className="w-full space-y-3">
            {/* INFO Title Banner Bar */}
            <div className="bg-[#eef5fc] border border-[#dcecfb] rounded-lg px-4 py-2 flex items-center justify-between">
              <span className="font-serif italic font-normal text-2xl md:text-3xl text-[#1e3a5f] tracking-wide">
                {config.infoTitle || 'INFO'}
              </span>
              <span className="text-[11px] font-mono font-medium text-sky-800 bg-sky-100/70 border border-sky-200/60 px-2 py-0.5 rounded-md">
                {config.infoItems.length} Dokumen & Modul
              </span>
            </div>

            {/* Vertical List of Soft Sky Blue Pills */}
            <div className="space-y-1.5">
              {config.infoItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleItemClick(item)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#f0f6fd] hover:bg-[#e4effb] text-slate-800 border border-[#e2edfa] text-sm font-medium transition-all group shadow-2xs text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-base flex-shrink-0">
                      {item.icon}
                    </span>
                    <span className="truncate group-hover:text-sky-950 font-medium">
                      {item.title}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-sky-400/60 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Section Agenda / Calendar View (Matching Image 3: "Agenda Laboratorium") */}
      {config.showAgenda && (
        <div className="px-2 sm:px-4 md:px-6 pt-8 space-y-4">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Agenda {sectionTitle.charAt(0) + sectionTitle.slice(1).toLowerCase()}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-semibold text-slate-700 capitalize">
                  {currentCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={prevCalMonth}
                    className="p-1 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Bulan Lalu"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetCalToToday}
                    className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    onClick={nextCalMonth}
                    className="p-1 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Bulan Depan"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Manage in Calendar Button (Matching Image 3) */}
            <button
              onClick={() => {
                if (onOpenCalendar) {
                  onOpenCalendar();
                } else {
                  window.location.href = '/agenda';
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-xs transition-all cursor-pointer group"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-600 group-hover:scale-110 transition-transform" />
              <span>Manage in Calendar</span>
            </button>
          </div>

          {/* Calendar Grid (Clean Notion White Style with Sun..Sat Headers) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Days Header: Sun, Mon, Tue, Wed, Thu, Fri, Sat */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60 text-center py-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <span key={i} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {d}
                </span>
              ))}
            </div>

            {/* Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {calendarGrid.map((cell, idx) => {
                const hasEvts = cell.events.length > 0;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (hasEvts) {
                        setSelectedDayEvents({ dateStr: cell.dateKey, events: cell.events });
                      }
                    }}
                    className={`min-h-[72px] sm:min-h-[85px] p-2 flex flex-col justify-between transition-colors ${
                      cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/40 text-slate-400'
                    } ${cell.isToday ? 'bg-sky-50/40' : ''} ${hasEvts ? 'cursor-pointer hover:bg-sky-50/60' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold leading-none ${
                        cell.isToday 
                          ? 'w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold'
                          : cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                      }`}>
                        {cell.dayNum}
                      </span>
                      {hasEvts && (
                        <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded-full">
                          {cell.events.length}
                        </span>
                      )}
                    </div>

                    {/* Event Preview Chips */}
                    {hasEvts && (
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {cell.events.slice(0, 2).map((ev: any, evIdx: number) => (
                          <div 
                            key={evIdx}
                            className="text-[10px] truncate px-1.5 py-0.5 rounded bg-sky-100/80 text-sky-900 border border-sky-200/50 font-medium"
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {cell.events.length > 2 && (
                          <span className="text-[9px] text-slate-400 pl-1 font-mono">
                            +{cell.events.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Modal/Popover if user clicks an event date */}
          {selectedDayEvents && (
            <div className="p-4 rounded-xl bg-[#f0f6fd] border border-[#dcecfb] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-sky-700" />
                  <span className="text-sm font-bold text-slate-800">
                    Agenda Terjadwal: {new Date(selectedDayEvents.dateStr).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDayEvents(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded bg-white border border-slate-200 cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedDayEvents.events.map((ev: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                    <div className="font-semibold text-xs text-slate-800">{ev.title}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      {ev.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{ev.time}</span>
                        </span>
                      )}
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{ev.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. HARITA WAYS Banner (Soft Natural Sage/Emerald Notion Callout) */}
      <div className="px-2 sm:px-4 md:px-6 pt-4">
        <div className="rounded-2xl border border-emerald-200 bg-[#f0fdf4] p-4 shadow-2xs flex items-center justify-between">
          <div className="flex items-start sm:items-center gap-3 w-full">
            <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-base shrink-0 mt-0.5 sm:mt-0">
              🌟
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-serif italic font-bold text-sm tracking-wider text-emerald-900">
                  HARITA WAYS
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold font-mono">
                  Core Values
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>(<strong className="text-emerald-800 font-bold">H</strong>umility)</span>
                <span className="text-emerald-400 hidden sm:inline">•</span>
                <span>(<strong className="text-emerald-800 font-bold">A</strong>chievement oriented)</span>
                <span className="text-emerald-400 hidden sm:inline">•</span>
                <span>(<strong className="text-emerald-800 font-bold">R</strong>espect for every individual)</span>
                <span className="text-emerald-400 hidden sm:inline">•</span>
                <span>(<strong className="text-emerald-800 font-bold">I</strong>ntegrity)</span>
                <span className="text-emerald-400 hidden sm:inline">•</span>
                <span>(<strong className="text-emerald-800 font-bold">T</strong>eamwork)</span>
                <span className="text-emerald-400 hidden sm:inline">•</span>
                <span>(<strong className="text-emerald-800 font-bold">A</strong>ccountability)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Extra Links / Bookmarks if present */}
      {config.extraLinks && config.extraLinks.length > 0 && (
        <div className="px-2 sm:px-4 md:px-6 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-700">
                <LinkIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  {config.extraLinks[0].title}
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {config.extraLinks[0].url}
                </p>
              </div>
            </div>
            <a
              href={config.extraLinks[0].url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
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
