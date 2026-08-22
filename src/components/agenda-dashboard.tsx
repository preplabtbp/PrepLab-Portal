import React, { useState, useEffect, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import { Calendar, Plus, FolderOpen, StickyNote, X, Search, Filter, Loader2, Edit, Trash2, CalendarDays, Palette, CloudUpload, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { Card, Button, Input, Select, Textarea } from './ui';
import { toast } from 'sonner';

export function AgendaDashboard({ inspectorNik, inspectorName, userDept }: { inspectorNik: string, inspectorName: string, userDept?: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState<any>(null);
  
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showAgendaDetail, setShowAgendaDetail] = useState(false);
  const [currentAgenda, setCurrentAgenda] = useState<any>(null);
  
  const calendarRef = useRef<FullCalendar>(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  

  const fetchData = async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const [agendaRes, notesRes, holidaysRes] = await Promise.all([
        fetch('/api/agenda').then(r => r.json()),
        fetch('/api/notes').then(r => r.json()),
        fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);
      
      let evts: any[] = [];
      if (agendaRes.status === 'success') {
        const filteredAgenda = agendaRes.data.filter((r: any) => {
          if (r.department) {
            if (!userDept) return false;
            if (userDept === 'ALL') return true;
            return userDept.toLowerCase() === r.department.toLowerCase();
          }
          return true;
        });

        evts = filteredAgenda.map((r: any) => {
          let bgColor = '#3b82f6';
          let textColor = '#ffffff';
          if (r.kategori === 'General') { bgColor = '#76944C'; }
          else if (r.kategori === 'SPV UP') { bgColor = '#FFD21F'; textColor = '#2d3748'; }
          else if (r.kategori === 'Private') { bgColor = '#C0B6AC'; }
          else { bgColor = '#C8DAA6'; textColor = '#2d3748'; }
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
      
      if (notesRes.status === 'success') {
        setNotes(notesRes.data.filter((n:any) => n.nik === inspectorNik));
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
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
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
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...agenda, 
          creatorNik: inspectorNik, 
          isRoutine: agenda.isRoutine === 'yes',
          department: userDept || null
        })
      });
      setShowAgendaModal(false);
      fetchData();
    } catch (e) {}
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
    } catch (e) {}
  };

  
  const filteredEvents = useMemo(() => {
    if (categoryFilter === 'All') {
       return events.filter(e => {
           if (e.id && String(e.id).startsWith('bday-')) return false;
           if (e.extendedProps?.isBirthday) return false;
           return true;
       });
    }
    if (categoryFilter === 'Quality Assurance') {
       return events.filter(e => {
           if (e.extendedProps?.isHoliday) return true;
           return (
             e.extendedProps?.kategori === 'Quality Assurance' || 
             (e.id && String(e.id).startsWith('bday-')) ||
             e.extendedProps?.isBirthday === true
           );
       });
    }
    return events.filter(e => {
        if (e.extendedProps?.isHoliday) return true; // always show holidays
        if (e.id && String(e.id).startsWith('bday-')) return false;
        if (e.extendedProps?.isBirthday) return false;
        return e.extendedProps?.kategori === categoryFilter;
    });
  }, [events, categoryFilter]);

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
            {['All', 'Quality Assurance', 'Private', 'SPV UP', 'General'].map(cat => (
              <button 
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex-shrink-0 ${categoryFilter === cat ? 'shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                style={{ 
                  backgroundColor: categoryFilter === cat ? 'var(--card-bg)' : 'transparent',
                  color: categoryFilter === cat ? 'var(--primary)' : 'var(--text-main)'
                }}
              >
                {cat === 'All' ? 'Semua' : cat === 'Quality Assurance' ? 'Quality Assurance' : cat === 'SPV UP' ? 'Section' : cat === 'Private' ? 'Pribadi' : 'General'}
              </button>
            ))}
          </div>
          <Button onClick={() => { setCurrentAgenda(null); setShowAgendaModal(true); }} style={{ backgroundColor: 'var(--primary)', color: '#fff' }} className="shadow-sm border-0 !w-auto">
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
          
          {/* Desktop FullCalendar */}
          <div className="hidden md:block w-full min-h-[500px]">
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
               height="auto"
               themeSystem="standard"
               buttonText={{ today: 'Hari Ini', month: 'Bulan', week: 'Minggu', list: 'Daftar' }}
               locale="id"
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
                                                {new Date(evt.start).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} 
                                                {evt.end && ` - ${new Date(evt.end).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}`}
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
                 <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Clock className="w-3 h-3"/> {new Date(e.start).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'})}</p>
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

      {/* Agenda Editor Modal */}
      {showAgendaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-main)', borderWidth: 1 }}>
            <div className="p-4 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
              <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}><CalendarDays className="w-5 h-5"/> Form Agenda</h2>
              <button onClick={() => setShowAgendaModal(false)}><X className="w-5 h-5 opacity-50 hover:opacity-100"/></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <Input id="ag-title" label="Judul Kegiatan" defaultValue={currentAgenda?.title || ''} style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border-main)' }}/>
              <div className="grid grid-cols-2 gap-4">
                <Input id="ag-start" type="datetime-local" label="Waktu Mulai" defaultValue={currentAgenda?.extendedProps?.startDate ? new Date(currentAgenda.extendedProps.startDate).toISOString().slice(0,16) : ''} style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border-main)' }}/>
                <Input id="ag-end" type="datetime-local" label="Waktu Selesai" defaultValue={currentAgenda?.extendedProps?.endDate ? new Date(currentAgenda.extendedProps.endDate).toISOString().slice(0,16) : ''} style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border-main)' }}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select id="ag-kategori" label="Kategori" defaultValue={currentAgenda?.extendedProps?.kategori || 'Personal'} options={[
                  {value: 'Personal', label: 'Personal'}, {value: 'Meeting', label: 'Meeting'}, {value: 'Laboratory', label: 'Laboratory'}, {value: 'General', label: 'General'}, {value: 'SPV UP', label: 'SPV UP'}
                ]} style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border-main)' }}/>
                <Input id="ag-pic" label="Nama PIC" defaultValue={currentAgenda?.extendedProps?.pic || inspectorName} style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border-main)' }}/>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Laporan / Deskripsi</label>
                <textarea id="ag-desc" defaultValue={currentAgenda?.extendedProps?.deskripsi || ''} className="w-full h-24 rounded-md p-3 text-sm focus:outline-none focus:ring-2 border shadow-sm resize-none" style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border-main)', outlineColor: 'var(--primary)' }}></textarea>
              </div>
              {!currentAgenda?.id && (
                <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                  <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
                    <input type="checkbox" id="ag-routine" className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"/>
                    Buat Agenda Rutin
                  </label>
                  <Select id="ag-freq" options={[{value: 'harian', label: 'Harian'}, {value: 'mingguan', label: 'Mingguan'}, {value: 'bulanan', label: 'Bulanan'}]} style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border-main)' }}/>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
              <Button onClick={() => setShowAgendaModal(false)} variant="secondary" className="flex-1 md:flex-none md:!w-auto">Batal</Button>
              <Button onClick={() => {
                saveAgenda({
                  id: currentAgenda?.id,
                  title: (document.getElementById('ag-title') as HTMLInputElement).value,
                  startDate: (document.getElementById('ag-start') as HTMLInputElement).value,
                  endDate: (document.getElementById('ag-end') as HTMLInputElement).value,
                  kategori: (document.getElementById('ag-kategori') as HTMLSelectElement).value,
                  pic: (document.getElementById('ag-pic') as HTMLInputElement).value,
                  deskripsi: (document.getElementById('ag-desc') as HTMLTextAreaElement).value,
                  isRoutine: (document.getElementById('ag-routine') as HTMLInputElement)?.checked ? 'yes' : 'no',
                  frekuensi: (document.getElementById('ag-freq') as HTMLSelectElement)?.value,
                });
              }} className="flex-1 md:flex-none md:!w-auto" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>Simpan Agenda</Button>
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
                   {new Date(currentAgenda.start).toLocaleString('id-ID')}
                   {currentAgenda.end && ` - ${new Date(currentAgenda.end).toLocaleString('id-ID')}`}
                 </p>
               </div>
               <div className="p-3 rounded-lg text-sm space-y-2 border" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-main)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Kategori:</span> <span className="font-medium" style={{ color: 'var(--text-main)' }}>{currentAgenda.extendedProps?.kategori || '-'}</span>
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
                 <Button onClick={() => { setShowAgendaDetail(false); setShowAgendaModal(true); }} className="flex-1" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-main)' }}><Edit className="w-4 h-4 mr-2"/> Edit</Button>
                 <Button onClick={() => deleteAgenda(currentAgenda.id)} variant="danger" className="flex-1"><Trash2 className="w-4 h-4 mr-2"/> Hapus</Button>
               </div>
               {currentAgenda.extendedProps?.routineId && (
                 <Button onClick={() => deleteAgenda(currentAgenda.id, true, currentAgenda.extendedProps.routineId)} variant="secondary" className="w-full text-rose-500"><CalendarDays className="w-4 h-4 mr-2"/> Hapus Seluruh Sisa Rutinitas</Button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
