import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import { Calendar, Plus, FolderOpen, StickyNote, X, Search, Filter, Loader2, Edit, Trash2, CalendarDays, Palette, CloudUpload, Clock, FileText, CheckCircle2, Lock, Users } from 'lucide-react';
import { Card, Button, Input, Select, Textarea, TimeInput24 } from './ui';
import { toast } from 'sonner';

export function AgendaDashboard({ 
  inspectorNik, 
  inspectorName, 
  userDept, 
  initialEventId,
  isDeveloper 
}: { 
  inspectorNik: string; 
  inspectorName: string; 
  userDept?: string; 
  initialEventId?: string;
  isDeveloper?: boolean;
}) {
  const isDev = Boolean(
    isDeveloper || 
    inspectorNik === '02D24000043' || 
    inspectorNik === '02D25000055' || 
    inspectorNik === 'M0403240177' || 
    inspectorNik === 'preplabadmin'
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = searchParams.get('tab') || searchParams.get('filter');

  // Default langsung diarahkan ke filter 'Private' (Pribadi)
  const [categoryFilter, setCategoryFilter] = useState<string>(() => {
    if (initialTabParam) {
      const f = initialTabParam.toLowerCase();
      if (f === 'all' || f === 'semua') return 'All';
      if (f === 'private' || f === 'pribadi' || f === 'personal') return 'Private';
    }
    return 'Private';
  });

  // Sinkronisasi jika parameter tab di URL berubah
  useEffect(() => {
    const tab = searchParams.get('tab') || searchParams.get('filter');
    if (tab) {
      const f = tab.toLowerCase();
      if (f === 'all' || f === 'semua') setCategoryFilter('All');
      else if (f === 'private' || f === 'pribadi' || f === 'personal') setCategoryFilter('Private');
    }
  }, [searchParams]);

  const handleSelectFilter = (cat: string) => {
    setCategoryFilter(cat);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', cat);
      return next;
    }, { replace: true });
  };

  const [events, setEvents] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState<any>(null);
  
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showAgendaDetail, setShowAgendaDetail] = useState(false);
  const [currentAgenda, setCurrentAgenda] = useState<any>(null);

  const [showDayEventsModal, setShowDayEventsModal] = useState(false);
  const [selectedDayDateStr, setSelectedDayDateStr] = useState<string>('');
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);

  // Enterprise Controlled Agenda Form State
  const [agendaForm, setAgendaForm] = useState({
    id: undefined as string | undefined,
    title: '',
    isAllDay: false,
    startDate: new Date().toLocaleDateString('en-CA'),
    endDate: new Date().toLocaleDateString('en-CA'),
    startTime: '09:00',
    endTime: '10:00',
    kategori: 'Personal',
    pic: inspectorName || '',
    deskripsi: '',
    isRoutine: false,
    frekuensi: 'harian'
  });
  
  const calendarRef = useRef<FullCalendar>(null);

  const openNewAgendaModal = (targetDateStr?: string) => {
    const dStr = targetDateStr || new Date().toLocaleDateString('en-CA');
    const now = new Date();
    const startHour = String((now.getHours() + 1) % 24).padStart(2, '0');
    const endHour = String((now.getHours() + 2) % 24).padStart(2, '0');

    setAgendaForm({
      id: undefined,
      title: '',
      isAllDay: false,
      startDate: dStr,
      endDate: dStr,
      startTime: `${startHour}:00`,
      endTime: `${endHour}:00`,
      kategori: categoryFilter === 'All' ? 'General' : 'Personal',
      pic: inspectorName || '',
      deskripsi: '',
      isRoutine: false,
      frekuensi: 'harian'
    });
    setCurrentAgenda(null);
    setShowAgendaModal(true);
  };

  const openEditAgendaModal = (eventObj: any) => {
    const p = eventObj.extendedProps || {};
    let sDate = '';
    let eDate = '';
    let sTime = '09:00';
    let eTime = '10:00';

    if (eventObj.start) {
      const d = new Date(eventObj.start);
      sDate = d.toLocaleDateString('en-CA');
      sTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    if (eventObj.end) {
      const d = new Date(eventObj.end);
      eDate = d.toLocaleDateString('en-CA');
      eTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } else {
      eDate = sDate;
    }

    setAgendaForm({
      id: eventObj.id,
      title: eventObj.title || '',
      isAllDay: Boolean(eventObj.allDay || p.isAllDay),
      startDate: sDate || new Date().toLocaleDateString('en-CA'),
      endDate: eDate || sDate || new Date().toLocaleDateString('en-CA'),
      startTime: sTime,
      endTime: eTime,
      kategori: p.kategori || 'Personal',
      pic: p.pic || inspectorName || '',
      deskripsi: p.deskripsi || '',
      isRoutine: Boolean(p.isRoutine),
      frekuensi: p.frekuensi || 'harian'
    });
    setCurrentAgenda(eventObj);
    setShowAgendaModal(true);
  };
  
  useEffect(() => {
    fetchData();
  }, [userDept]);

  // Support direct navigation from home widget: ?tab=Private&date=YYYY-MM-DD&openNew=1
  useEffect(() => {
    const dateParam = searchParams.get('date');
    const openNewParam = searchParams.get('openNew');
    if (openNewParam === '1' && dateParam) {
      openNewAgendaModal(dateParam);
      if (calendarRef.current) {
        try {
          calendarRef.current.getApi().gotoDate(dateParam);
        } catch(err) {}
      }
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('openNew');
        return next;
      }, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    if (initialEventId && events.length > 0) {
      const found = events.find(e => String(e.id) === String(initialEventId));
      if (found) {
        setCurrentAgenda(found);
        setShowAgendaDetail(true);
        if (calendarRef.current && found.start) {
          try {
            calendarRef.current.getApi().gotoDate(found.start);
          } catch(err) {}
        }
      }
    }
  }, [initialEventId, events]);

  const handleDateClick = (arg: { dateStr: string; date: Date }) => {
    const dayEvts = filteredEvents.filter(e => {
      if (!e.start) return false;
      const d = new Date(e.start);
      return d.toLocaleDateString('en-CA') === arg.dateStr;
    });

    if (dayEvts.length === 0) {
      // Tanggal kosong: langsung buka Form Agenda dengan tanggal tersebut terisi
      openNewAgendaModal(arg.dateStr);
    } else {
      // Ada 1 atau lebih agenda: buka modal daftar kegiatan hari itu
      setSelectedDayDateStr(arg.dateStr);
      setSelectedDayEvents(dayEvts);
      setShowDayEventsModal(true);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const [agendaRes, notesRes, holidaysRes] = await Promise.all([
        fetch(`/api/agenda?nik=${encodeURIComponent(inspectorNik || '')}`).then(r => r.json()),
        fetch(`/api/notes?nik=${encodeURIComponent(inspectorNik || '')}`).then(r => r.json()),
        fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);
      
      let evts: any[] = [];
      if (agendaRes.status === 'success') {
        const filteredAgenda = (agendaRes.data || []).filter((r: any) => {
          // If event has no department or is ALL, it's public for everyone
          if (!r.department || r.department === 'ALL' || r.department.toLowerCase() === 'all') return true;
          // If viewing with no department restriction or ALL, show all
          if (!userDept || userDept === 'ALL' || userDept.toLowerCase() === 'all') return true;

          const uDept = userDept.toLowerCase();
          const rDept = r.department.toLowerCase();

          if (uDept === rDept) return true;

          // Prep & Lab aliases
          const isPrepLabUser = uDept.includes('prep') || uDept.includes('lab') || uDept.includes('preparation') || uDept.includes('laboratory');
          const isPrepLabRecord = rDept.includes('prep') || rDept.includes('lab') || rDept.includes('preparation') || rDept.includes('laboratory');
          if (isPrepLabUser && isPrepLabRecord) return true;

          return false;
        });

        evts = filteredAgenda.map((r: any) => {
          let bgColor = '#3b82f6';
          let textColor = '#ffffff';
          const kat = (r.kategori || '').toLowerCase();
          if (kat === 'general') { bgColor = '#76944C'; }
          else if (kat === 'spv up') { bgColor = '#FFD21F'; textColor = '#2d3748'; }
          else if (kat === 'private' || kat === 'personal') { bgColor = '#C0B6AC'; }
          else if (kat === 'rapat' || kat === 'meeting') { bgColor = '#6366F1'; textColor = '#ffffff'; }
          else if (kat === 'birthday' || kat === 'ulang tahun' || r.isBirthday) { bgColor = '#EC4899'; textColor = '#ffffff'; }
          else if (kat === 'quality assurance' || kat === 'qa') { bgColor = '#3B82F6'; textColor = '#ffffff'; }
          else { bgColor = '#0D9488'; textColor = '#ffffff'; }
          return {
            id: r.id,
            title: r.title,
            start: r.startDate,
            end: r.endDate,
            backgroundColor: bgColor,
            textColor,
            borderColor: bgColor,
            extendedProps: { ...r }
          }
        });
      }
      
      if (holidaysRes && holidaysRes.length > 0) {
         const holidayEvents = holidaysRes.map((h: any) => ({
            id: 'hol_' + h.date,
            title: h.localName,
            start: h.date,
            allDay: true,
            backgroundColor: '#EF4444',
            borderColor: '#EF4444',
            textColor: '#ffffff',
            extendedProps: { kategori: 'Libur Nasional', isHoliday: true }
         }));
         evts = [...evts, ...holidayEvents];
      }
      
      setEvents(evts);
      
      if (notesRes.status === 'success' && Array.isArray(notesRes.data)) {
        setNotes(notesRes.data);
      }
      
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const saveNote = async (note: any) => {
    toast.loading('Menyimpan note...', { id: 'save-note' });
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...note, nik: inspectorNik })
      });
      setShowNoteModal(false);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Hapus catatan?')) return;
    try {
      await fetch(`/api/notes/${id}?nik=${encodeURIComponent(inspectorNik || '')}`, { method: 'DELETE' });
      setShowNoteModal(false);
      fetchData();
    } catch(e) {}
  };

  const saveAgenda = async (agenda: any) => {
    toast.loading('Menyimpan agenda...', { id: 'save-agenda' });
    try {
      const isNew = !agenda.id;
      const url = isNew ? '/api/agenda' : `/api/agenda/${agenda.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...agenda, 
          creatorNik: inspectorNik, 
          isRoutine: agenda.isRoutine === 'yes' || agenda.isRoutine === true,
          department: userDept || null
        })
      });

      if (res.ok) {
        toast.success('Agenda berhasil disimpan!', { id: 'save-agenda' });
        setShowAgendaModal(false);
        fetchData();
        window.dispatchEvent(new CustomEvent('agenda:updated'));
      } else {
        toast.error('Gagal menyimpan agenda', { id: 'save-agenda' });
      }
    } catch (e) {
      toast.error('Terjadi kesalahan saat menyimpan', { id: 'save-agenda' });
    }
  };

  const deleteAgenda = async (id: string, isRoutine: boolean = false, routineId?: string) => {
    if (!confirm('Hapus agenda ini?')) return;
    try {
      if (isRoutine && routineId) {
         if (confirm('Hapus juga seluruh rutinitas sisa?')) {
            await fetch(`/api/agenda/routine/${routineId}`, { method: 'DELETE' });
         } else {
            await fetch(`/api/agenda/${id}`, { method: 'DELETE' });
         }
      } else {
        await fetch(`/api/agenda/${id}`, { method: 'DELETE' });
      }
      setShowAgendaDetail(false);
      fetchData();
      window.dispatchEvent(new CustomEvent('agenda:updated'));
    } catch (e) {}
  };

  
  const isUserPersonalEvent = (e: any) => {
    const p = e.extendedProps || e;
    const cleanNik = (inspectorNik || '').trim().toUpperCase();
    const cleanName = (inspectorName || '').trim().toLowerCase();
    
    const creatorNik = String(p.creatorNik || p.creator_nik || '').trim().toUpperCase();
    const pic = String(p.pic || '').trim();
    const picUpper = pic.toUpperCase();
    const picLower = pic.toLowerCase();

    // Cocokkan NIK pembuat (creator)
    if (cleanNik && creatorNik && creatorNik === cleanNik) return true;
    // Cocokkan PIC NIK atau Nama
    if (cleanNik && (picUpper === cleanNik || picUpper.includes(cleanNik))) return true;
    if (cleanName && (picLower === cleanName || picLower.includes(cleanName) || cleanName.includes(picLower))) return true;

    return false;
  };

  const isPrivateCategory = (e: any) => {
    const p = e.extendedProps || e;
    const kat = String(p.kategori || '').trim().toLowerCase();
    return kat === 'private' || kat === 'personal' || kat === 'pribadi';
  };
  
  const filteredEvents = useMemo(() => {
    if (categoryFilter === 'Private') {
      // Hanya agenda pribadi milik pengguna yang sedang login!
      // Libur nasional, ulang tahun orang lain, maupun agenda orang lain TIDAK dimunculkan di sini.
      return events.filter(e => {
        if (e.extendedProps?.isHoliday) return false;
        if (e.extendedProps?.isBirthday) return false;
        if (String(e.id || '').startsWith('bday-')) return false;

        return isPrivateCategory(e) && isUserPersonalEvent(e);
      });
    }

    // categoryFilter === 'All' (Semua)
    // Menampilkan agenda umum (meeting, QA, general, libur nasional)
    // SERTA agenda pribadi MILIK USER SENDIRI.
    // Agenda pribadi milik orang lain disaring agar privasi masing-masing terjaga.
    return events.filter(e => {
      if (String(e.id || '').startsWith('bday-') || e.extendedProps?.isBirthday) return false;
      if (e.extendedProps?.isHoliday) return true;

      // Jika kategori adalah Pribadi/Personal, hanya tampilkan milik user yang sedang aktif
      if (isPrivateCategory(e)) {
        return isUserPersonalEvent(e);
      }

      return true;
    });
  }, [events, categoryFilter, inspectorNik, inspectorName]);

  const handleEventClick = (info: any) => {
    setCurrentAgenda(info.event);
    setShowAgendaDetail(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 w-full" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 p-6 rounded-xl border border-slate-200/50 shadow-sm" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-main)' }}>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--accent)', color: 'var(--card-bg)' }}>
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display" style={{ color: 'var(--primary)' }}>Agenda Personal</h1>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{inspectorName} | NIK: {inspectorNik}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
          <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto hide-scrollbar" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', borderWidth: 1 }}>
            {[
              { id: 'Private', label: 'Pribadi' },
              { id: 'All', label: 'Semua' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => handleSelectFilter(tab.id)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex-shrink-0 cursor-pointer ${categoryFilter === tab.id ? 'shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                style={{ 
                  backgroundColor: categoryFilter === tab.id ? 'var(--card-bg)' : 'transparent',
                  color: categoryFilter === tab.id ? 'var(--primary)' : 'var(--text-main)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button onClick={() => openNewAgendaModal()} style={{ backgroundColor: 'var(--primary)', color: '#fff' }} className="shadow-sm border-0 !w-auto cursor-pointer">
            <Plus className="w-4 h-4 mr-2" /> Agenda Baru
          </Button>

        </div>
      </header>

      {/* Notes Widget */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--primary)' }}><FolderOpen className="w-4 h-4" /> Private Notes</h3>
          <Button onClick={() => { setCurrentNote(null); setShowNoteModal(true); }} variant="secondary" className="h-8 text-xs px-2 shadow-sm border-0 !w-auto" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--primary)' }}>
            <Plus className="w-3 h-3 mr-1" /> Note Baru
          </Button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
          {notes.map(n => (
            <div 
              key={n.id} 
              onClick={() => { setCurrentNote(n); setShowNoteModal(true); }}
              className="min-w-[160px] max-w-[180px] shrink-0 border border-black/10 rounded-lg p-3 cursor-pointer hover:-translate-y-1 transition-all shadow-sm snap-start" 
              style={{ backgroundColor: n.color || '#FFFBEB' }}
            >
              <div className="flex items-center gap-1.5 mb-1.5 opacity-80">
                <FileText className="w-3.5 h-3.5 shrink-0 text-black/60" />
                <h4 className="font-bold text-black/80 text-xs truncate">{n.title}</h4>
              </div>
              <p className="text-[10px] text-black/60 line-clamp-2 leading-snug">{n.content}</p>
            </div>
          ))}
          {notes.length === 0 && <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Belum ada catatan.</p>}
        </div>
      </div>

      {/* Calendar Area */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-3/4 p-4 md:p-6 rounded-xl shadow-sm border border-slate-200/50 relative" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-main)' }}>
          {loading && <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-xl"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }}/></div>}
          
          {/* Desktop FullCalendar with Clean Pulsing Red Count Bubble */}
          <div className="hidden md:block w-full min-h-[500px]">
             <style>{`
               .fc-daygrid-day-events {
                 display: none !important;
               }
               .fc-daygrid-day-frame {
                 min-height: 72px !important;
               }
               .fc-daygrid-day-top {
                 flex-direction: column !important;
                 align-items: center !important;
                 width: 100% !important;
               }
               .fc-daygrid-day-number, 
               .fc-col-header-cell-cushion, 
               .fc-toolbar-title,
               .fc-col-header-cell,
               .fc-daygrid-day,
               .fc-list-day-text,
               .fc-list-day-side-text,
               .fc-timegrid-slot-label {
                 color: #000000 !important;
                 font-weight: 700 !important;
               }
               .fc .fc-button-primary {
                 color: #000000 !important;
               }
             `}</style>
             <FullCalendar
               ref={calendarRef}
               plugins={[ dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, multiMonthPlugin ]}
               initialView="dayGridMonth"
               headerToolbar={{
                 left: 'prev,next today',
                 center: 'title',
                 right: 'dayGridMonth,timeGridWeek,listWeek'
               }}
               events={filteredEvents}
               eventClick={handleEventClick}
               dateClick={(arg) => handleDateClick({ dateStr: arg.dateStr, date: arg.date })}
               height="auto"
               themeSystem="standard"
               buttonText={{ today: 'Hari Ini', month: 'Bulan', week: 'Minggu', list: 'Daftar' }}
               locale="id"
               slotLabelFormat={{
                 hour: '2-digit',
                 minute: '2-digit',
                 hour12: false
               }}
               eventTimeFormat={{
                 hour: '2-digit',
                 minute: '2-digit',
                 hour12: false,
                 meridiem: false
               }}
               dayCellContent={(arg) => {
                 const cellDateStr = arg.date.toLocaleDateString('en-CA');
                 const dayEvts = filteredEvents.filter(e => {
                   if (!e.start) return false;
                   const evDateStr = new Date(e.start).toLocaleDateString('en-CA');
                   return evDateStr === cellDateStr;
                 });

                 return (
                   <div 
                     onClick={() => handleDateClick({ dateStr: cellDateStr, date: arg.date })}
                     className="flex flex-col items-center justify-between h-full min-h-[62px] py-1 px-1 relative w-full cursor-pointer group select-none"
                   >
                     <span className="text-xs font-bold text-black dark:text-black group-hover:text-teal-700 transition-colors">
                       {arg.dayNumberText.replace(/tgl|tanggal/gi, '').trim()}
                     </span>
                     {dayEvts.length > 0 && (
                       <div 
                         className="my-auto cursor-pointer flex items-center justify-center pt-0.5"
                         title={`${dayEvts.length} Kegiatan pada ${cellDateStr} (Klik untuk melihat)`}
                       >
                         <span className="relative flex h-6 min-w-6 px-1.5 items-center justify-center rounded-full bg-red-600 text-white text-[11px] font-black shadow-lg ring-2 ring-red-300/60 hover:scale-125 transition-transform animate-pulse">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                           <span className="relative z-10">{dayEvts.length}</span>
                         </span>
                       </div>
                     )}
                   </div>
                 );
               }}
             />
          </div>

          {/* Mobile Accordion View */}
          <div className="block md:hidden w-full space-y-4">
             <h3 className="font-bold text-lg border-b pb-2 mb-4" style={{ color: 'var(--primary)', borderColor: 'var(--border-main)' }}>Jadwal & Agenda</h3>
             {(() => {
                const todayStr = new Date().toLocaleDateString('en-CA');
                const sortedEvents = [...filteredEvents].sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime());
                const grouped = {};
                sortedEvents.forEach(e => {
                    const d = new Date(e.start);
                    const dateStr = d.toLocaleDateString('en-CA');
                    if (dateStr >= todayStr) {
                        if (!grouped[dateStr]) grouped[dateStr] = [];
                        grouped[dateStr].push(e);
                    }
                });
                const dates = Object.keys(grouped).sort();
                
                if (dates.length === 0) return <p className="text-sm italic opacity-70">Belum ada agenda mendatang.</p>;
                
                return dates.map((dateStr, idx) => {
                    const isToday = dateStr === todayStr;
                    const dateObj = new Date(dateStr);
                    const title = isToday ? 'Hari Ini' : dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
                    
                    return (
                        <details key={dateStr} className="group rounded-xl border overflow-hidden shadow-sm marker:hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-main)' }} open={isToday || idx === 0}>
                            <summary className="px-4 py-3 border-b flex justify-between items-center cursor-pointer list-none select-none transition-colors" style={{ backgroundColor: isToday ? 'var(--accent)' : 'var(--bg-main)', borderColor: 'var(--border-main)', color: isToday ? 'var(--card-bg)' : 'var(--text-main)' }}>
                                <h4 className="font-bold text-sm flex items-center gap-2">{title}</h4>
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-black/10">{grouped[dateStr].length} Kegiatan</span>
                            </summary>
                            <div className="p-3 space-y-2">
                                {grouped[dateStr].map((evt, i) => (
                                    <div key={i} onClick={() => handleEventClick({event: evt})} className="p-3 rounded-lg flex items-start gap-3 cursor-pointer hover:opacity-80 transition-opacity border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-main)' }}>
                                        <div className="w-1.5 rounded-full h-auto self-stretch min-h-[36px]" style={{ backgroundColor: evt.backgroundColor }}></div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold leading-tight mb-1.5" style={{ color: 'var(--text-main)' }}>{evt.title}</p>
                                            <p className="text-[11px] flex items-center gap-1 opacity-70" style={{ color: 'var(--text-muted)' }}>
                                                <Clock className="w-3 h-3"/> 
                                                {new Date(evt.start).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', hour12: false})} 
                                                {evt.end && ` - ${new Date(evt.end).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', hour12: false})}`}
                                                {evt.extendedProps?.kategori && <span className="ml-2 px-1.5 py-0.5 rounded-md border" style={{ borderColor: 'var(--border-main)' }}>{evt.extendedProps.kategori}</span>}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </details>
                    );
                });
             })()}
          </div>
        </div>

        {/* Agenda Mendatang - Desktop Only */}
        <div className="hidden lg:block w-full lg:w-1/4 p-4 md:p-6 rounded-xl shadow-sm border border-slate-200/50" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-main)' }}>
           <h3 className="font-bold text-sm mb-4 pb-2 border-b" style={{ color: 'var(--primary)', borderColor: 'var(--border-main)' }}>Agenda Mendatang</h3>
           <div className="space-y-3 max-h-[500px] overflow-y-auto">
             {filteredEvents.filter(e => new Date(e.start) >= new Date()).slice(0, 5).map(e => (
               <div key={e.id} onClick={() => handleEventClick({event: e})} className="p-3 rounded-lg border cursor-pointer hover:bg-slate-50/5 transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                 <p className="text-xs font-bold truncate mb-1" style={{ color: 'var(--text-main)' }}>{e.title}</p>
                 <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Clock className="w-3 h-3"/> {new Date(e.start).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}, {new Date(e.start).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', hour12: false})}</p>
               </div>
             ))}
             {filteredEvents.filter(e => new Date(e.start) >= new Date()).length === 0 && <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Tidak ada agenda mendatang</p>}
           </div>
        </div>
      </div>

      {/* Note Editor Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-main)', borderWidth: 1 }}>
            <div className="p-4 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
              <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}><StickyNote className="w-5 h-5"/> Editor Note</h2>
              <button onClick={() => setShowNoteModal(false)}><X className="w-5 h-5 opacity-50 hover:opacity-100"/></button>
            </div>
            <div className="p-5 space-y-4">
              <Input 
                 label="Judul Note" 
                 defaultValue={currentNote?.title || ''} 
                 id="note-title"
                 style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border-main)' }}
              />
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Isi Catatan</label>
                <textarea 
                  id="note-content" 
                  defaultValue={currentNote?.content || ''} 
                  className="w-full h-32 rounded-md p-3 text-sm focus:outline-none focus:ring-2 border shadow-sm resize-none"
                  style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border-main)', outlineColor: 'var(--primary)' }}
                ></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Warna Folder</label>
                <div className="flex gap-2">
                  {['#FFFBEB', '#ECFDF5', '#EFF6FF', '#FDF2F8', '#FAF5FF'].map(c => (
                    <button key={c} onClick={(e) => {
                      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('ring-2', 'ring-offset-2', 'ring-slate-400'));
                      e.currentTarget.classList.add('ring-2', 'ring-offset-2', 'ring-slate-400');
                      document.getElementById('note-color')!.dataset.value = c;
                    }} className={`w-8 h-8 rounded-full border border-black/10 color-btn ${currentNote?.color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} style={{ backgroundColor: c }}></button>
                  ))}
                  <input type="hidden" id="note-color" data-value={currentNote?.color || '#FFFBEB'} />
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-between" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
              {currentNote?.id ? (
                <Button onClick={() => deleteNote(currentNote.id)} variant="danger" className="!w-auto"><Trash2 className="w-4 h-4 mr-1"/> Hapus</Button>
              ) : <div></div>}
              <div className="flex gap-2">
                <Button onClick={() => setShowNoteModal(false)} variant="secondary" className="flex-1 md:flex-none md:!w-auto">Batal</Button>
                <Button onClick={() => {
                   const title = (document.getElementById('note-title') as HTMLInputElement).value;
                   const content = (document.getElementById('note-content') as HTMLTextAreaElement).value;
                   const color = document.getElementById('note-color')!.dataset.value;
                   saveNote({ id: currentNote?.id, title, content, color });
                }} className="flex-1 md:flex-none md:!w-auto" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>Simpan</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Agenda Editor Modal */}
      {showAgendaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900 dark:text-white">
                    {agendaForm.id ? 'Edit Agenda' : 'Agenda Kegiatan Baru'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {agendaForm.startDate ? new Date(agendaForm.startDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Atur jadwal kegiatan'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAgendaModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Judul Kegiatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Judul Kegiatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={agendaForm.title}
                  onChange={(e) => setAgendaForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: Rapat Mingguan, Kalibrasi XRF, Rencana Kegiatan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400"
                  autoFocus
                />
              </div>

              {/* Kategori & PIC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kategori Agenda
                  </label>
                  <select
                    value={agendaForm.kategori}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, kategori: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Personal">🔒 Pribadi (Hanya Saya)</option>
                    <option value="General">👥 Umum / Semua (Publik)</option>
                    <option value="Meeting">🤝 Rapat / Pertemuan</option>
                    <option value="QA">🔬 Quality Assurance (QA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Penanggung Jawab (PIC)
                  </label>
                  <input
                    type="text"
                    value={agendaForm.pic}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, pic: e.target.value }))}
                    placeholder="Nama PIC"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Opsi Acara Sepanjang Hari */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Acara Sepanjang Hari (All Day)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agendaForm.isAllDay}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, isAllDay: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              {/* Pengaturan Tanggal & Waktu */}
              <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 dark:text-slate-400 mb-1">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={agendaForm.startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setAgendaForm(prev => ({
                          ...prev,
                          startDate: newStart,
                          endDate: prev.endDate < newStart ? newStart : prev.endDate
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 dark:text-slate-400 mb-1">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={agendaForm.endDate}
                      min={agendaForm.startDate}
                      onChange={(e) => setAgendaForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Jam Mulai & Selesai (Jika bukan sepanjang hari) */}
                {!agendaForm.isAllDay && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <TimeInput24
                          label="Jam Mulai"
                          value={agendaForm.startTime}
                          onChange={(newStart) => {
                            const [h, m] = newStart.split(':').map(Number);
                            const endH = String((h + 1) % 24).padStart(2, '0');
                            const endM = String(m || 0).padStart(2, '0');
                            setAgendaForm(prev => ({
                              ...prev,
                              startTime: newStart,
                              endTime: `${endH}:${endM}`
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <TimeInput24
                          label="Jam Selesai"
                          value={agendaForm.endTime}
                          onChange={(newEnd) => setAgendaForm(prev => ({ ...prev, endTime: newEnd }))}
                        />
                      </div>
                    </div>

                    {/* Quick Duration Chips */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mr-1">Durasi:</span>
                      {[
                        { label: '30 Mnt', mins: 30 },
                        { label: '1 Jam', mins: 60 },
                        { label: '2 Jam', mins: 120 },
                        { label: '3 Jam', mins: 180 },
                      ].map((dur) => (
                        <button
                          key={dur.label}
                          type="button"
                          onClick={() => {
                            const [h, m] = agendaForm.startTime.split(':').map(Number);
                            const totalMins = (h * 60) + m + dur.mins;
                            const newH = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
                            const newM = String(totalMins % 60).padStart(2, '0');
                            setAgendaForm(prev => ({ ...prev, endTime: `${newH}:${newM}` }));
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-teal-100 hover:text-teal-800 dark:hover:bg-teal-900/50 dark:hover:text-teal-300 transition-colors cursor-pointer"
                        >
                          +{dur.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Deskripsi / Catatan Tambahan
                </label>
                <textarea
                  value={agendaForm.deskripsi}
                  onChange={(e) => setAgendaForm(prev => ({ ...prev, deskripsi: e.target.value }))}
                  placeholder="Tuliskan detail agenda kegiatan, lokasi, link meeting, atau persiapan yang dibutuhkan..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500 resize-none placeholder:text-slate-400"
                />
              </div>

              {/* Buat Agenda Rutin (hanya saat buat baru) */}
              {!agendaForm.id && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 space-y-2">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agendaForm.isRoutine}
                      onChange={(e) => setAgendaForm(prev => ({ ...prev, isRoutine: e.target.checked }))}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                    <span>Buat Agenda Rutin / Berulang</span>
                  </label>
                  {agendaForm.isRoutine && (
                    <div className="pt-2 pl-6">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        Ulangi Setiap:
                      </label>
                      <select
                        value={agendaForm.frekuensi}
                        onChange={(e) => setAgendaForm(prev => ({ ...prev, frekuensi: e.target.value }))}
                        className="w-full sm:w-48 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="harian">Harian (14 Hari ke Depan)</option>
                        <option value="mingguan">Mingguan (8 Minggu ke Depan)</option>
                        <option value="bulanan">Bulanan (4 Bulan ke Depan)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setShowAgendaModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!agendaForm.title.trim()) {
                    toast.error('Judul kegiatan wajib diisi');
                    return;
                  }
                  let startIso: string;
                  let endIso: string;
                  if (agendaForm.isAllDay) {
                    startIso = `${agendaForm.startDate}T00:00:00`;
                    endIso = `${agendaForm.endDate}T23:59:59`;
                  } else {
                    startIso = `${agendaForm.startDate}T${agendaForm.startTime}:00`;
                    endIso = `${agendaForm.endDate}T${agendaForm.endTime}:00`;
                  }

                  await saveAgenda({
                    id: agendaForm.id,
                    title: agendaForm.title.trim(),
                    startDate: startIso,
                    endDate: endIso,
                    kategori: agendaForm.kategori,
                    pic: agendaForm.pic,
                    deskripsi: agendaForm.deskripsi,
                    isRoutine: agendaForm.isRoutine ? 'yes' : 'no',
                    frekuensi: agendaForm.frekuensi,
                    isAllDay: agendaForm.isAllDay
                  });
                }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Agenda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agenda Detail Modal */}
      {showAgendaDetail && currentAgenda && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl flex flex-col" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-main)', borderWidth: 1 }}>
            <div className="p-4 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
              <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}><FileText className="w-5 h-5"/> Detail Agenda</h2>
              <button onClick={() => setShowAgendaDetail(false)}><X className="w-5 h-5 opacity-50 hover:opacity-100"/></button>
            </div>
            <div className="p-5 space-y-4">
               <div>
                 <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>{currentAgenda.title}</h3>
                 <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                   <Clock className="w-4 h-4"/>
                   {new Date(currentAgenda.start).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, {new Date(currentAgenda.start).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} WIT
                   {currentAgenda.end && ` - ${new Date(currentAgenda.end).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} WIT`}
                 </p>
               </div>
               <div className="p-3 rounded-lg text-sm space-y-2 border" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-main)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Kategori:</span> <span className="font-medium" style={{ color: 'var(--text-main)' }}>
                      {(currentAgenda.extendedProps?.kategori === 'Personal' || currentAgenda.extendedProps?.kategori === 'Private' || currentAgenda.extendedProps?.kategori === 'Pribadi') ? 'Pribadi' : (currentAgenda.extendedProps?.kategori === 'General' ? 'Umum / Semua' : (currentAgenda.extendedProps?.kategori || '-'))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>PIC:</span> <span className="font-medium" style={{ color: 'var(--text-main)' }}>{currentAgenda.extendedProps?.pic || '-'}</span>
                  </div>
               </div>
               <div>
                 <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Deskripsi / Laporan</h4>
                 <div className="p-3 rounded-lg border whitespace-pre-wrap text-sm" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                    {currentAgenda.extendedProps?.deskripsi || 'Tidak ada deskripsi'}
                 </div>
               </div>
            </div>
            <div className="p-4 border-t flex flex-col gap-2" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
               <div className="flex gap-2">
                 <Button onClick={() => { setShowAgendaDetail(false); openEditAgendaModal(currentAgenda); }} className="flex-1" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-main)' }}><Edit className="w-4 h-4 mr-2"/> Edit</Button>
                 <Button onClick={() => deleteAgenda(currentAgenda.id)} variant="danger" className="flex-1"><Trash2 className="w-4 h-4 mr-2"/> Hapus</Button>
               </div>
               {currentAgenda.extendedProps?.routineId && (
                 <Button onClick={() => deleteAgenda(currentAgenda.id, true, currentAgenda.extendedProps.routineId)} variant="secondary" className="w-full text-rose-500"><CalendarDays className="w-4 h-4 mr-2"/> Hapus Seluruh Sisa Rutinitas</Button>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Day Events List Modal */}
      {showDayEventsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-main)', borderWidth: 1 }}>
            <div className="p-4 border-b flex justify-between items-center bg-[#242424]" style={{ borderColor: 'var(--border-main)' }}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white">
                    {selectedDayDateStr ? new Date(selectedDayDateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Daftar Agenda'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedDayEvents.length} Kegiatan Terjadwal
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDayEventsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#333] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Tombol Cepat Tambah Agenda pada Tanggal Ini */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setShowDayEventsModal(false);
                  openNewAgendaModal(selectedDayDateStr);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Agenda pada {selectedDayDateStr ? new Date(selectedDayDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tanggal Ini'}</span>
              </button>
            </div>
            
            <div className="p-4 space-y-2.5 overflow-y-auto max-h-[50vh] custom-scrollbar">
              {selectedDayEvents.map((evt, idx) => (
                <div 
                  key={evt.id || idx}
                  onClick={() => {
                    setCurrentAgenda(evt);
                    setShowDayEventsModal(false);
                    setShowAgendaDetail(true);
                  }}
                  className="p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer hover:border-teal-500/50 hover:bg-slate-100/10 transition-all group shadow-sm"
                  style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}
                >
                  <div className="w-2 rounded-full self-stretch min-h-[40px] flex-shrink-0" style={{ backgroundColor: evt.backgroundColor || '#6366F1' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-bold text-sm truncate group-hover:text-teal-400 transition-colors" style={{ color: 'var(--text-main)' }}>
                        {evt.title}
                      </h4>
                      {evt.extendedProps?.kategori && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-300 flex-shrink-0">
                          {evt.extendedProps.kategori}
                        </span>
                      )}
                    </div>
                    <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(evt.start).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      {evt.end && ` - ${new Date(evt.end).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
                      {evt.extendedProps?.pic && (
                        <span className="ml-2 truncate">• PIC: {evt.extendedProps.pic}</span>
                      )}
                    </p>
                    {evt.extendedProps?.deskripsi && (
                      <p className="text-xs mt-1.5 line-clamp-2 leading-snug opacity-75" style={{ color: 'var(--text-muted)' }}>
                        {evt.extendedProps.deskripsi}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t flex items-center justify-between bg-[#242424]" style={{ borderColor: 'var(--border-main)' }}>
              <Button 
                onClick={() => {
                  setShowDayEventsModal(false);
                  openNewAgendaModal(selectedDayDateStr);
                }}
                className="!w-auto"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              >
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Agenda Baru
              </Button>
              <Button 
                onClick={() => setShowDayEventsModal(false)}
                variant="secondary"
                className="!w-auto"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
