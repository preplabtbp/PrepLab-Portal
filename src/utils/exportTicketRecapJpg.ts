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

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render an exact visual replica of the Ticket Detail Card as a JPEG (.jpg) Blob
 */
export async function renderTicketCardAsJpgBlob(ticket: any): Promise<Blob> {
  // @ts-ignore
  const { default: html2canvas } = await import('html2canvas');

  const isClosed = ticket.status?.toUpperCase() === 'CLOSED';

  // Convert photos to base64 so html2canvas never suffers from CORS issues
  let photoOpenBase64: string | null = null;
  let photoClosedBase64: string | null = null;

  if (ticket.photoUrl && ticket.photoUrl !== '-') {
    photoOpenBase64 = await fetchPhotoAsBase64(ticket.photoUrl);
  }
  if (ticket.closingPhoto && ticket.closingPhoto !== '-') {
    photoClosedBase64 = await fetchPhotoAsBase64(ticket.closingPhoto);
  }

  // Parse structured description
  const parsedFindings = parseFindingDescription(ticket.description);
  let descriptionHtml = '';
  if (parsedFindings.length === 0) {
    descriptionHtml = `<p style="margin:0;font-size:13px;color:#64748b;font-style:italic;">${escapeHtml(ticket.description || 'Tidak ada rincian deskripsi temuan.')}</p>`;
  } else if (parsedFindings.length === 1 && parsedFindings[0].type === 'general') {
    descriptionHtml = `<p style="margin:0;font-size:13px;font-weight:600;color:#e11d48;line-height:1.5;">${escapeHtml(parsedFindings[0].raw)}</p>`;
  } else {
    const header = parsedFindings[0]?.header;
    descriptionHtml = `
      ${header ? `<p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#334155;">${escapeHtml(header)}:</p>` : ''}
      <div style="display:flex;flex-direction:column;gap:5px;">
        ${parsedFindings.map(item => `
          <div style="display:flex;align-items:flex-start;gap:6px;font-size:13px;line-height:1.45;">
            <span style="font-weight:800;color:#e11d48;min-width:16px;flex-shrink:0;">${item.number}.</span>
            <div>
              ${item.type === 'apd' ? `
                <strong style="color:#0f172a;font-weight:700;">${escapeHtml(item.name || '')}</strong>
                ${item.role ? `<span style="color:#64748b;font-size:12px;margin-left:4px;">(${escapeHtml(item.role)})</span>` : ''}
                <span style="color:#94a3b8;margin:0 4px;">—</span>
                <span style="color:#e11d48;font-weight:700;">Tidak lengkap: ${escapeHtml((item.items || []).join(', '))}</span>
                ${item.note ? `<span style="color:#475569;font-size:12px;font-style:italic;margin-left:4px;">(Ket: ${escapeHtml(item.note)})</span>` : ''}
              ` : `
                <span style="color:#1e293b;font-weight:500;">${escapeHtml(item.raw)}</span>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  let completionDateStr = '-';
  if (ticket.completionDate) {
    try {
      const d = new Date(ticket.completionDate);
      if (!isNaN(d.getTime())) {
        completionDateStr = d.toLocaleString('id-ID');
      }
    } catch {}
  }

  // Create isolated offscreen container
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:640px;background:#ffffff;z-index:-9999;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
  
  host.innerHTML = `
    <div style="width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:22px;box-sizing:border-box;border-top:4px solid ${isClosed ? '#14b8a6' : '#f43f5e'};box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      
      <!-- Foto Temuan Awal Section -->
      ${photoOpenBase64 ? `
        <div style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#e11d48;margin-bottom:6px;">
            <svg style="width:14px;height:14px;stroke:#e11d48;fill:none;stroke-width:2;" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            <span>Foto Temuan Awal (Klik untuk perbesar)</span>
          </div>
          <div style="position:relative;width:100%;height:320px;background:#0f172a0a;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
            <img src="${photoOpenBase64}" style="width:100%;height:100%;object-fit:contain;" alt="Foto Temuan" />
            <div style="position:absolute;bottom:8px;right:8px;display:flex;align-items:center;gap:6px;">
              <div style="background:rgba(15,23,42,0.8);color:#ffffff;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:500;display:flex;align-items:center;gap:4px;">
                <svg style="width:12px;height:12px;stroke:#ffffff;fill:none;stroke-width:2;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Unduh</span>
              </div>
              <div style="background:rgba(15,23,42,0.8);color:#ffffff;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:500;display:flex;align-items:center;gap:4px;">
                <svg style="width:12px;height:12px;stroke:#ffffff;fill:none;stroke-width:2;" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                <span>Perbesar</span>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Fields List -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <p style="margin:0 0 2px 0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">DILAPORKAN OLEH</p>
          <p style="margin:0;font-size:14px;font-weight:500;color:#1e293b;">${escapeHtml(ticket.requestorName || '-')}</p>
        </div>

        <div>
          <p style="margin:0 0 2px 0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">AREA / LOKASI</p>
          <p style="margin:0;font-size:14px;font-weight:500;color:#1e293b;">${escapeHtml(ticket.location || '-')}</p>
        </div>

        <div>
          <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">DESKRIPSI TEMUAN</p>
          ${descriptionHtml}
        </div>

        ${ticket.risk ? `
          <div>
            <p style="margin:0 0 2px 0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">RISIKO BAHAYA</p>
            <p style="margin:0;font-size:14px;font-weight:500;color:#b45309;">${escapeHtml(ticket.risk)}</p>
          </div>
        ` : ''}

        <div>
          <p style="margin:0 0 2px 0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">SARAN PENGENDALIAN / REKOMENDASI</p>
          <p style="margin:0;font-size:14px;font-weight:500;color:#2563eb;">${escapeHtml(ticket.initialControl || ticket.actionTaken || '-')}</p>
        </div>

        ${ticket.documentLink && ticket.documentLink !== '-' ? `
          <div>
            <p style="margin:0 0 2px 0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">LINK DOKUMEN REFERENSI</p>
            <p style="margin:0;font-size:13px;font-weight:500;color:#2563eb;text-decoration:underline;">
              Lihat PDF Laporan Inspeksi &gt;
            </p>
          </div>
        ` : ''}
      </div>

      <!-- Bottom Closure / Form section matching user's screenshot -->
      ${isClosed ? `
        <div style="margin-top:22px;padding-top:18px;border-top:1px solid #f1f5f9;">
          ${photoClosedBase64 ? `
            <div style="margin-bottom:16px;">
              <div style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#0d9488;margin-bottom:6px;">
                <svg style="width:14px;height:14px;stroke:#0d9488;fill:none;stroke-width:2;" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                <span>Bukti Telah Diperbaiki (Klik untuk perbesar)</span>
              </div>
              <div style="position:relative;width:100%;height:320px;background:#0f172a0a;border:1px solid #ccfbf1;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
                <img src="${photoClosedBase64}" style="width:100%;height:100%;object-fit:contain;" alt="Bukti Perbaikan" />
                <div style="position:absolute;bottom:8px;right:8px;display:flex;align-items:center;gap:6px;">
                  <div style="background:rgba(15,23,42,0.8);color:#ffffff;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:500;display:flex;align-items:center;gap:4px;">
                    <svg style="width:12px;height:12px;stroke:#ffffff;fill:none;stroke-width:2;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>Unduh</span>
                  </div>
                  <div style="background:rgba(15,23,42,0.8);color:#ffffff;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:500;display:flex;align-items:center;gap:4px;">
                    <svg style="width:12px;height:12px;stroke:#ffffff;fill:none;stroke-width:2;" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    <span>Perbesar</span>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <div style="background:#f0fdf4;border:1px solid #ccfbf1;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px;">
            <p style="margin:0;font-size:14px;font-weight:500;color:#115e59;display:flex;align-items:center;gap:8px;">
              <svg style="width:18px;height:18px;stroke:#0d9488;fill:none;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <span>Diselesaikan Oleh: <strong>${escapeHtml(ticket.pic || '-')}</strong></span>
            </p>
            ${ticket.actionTaken ? `
              <p style="margin:0;font-size:13px;color:#134e4a;">
                <span style="font-weight:600;">Tindakan:</span> ${escapeHtml(ticket.actionTaken)}
              </p>
            ` : ''}
            <p style="margin:0;font-size:11px;color:#0d9488;">
              Selesai pada: ${completionDateStr}
            </p>
          </div>
        </div>
      ` : `
        <div style="margin-top:22px;padding-top:18px;border-top:1px solid #f1f5f9;display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#1e293b;">
            <svg style="width:16px;height:16px;stroke:#0d9488;fill:none;stroke-width:2;" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            <span>Formulir Penutupan Tiket Temuan</span>
          </div>

          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:#475569;margin-bottom:4px;">
              Tindakan Perbaikan yang Dilakukan *
            </label>
            <div style="width:100%;height:68px;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;box-sizing:border-box;font-size:12px;color:#94a3b8;background:#ffffff;">
              Jelaskan tindakan perbaikan yang telah selesai...
            </div>
          </div>

          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:#475569;margin-bottom:4px;">
              Foto Bukti Perbaikan *
            </label>
            <div style="width:100%;height:38px;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;box-sizing:border-box;font-size:12px;display:flex;align-items:center;gap:8px;background:#ffffff;">
              <span style="background:#f1f5f9;border:1px solid #cbd5e1;padding:3px 8px;border-radius:4px;font-size:11px;color:#334155;">Choose File</span>
              <span style="color:#64748b;font-size:11px;">No file chosen</span>
            </div>
          </div>

          <div style="width:100%;height:40px;background:#2563eb;color:#ffffff;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:600;margin-top:2px;">
            <svg style="width:16px;height:16px;stroke:#ffffff;fill:none;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            <span>Tutup Tiket (Selesai)</span>
          </div>
        </div>
      `}
    </div>
  `;

  document.body.appendChild(host);

  try {
    const cardEl = host.firstElementChild as HTMLElement;
    const canvas = await html2canvas(cardEl, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Gagal konversi canvas ke blob JPEG'));
      }, 'image/jpeg', 0.95);
    });
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}
