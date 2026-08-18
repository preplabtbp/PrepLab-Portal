#!/bin/bash
cat << 'INNER_EOF' > /tmp/server.ts.patch
--- server.ts
+++ server.ts
@@ -870,85 +870,86 @@
       if (newWO.repairStart) newWO.repairStart = new Date(newWO.repairStart);
       if (newWO.repairEnd) newWO.repairEnd = new Date(newWO.repairEnd);
       
       const result = await db.insert(workOrders).values(newWO).returning();
       const createdWO = result[0];
       let pdfUrl = null;
       let waMessageText = '';
 
-      // Synchronous PDF Generation so we can return the URL
       try {
         const dateObj = new Date(createdWO.date);
         const tanggalStr = dateObj.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
         const waktuStr = dateObj.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
         
         let jabatanUser = '-';
         if (createdWO.requestorNik) {
           const empRes = await db.select().from(employees).where(eq(employees.nik, createdWO.requestorNik)).limit(1);
           if (empRes.length > 0 && empRes[0].jabatan) {
             jabatanUser = empRes[0].jabatan;
           }
         }
 
+        waMessageText = `==== LAPORAN KERUSAKAN ====\n` +
+        `- *Tipe: ${(createdWO.category || 'N/A').toUpperCase()}*\n\n` +
+        `- *Pelapor*\n` +
+        `Nama   : ${createdWO.requestorName}\n` +
+        `Jabatan: ${jabatanUser}\n\n` +
+        `- *Detail Barang*\n` +
+        `Item     : ${createdWO.equipmentName}\n` +
+        `No. Alat : ${createdWO.equipmentCode || '-'}\n` +
+        `No. Asset: ${'-'}\n\n` +
+        `- *Lokasi*\n` +
+        `Posisi : ${createdWO.location || '-'}\n` +
+        `Ruangan: ${createdWO.location || '-'}\n\n` +
+        `- *Detail Kerusakan*\n` +
+        `${createdWO.issueDescription}\n\n`;
+
+        const devOptions = newWO.devOptions;
+        if (!devOptions || devOptions.pdf !== false) {
-        const replacements = {
-          '<<NAMA KARYAWAN>>': createdWO.requestorName || '-',
-          '<<JABATAN KARYAWAN>>': jabatanUser,
-          '<<SHIFT>>': createdWO.shift || '-',
-          '<<NAMA ALAT>>': createdWO.equipmentName || '-',
-          '<<NO ALAT>>': createdWO.equipmentCode || '-',
-          '<<NO ASSET>>': '-', // Not provided in WO form
-          '<<POSISI ALAT>>': createdWO.location || '-',
-          '<<RUANGAN>>': createdWO.location || '-',
-          '<<Tanggal>>': tanggalStr,
-          '<<Waktu>>': waktuStr,
-          '<<Kerusakan>>': createdWO.issueDescription || '-'
-        };
-        
-        const images: Record<string, string> = {};
-        if (createdWO.photoUrl) images['<<FOTOKERUSAKAN>>'] = createdWO.photoUrl;
-        if (ttdUser) images['<<TTDUSER>>'] = ttdUser;
-
-        const settingsObj: Record<string, string> = {};
-        const allSettings = await db.select().from(appSettings);
-        allSettings.forEach(s => {
-          settingsObj[s.settingKey] = s.settingValue || '';
-        });
-
-        const TEMPLATE_ID = settingsObj['WO_TEMPLATE_DOC_ID'] || '1yechtOPL904YREPCfsxR5AJbyHyfVD9MwORu_ymD7eY';
-        const FOLDER_ID = settingsObj['WO_PDF_DRIVE_FOLDER_ID'] || process.env.GOOGLE_DRIVE_FOLDER_ID || '1JJZKj7X1vsNNP5dTWDYJ_-0xYVhU0Bu7';
-        
-        const pdfRes = await generatePdfFromTemplate(
-          TEMPLATE_ID, 
-          FOLDER_ID, 
-          replacements, 
-          createdWO.woId,
-          images
-        );
-
-        if (pdfRes.success) {
-          pdfUrl = pdfRes.pdfUrl;
-          await db.update(workOrders)
-            .set({ pdfUrl: pdfRes.pdfUrl })
-            .where(eq(workOrders.woId, createdWO.woId));
-          
-          console.log(`PDF WO ${createdWO.woId} generated successfully: ${pdfRes.pdfUrl}`);
-          
-          waMessageText = `==== LAPORAN KERUSAKAN ====\n` +
-          `- *Tipe: ${(createdWO.category || 'N/A').toUpperCase()}*\n\n` +
-          `- *Pelapor*\n` +
-          `Nama   : ${createdWO.requestorName}\n` +
-          `Jabatan: ${jabatanUser}\n\n` +
-          `- *Detail Barang*\n` +
-          `Item     : ${createdWO.equipmentName}\n` +
-          `No. Alat : ${createdWO.equipmentCode || '-'}\n` +
-          `No. Asset: ${'-'}\n\n` +
-          `- *Lokasi*\n` +
-          `Posisi : ${createdWO.location || '-'}\n` +
-          `Ruangan: ${createdWO.location || '-'}\n\n` +
-          `- *Detail Kerusakan*\n` +
-          `${createdWO.issueDescription}\n\n` +
-          `- *Dokumen Kerusakan*\n` +
-          `${pdfRes.pdfUrl}`;
-        }
+          const replacements = {
+            '<<NAMA KARYAWAN>>': createdWO.requestorName || '-',
+            '<<JABATAN KARYAWAN>>': jabatanUser,
+            '<<SHIFT>>': createdWO.shift || '-',
+            '<<NAMA ALAT>>': createdWO.equipmentName || '-',
+            '<<NO ALAT>>': createdWO.equipmentCode || '-',
+            '<<NO ASSET>>': '-', // Not provided in WO form
+            '<<POSISI ALAT>>': createdWO.location || '-',
+            '<<RUANGAN>>': createdWO.location || '-',
+            '<<Tanggal>>': tanggalStr,
+            '<<Waktu>>': waktuStr,
+            '<<Kerusakan>>': createdWO.issueDescription || '-'
+          };
+          
+          const images: Record<string, string> = {};
+          if (createdWO.photoUrl) images['<<FOTOKERUSAKAN>>'] = createdWO.photoUrl;
+          if (ttdUser) images['<<TTDUSER>>'] = ttdUser;
+
+          const settingsObj: Record<string, string> = {};
+          const allSettings = await db.select().from(appSettings);
+          allSettings.forEach(s => {
+            settingsObj[s.settingKey] = s.settingValue || '';
+          });
+
+          const TEMPLATE_ID = settingsObj['WO_TEMPLATE_DOC_ID'] || '1yechtOPL904YREPCfsxR5AJbyHyfVD9MwORu_ymD7eY';
+          const FOLDER_ID = settingsObj['WO_PDF_DRIVE_FOLDER_ID'] || process.env.GOOGLE_DRIVE_FOLDER_ID || '1JJZKj7X1vsNNP5dTWDYJ_-0xYVhU0Bu7';
+          
+          const pdfRes = await generatePdfFromTemplate(
+            TEMPLATE_ID, 
+            FOLDER_ID, 
+            replacements, 
+            createdWO.woId,
+            images
+          );
+
+          if (pdfRes.success) {
+            pdfUrl = pdfRes.pdfUrl;
+            await db.update(workOrders)
+              .set({ pdfUrl: pdfRes.pdfUrl })
+              .where(eq(workOrders.woId, createdWO.woId));
+            
+            console.log(`PDF WO ${createdWO.woId} generated successfully: ${pdfRes.pdfUrl}`);
+            waMessageText += `- *Dokumen Kerusakan*\n${pdfRes.pdfUrl}`;
+          } else {
+            waMessageText += `- *Dokumen Kerusakan*\n(Gagal Generate PDF)`;
+          }
+        } else {
+          waMessageText += `- *Dokumen Kerusakan*\n(Dilewati / PDF dinonaktifkan)`;
+        }
       } catch (pdfErr: any) {
         console.error(`Gagal generate PDF WO for ${createdWO.woId}:`, pdfErr.message);
+        waMessageText += `- *Dokumen Kerusakan*\n(Error generate PDF)`;
       }
INNER_EOF
patch -p0 < /tmp/server.ts.patch
