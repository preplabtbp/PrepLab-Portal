const fs = require('fs');
let code = fs.readFileSync('src/components/wo-list-screen.tsx', 'utf8');

code = code.replace("{sortedWoData.length === 0 ? (", "{activeTab === 'wo' && sortedWoData.length === 0 ? (");
code = code.replace("{sortedWoData.map((wo, index) => (", "{activeTab === 'wo' && sortedWoData.map((wo, index) => (");

const emptyTicketState = `
        {activeTab === 'ticket' && sortedTicketData.length === 0 ? (
          <Card className="text-center py-10 border-dashed border-2 border-slate-200 bg-slate-50">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-400 mb-4">
                <CheckCircle2 className="w-8 h-8" />
             </div>
             <h3 className="text-lg font-semibold text-slate-800">Tidak ada Job Ticket Internal</h3>
             <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">Belum ada request yang perlu diselesaikan.</p>
          </Card>
        ) : null}
`;

const ticketMap = `
        {activeTab === 'ticket' && sortedTicketData.map((ticket, index) => (
            <Card key={index} className={\`p-4 \${isCompleted(ticket.Status) ? 'opacity-70 bg-slate-50' : 'bg-white'} border-l-4 \${isCompleted(ticket.Status) ? 'border-l-slate-300' : 'border-l-purple-500'}\`}>
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{ticket.Ticket_ID}</span>
                        <span className={\`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border \${getStatusColor(ticket.Status)}\`}>
                          {ticket.Status}
                        </span>
                        {ticket.Priority === 'High' && (
                           <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-rose-200 bg-rose-100 text-rose-700">Urgent</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-800 text-lg leading-tight mt-1">{ticket.Tipe_Request} - {ticket.Lokasi_Area}</h3>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span><Clock className="w-3.5 h-3.5 inline mr-1 opacity-70"/> {new Date(ticket.Timestamp).toLocaleString('id-ID')}</span>
                        <span>• Dilaporkan oleh: {ticket.Pelapor_Nama}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700">
                    <span className="font-semibold text-slate-800 block mb-1">Deskripsi Request:</span>
                    <p className="whitespace-pre-line leading-relaxed">{ticket.Deskripsi_Request || '-'}</p>
                    {ticket.Target_Waktu && ticket.Target_Waktu !== '-' && (
                      <p className="mt-2 text-xs text-rose-600 font-medium">⏳ Target Selesai: {ticket.Target_Waktu}</p>
                    )}
                  </div>

                  {ticket.Bukti_Foto_URL && ticket.Bukti_Foto_URL !== '-' && (
                    <a href={ticket.Bukti_Foto_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1">
                      📸 Lihat Referensi Foto
                    </a>
                  )}

                  {isCompleted(ticket.Status) && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100 mt-3">
                      <span className="font-semibold text-green-800 text-sm block mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Hasil Penyelesaian:</span>
                      <p className="text-sm text-green-900 whitespace-pre-line">{ticket.Hasil_Tindakan || '-'}</p>
                      
                      <div className="text-xs text-green-700 mt-2 font-medium flex items-center gap-2">
                        <span>PIC: {ticket.PIC_Tugas || '-'}</span>
                        {ticket.Selesai_Pekerjaan && <span>• Selesai pada: {new Date(ticket.Selesai_Pekerjaan).toLocaleString('id-ID')}</span>}
                      </div>
                    </div>
                  )}
                </div>

                {!isCompleted(ticket.Status) && resolvingId !== ticket.Ticket_ID && (
                  <div className="flex items-end md:items-start shrink-0">
                    <Button onClick={() => setResolvingId(ticket.Ticket_ID)} className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto text-white">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Tandai Selesai
                    </Button>
                  </div>
                )}
              </div>

              {resolvingId === ticket.Ticket_ID && (
                <div className="mt-4 pt-4 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
                  <Textarea 
                    label="Catatan Penyelesaian (Hasil Tindakan)"
                    placeholder="Contoh: Modifikasi rack selesai, pembuatan meja tuntas..."
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    required
                  />
                  
                  <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <label className="block text-sm font-medium text-slate-700 mb-2 whitespace-nowrap"><Users className="w-4 h-4 inline mr-1 text-purple-600"/> Personil yang Mengerjakan</label>
                      <div className="space-y-3">
                        <div className="relative">
                           <input 
                              list="employees-list"
                              type="text"
                              value={techSearch}
                              onChange={(e) => {
                                 setTechSearch(e.target.value);
                                 const match = employees.find(emp => emp.nama === e.target.value || \`\${emp.nik} - \${emp.nama}\` === e.target.value);
                                 if (match && !selectedTechs.some(t => t.nik === match.nik)) {
                                   setSelectedTechs([...selectedTechs, match]);
                                   setTechSearch('');
                                 }
                              }}
                              placeholder="Ketik nama karyawan..."
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white shadow-sm"
                           />
                           <datalist id="employees-list">
                             {employees.map(emp => (
                               <option key={emp.nik} value={\`\${emp.nik} - \${emp.nama}\`} />
                             ))}
                           </datalist>
                        </div>
                        {selectedTechs.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                             {selectedTechs.map(tech => (
                               <div key={tech.nik} className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md text-xs font-semibold">
                                 {tech.nama}
                                 <button type="button" onClick={() => setSelectedTechs(selectedTechs.filter(t => t.nik !== tech.nik))} className="hover:text-rose-500 transition-colors ml-1 inline-flex items-center justify-center">
                                   <X className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             ))}
                          </div>
                        )}
                        {selectedTechs.length === 0 && (
                          <p className="text-xs text-slate-500">Secara default, jika dikosongkan akan menggunakan nama Anda: <span className="font-semibold">{inspectorName}</span>.</p>
                        )}
                      </div>
                    </div>

                  <div className="flex gap-2 justify-end mt-5">
                    <Button variant="secondary" onClick={() => { 
                      setResolvingId(null); 
                      setResolveNotes(''); 
                      setSelectedTechs([]);
                      setTechSearch('');
                    }}>
                      Batal
                    </Button>
                    <Button 
                      onClick={() => handleResolveTicket(ticket.Ticket_ID)} 
                      disabled={!resolveNotes.trim() || loading}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Selesai
                    </Button>
                  </div>
                </div>
              )}
            </Card>
        ))}
`;

code = code.replace("</div>\n    </div>", emptyTicketState + ticketMap + "\n      </div>\n    </div>");

fs.writeFileSync('src/components/wo-list-screen.tsx', code);
