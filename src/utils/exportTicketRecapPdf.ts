import { parseFindingDescription } from '../components/StructuredFindingList';

// Helper to fetch any photo URL (blob, Google Drive proxy, etc.) and convert to base64
export async function fetchPhotoAsBase64(photoUrl: string): Promise<string | null> {
  if (!photoUrl || photoUrl === '-') return null;
  if (photoUrl.startsWith('data:image/')) return photoUrl;

  try {
    let blob: Blob | null = null;
    
    if (photoUrl.startsWith('blob:')) {
      const res = await fetch(photoUrl);
      if (res.ok) blob = await res.blob();
    } else {
      // Check if google drive file ID
      const driveMatch = photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || photoUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (driveMatch && driveMatch[1]) {
        try {
          const driveRes = await fetch(`/api/drive/view/${driveMatch[1]}`);
          if (driveRes.ok) blob = await driveRes.blob();
        } catch {}
      }

      if (!blob) {
        const proxyUrl = `/api/gallery/image-proxy?url=${encodeURIComponent(photoUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) blob = await res.blob();
      }
    }

    if (!blob) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Gagal convert foto ke base64:", photoUrl, err);
    return null;
  }
}

export interface ExportTicketPdfOptions {
  tickets: any[];
  statusFilter: 'OPEN' | 'CLOSED' | 'ALL';
  selectedWeek?: string;
  onProgress?: (current: number, total: number, message: string) => void;
}

export async function exportInspectionTicketsPdf({
  tickets,
  statusFilter,
  selectedWeek = 'Semua Minggu',
  onProgress
}: ExportTicketPdfOptions): Promise<void> {
  if (!tickets || tickets.length === 0) {
    throw new Error('Tidak ada data tiket temuan untuk diekspor.');
  }

  // Dynamic import of html2canvas and jsPDF
  // @ts-ignore
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ]);

  const total = tickets.length;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const printTimestamp = now.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Offscreen container for rendering pages
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:820px;background:#ffffff;z-index:-9999;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
  document.body.appendChild(host);

  try {
    for (let i = 0; i < total; i++) {
      const t = tickets[i];
      const pageNum = i + 1;
      const isClosed = t.status?.toUpperCase() === 'CLOSED';

      if (onProgress) {
        onProgress(pageNum, total, `Menyiapkan kartu temuan ${pageNum} / ${total}...`);
      }

      // Convert images to base64
      let photoOpenBase64: string | null = null;
      let photoClosedBase64: string | null = null;

      if (t.photoUrl && t.photoUrl !== '-') {
        photoOpenBase64 = await fetchPhotoAsBase64(t.photoUrl);
      }
      if (t.closingPhoto && t.closingPhoto !== '-') {
        photoClosedBase64 = await fetchPhotoAsBase64(t.closingPhoto);
      }

      // Parse structured description
      const parsedFindings = parseFindingDescription(t.description);

      // Render Description HTML
      let descriptionHtml = '';
      if (parsedFindings.length === 0) {
        descriptionHtml = `<p style="margin:0;font-size:12px;color:#64748b;font-style:italic;">${escapeHtml(t.description || 'Tidak ada deskripsi temuan.')}</p>`;
      } else if (parsedFindings.length === 1 && parsedFindings[0].type === 'general') {
        descriptionHtml = `<p style="margin:0;font-size:12px;font-weight:600;color:#e11d48;line-height:1.5;">${escapeHtml(parsedFindings[0].raw)}</p>`;
      } else {
        const header = parsedFindings[0]?.header;
        descriptionHtml = `
          ${header ? `<p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#334155;">${escapeHtml(header)}:</p>` : ''}
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${parsedFindings.map(item => `
              <div style="display:flex;align-items:flex-start;gap:6px;font-size:12px;line-height:1.45;">
                <span style="font-weight:800;color:#e11d48;min-width:14px;flex-shrink:0;">${item.number}.</span>
                <div>
                  ${item.type === 'apd' ? `
                    <strong style="color:#0f172a;font-weight:700;">${escapeHtml(item.name || '')}</strong>
                    ${item.role ? `<span style="color:#64748b;font-size:11px;margin-left:4px;">(${escapeHtml(item.role)})</span>` : ''}
                    <span style="color:#94a3b8;margin:0 4px;">—</span>
                    <span style="color:#e11d48;font-weight:700;">Tidak lengkap: ${escapeHtml((item.items || []).join(', '))}</span>
                    ${item.note ? `<span style="color:#475569;font-size:11px;font-style:italic;margin-left:4px;">(Ket: ${escapeHtml(item.note)})</span>` : ''}
                  ` : `
                    <span style="color:#1e293b;font-weight:500;">${escapeHtml(item.raw)}</span>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      // Format Dates
      let dateStr = '-';
      if (t.date) {
        try {
          const d = new Date(t.date);
          if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        } catch {}
      }

      let completionDateStr = '-';
      if (t.completionDate) {
        try {
          const d = new Date(t.completionDate);
          if (!isNaN(d.getTime())) {
            completionDateStr = d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          }
        } catch {}
      }

      // Create Page Element (A4 proportion: 800px x 1130px)
      const pageEl = document.createElement('div');
      pageEl.style.cssText = `
        width: 800px;
        min-height: 1130px;
        box-sizing: border-box;
        padding: 32px 36px;
        background: #ffffff;
        color: #0f172a;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      `;

      pageEl.innerHTML = `
        <div>
          <!-- Top Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:2px solid #0f172a;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:38px;height:38px;border-radius:10px;background:#0f172a;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:900;font-size:18px;">
                PL
              </div>
              <div>
                <h2 style="margin:0;font-size:13px;font-weight:800;color:#0f172a;letter-spacing:0.5px;text-transform:uppercase;">
                  PT TRIMEGAH BANGUN PERSADA Tbk
                </h2>
                <p style="margin:1px 0 0 0;font-size:11px;font-weight:600;color:#475569;">
                  DEPARTEMEN PREPARATION & LABORATORY • K3 & LINGKUNGAN
                </p>
              </div>
            </div>
            <div style="text-align:right;">
              <span style="display:inline-block;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;${
                isClosed ? 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;' : 'background:#fff1f2;color:#be123c;border:1px solid #fecdd3;'
              }">
                ${isClosed ? '● STATUS: CLOSED (SELESAI)' : '● STATUS: OPEN (TERBUKA)'}
              </span>
              <p style="margin:4px 0 0 0;font-size:10px;color:#64748b;font-weight:500;">
                ${escapeHtml(selectedWeek)}
              </p>
            </div>
          </div>

          <!-- Document Title & Ticket Metadata Bar -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 14px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <p style="margin:0;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Nomor Tiket Temuan</p>
              <p style="margin:1px 0 0 0;font-size:14px;font-weight:800;color:#0f172a;font-family:monospace;">${escapeHtml(t.ticketId || '-')}</p>
            </div>
            <div>
              <p style="margin:0;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Kategori Inspeksi</p>
              <p style="margin:1px 0 0 0;font-size:12px;font-weight:700;color:#0369a1;">${escapeHtml(t.category || 'Inspeksi K3')}</p>
            </div>
            <div>
              <p style="margin:0;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Tanggal Pelaporan</p>
              <p style="margin:1px 0 0 0;font-size:12px;font-weight:700;color:#334155;">${dateStr}</p>
            </div>
          </div>

          <!-- Main Card Container matching the screenshot -->
          <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.06);overflow:hidden;border-top:5px solid ${isClosed ? '#0d9488' : '#f43f5e'};">
            <div style="padding:18px 20px;">
              
              <!-- Foto Box Section -->
              <div style="margin-bottom:16px;">
                ${isClosed && photoClosedBase64 ? `
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <!-- Foto Temuan Awal -->
                    <div>
                      <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#e11d48;display:flex;align-items:center;gap:4px;">
                        📷 Foto Temuan Awal
                      </p>
                      <div style="width:100%;height:220px;background:#0f172a08;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
                        ${photoOpenBase64 ? `
                          <img src="${photoOpenBase64}" style="width:100%;height:100%;object-fit:contain;" alt="Temuan Awal" />
                        ` : `
                          <span style="font-size:11px;color:#94a3b8;">Foto awal tidak tersedia</span>
                        `}
                      </div>
                    </div>
                    <!-- Foto Bukti Perbaikan -->
                    <div>
                      <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#0d9488;display:flex;align-items:center;gap:4px;">
                        📷 Bukti Telah Diperbaiki
                      </p>
                      <div style="width:100%;height:220px;background:#0f172a08;border:1px solid #a7f3d0;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
                        <img src="${photoClosedBase64}" style="width:100%;height:100%;object-fit:contain;" alt="Bukti Perbaikan" />
                      </div>
                    </div>
                  </div>
                ` : `
                  <div>
                    <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#e11d48;display:flex;align-items:center;gap:4px;">
                      📷 Foto Temuan Awal
                    </p>
                    <div style="width:100%;height:250px;background:#0f172a08;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
                      ${photoOpenBase64 ? `
                        <img src="${photoOpenBase64}" style="width:100%;height:100%;object-fit:contain;" alt="Temuan Awal" />
                      ` : `
                        <span style="font-size:11px;color:#94a3b8;">Foto awal tidak tersedia</span>
                      `}
                    </div>
                  </div>
                `}
              </div>

              <!-- Information Rows matching the user's screenshot layout -->
              <div style="display:flex;flex-direction:column;gap:12px;">
                <div>
                  <p style="margin:0;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">DILAPORKAN OLEH</p>
                  <p style="margin:2px 0 0 0;font-size:13px;font-weight:700;color:#0f172a;">${escapeHtml(t.requestorName || '-')}</p>
                </div>

                <div>
                  <p style="margin:0;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">AREA / LOKASI</p>
                  <p style="margin:2px 0 0 0;font-size:13px;font-weight:700;color:#0f172a;">${escapeHtml(t.location || '-')}</p>
                </div>

                <div>
                  <p style="margin:0 0 4px 0;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">DESKRIPSI TEMUAN</p>
                  ${descriptionHtml}
                </div>

                ${t.risk ? `
                  <div>
                    <p style="margin:0;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">RISIKO BAHAYA</p>
                    <p style="margin:2px 0 0 0;font-size:12px;font-weight:600;color:#b45309;">${escapeHtml(t.risk)}</p>
                  </div>
                ` : ''}

                <div>
                  <p style="margin:0;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">SARAN PENGENDALIAN / REKOMENDASI</p>
                  <p style="margin:2px 0 0 0;font-size:12px;font-weight:600;color:#2563eb;">${escapeHtml(t.initialControl || t.actionTaken || '-')}</p>
                </div>

                ${t.documentLink && t.documentLink !== '-' ? `
                  <div>
                    <p style="margin:0;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">DOKUMEN REFERENSI</p>
                    <p style="margin:2px 0 0 0;font-size:11px;color:#0284c7;font-family:monospace;word-break:break-all;">${escapeHtml(t.documentLink)}</p>
                  </div>
                ` : ''}

                <!-- Closure Section (matching screenshot bottom section) -->
                ${isClosed ? `
                  <div style="margin-top:4px;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
                    <p style="margin:0;font-size:12px;font-weight:700;color:#166534;display:flex;align-items:center;gap:6px;">
                      ✓ Diselesaikan Oleh: ${escapeHtml(t.pic || '-')}
                    </p>
                    ${t.actionTaken ? `
                      <p style="margin:4px 0 0 0;font-size:11px;color:#14532d;">
                        <strong>Tindakan:</strong> ${escapeHtml(t.actionTaken)}
                      </p>
                    ` : ''}
                    <p style="margin:4px 0 0 0;font-size:10px;color:#15803d;">
                      Selesai pada: ${completionDateStr}
                    </p>
                  </div>
                ` : `
                  <div style="margin-top:4px;padding:12px 14px;background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#be123c;">
                      ⚠️ Formulir Penutupan Tiket: Tiket Belum Ditutup (Status Terbuka / Open)
                    </p>
                    <p style="margin:3px 0 0 0;font-size:10px;color:#881337;">
                      Diperlukan tindakan perbaikan lapangan dan unggah foto bukti penyelesaian sebelum tiket dapat ditutup.
                    </p>
                  </div>
                `}
              </div>

            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#94a3b8;">
          <span>Sistem PrepLab Portal • Dicetak otomatis pada: ${printTimestamp}</span>
          <span style="font-weight:700;color:#64748b;">Halaman ${pageNum} dari ${total}</span>
        </div>
      `;

      host.innerHTML = '';
      host.appendChild(pageEl);

      // Render with html2canvas
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage();
      }

      // Add to A4 page (210mm x 297mm)
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    // Set PDF properties
    const safeWeek = selectedWeek.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeTitle = `Laporan_Rekapan_Temuan_${statusFilter}_${safeWeek}`;
    
    pdf.setProperties({
      title: safeTitle,
      subject: 'Laporan Rekapan Temuan Inspeksi K3 & Lingkungan PT TBP',
      creator: 'PrepLab Portal'
    });

    if (onProgress) {
      onProgress(total, total, 'Menyimpan dokumen PDF...');
    }

    pdf.save(`${safeTitle}.pdf`);
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
