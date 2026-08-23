# Changelog - Prep & Lab Portal

All notable changes to the PrepLab Portal project will be documented in this file.

---

## [2.5.0] - 2026-08-23

### 🚀 Added
- **P5M & Safety Talk Management Module (`p5m-screen.tsx`)**:
  - **Materi Management UI/UX**: Added "Bank Data Materi P5M" interface with search, division filters, sub-category tags, and "+ Tambah Materi Baru" modal.
  - **Direct Flyer Upload**: Supported drag-and-drop / file picker for flyer posters (PNG/JPG up to 10MB) with automatic upload to Google Drive (`P5M_Materi_Flyers`) and metadata storage in PostgreSQL.
  - **Materi Management Backend Endpoints (`server/routes/p5m.ts`)**:
    - `GET /api/p5m/materi` & `GET /api/p5m/materi-list`: Fast search & category filtering for briefing materials.
    - `POST /api/p5m/materi`: Uploads base64 flyer to Google Drive and inserts record into Cloud SQL.
    - `DELETE /api/p5m/materi/:id`: Safe removal of obsolete briefing materials.
  - **Reliable Flyer Image & Download Proxy**:
    - Enhanced `GET /api/p5m/flyer` with streaming and `download=true` support (`Content-Disposition: attachment`), preventing broken links and CORS issues.
- **Presenter Briefing Notification Modal (`p5m-notification-modal.tsx`)**:
  - Automatically alerts assigned personnel when logging into the portal with topic title, date, shift, and one-click flyer viewer/download.
  - **Past Date Filtering**: Integrated WIT (UTC+9) timezone date checks (`todayIso > assignmentDateIso`) so pop-up notifications will not appear for sessions whose scheduled date has already passed.

### 🔄 Migrated
- **P5M Database & Flyer Storage (Notion ➡️ Cloud SQL & Google Drive)**:
  - Migrated all **88 P5M briefing topics & flyers** completely from Notion to Google Drive (`P5M_Materi_Flyers`, Folder ID: `1AH151Lrgklv4Q1Ty0vdEgsPES6VcCKps`).
  - Saved full relational metadata in PostgreSQL table `p5m_materi` with Google Drive direct view URLs, eliminating external Notion dependency.

### 🎨 UI & UX Improvements
- **Schedule Matrix Color Palette & Visual Index**:
  - Overhauled color tokens for Day Shift (warm yellow-amber/orange) vs. Night Shift (indigo/navy/slate) and Preparation (orange) vs. Laboratory (emerald green) to eliminate ambiguous visual overlaps.
  - Hardened text clipping boundaries and badge containers in Shift & Zone headers.
  - Thickened outline marker (`border-2`) with distinct section color accents for personnel assigned to **2× briefing** in a single week.

### 🧹 Maintenance & Database Cleanup
- **Schedule Reset (Clean Slate)**:
  - Cleaned all test scheduling entries from `p5m_schedules` and reset `last_used = NULL` across all 88 materi records in `p5m_materi` to prepare for actual production scheduling.

---

## [2.4.0] - 2026-08-22

### 🚀 Added
- **Prep & Lab Bulletin Module**:
  - Rebranded module from "Prep & Lab Notion" to **"Prep & Lab Bulletin"** across navigation sidebar, breadcrumbs, and page headers.
  - Integrated bidirectional event synchronization with the Agenda module (excluding personnel birthdays which remain isolated to the Quality Assurance section).
- **Dynamic Section Hub Dashboard (`SectionHubDashboard.tsx`)**:
  - Implemented automatic homepage rendering for all section workspaces (`ADMINISTRASI`, `LABORATORIUM`, `PREPARASI`, `IT`, `K3LH / SAFETY`, etc.).
  - Added interactive navigation cards, child page explorer, and category switchers.
- **Enhanced Notion Database Table (`NotionDatabaseTable.tsx`)**:
  - Interactive multi-view component supporting Table View, Kanban Board, and List View.
  - Live filtering by Status (`OPEN`, `ON PROGRESS`, `CLOSE`, `PENDING`), Priority (`High`, `Medium`, `Low`), and dynamic search query.
  - Column mapper that prioritizes `Jenis Kegiatan`, `Nama`, `Task`, `Judul`, and `Rencana Tindakan` as primary topic titles.
- **Topic Discussions & Live Progress Updates**:
  - Integrated discussion threads for every bulletin topic with personnel avatars, timestamps, and status update badges.
  - Web push notifications automatically dispatched to section team members when a progress update is submitted.
- **Direct Google Drive Media & Document Streaming Proxy**:
  - Added backend proxy endpoints `GET /api/drive/view/:fileId` and `GET /api/drive/download/:fileId` in `server/routes/bulletin.ts`.
  - Bypasses Google Drive hotlinking and CORS restrictions, ensuring 100% reliable thumbnail loading and instant image viewing.
  - Integrated fullscreen Image Lightbox Modal with zoom, external Google Drive viewer, and one-click file download.
  - Added attachment upload support in the comment box with direct Google Drive cloud storage.

### 🔄 Migrated
- **Notion Historical Comments & Attachments**:
  - Migrated 101 historical comments and 182 media attachments (`.jpg`, `.png`, `.xlsx`, `.pdf`) from Notion to Google Drive (`1JE6EusixbK7saIzboKNOk9aMiAqEX-zF`).
  - Synced comment attachments into PostgreSQL (`bulletin_comments.file_url` & `fileName`).
  - Restored locker inventory verification image (`gambar.jpg`) under topic *"Pengecekan Loker Lab"*.

### 🛠 Fixed
- **Multi-Tenancy Post Separation**:
  - Cleanly isolated TBP and GTS post records in `bulletin_posts` to prevent GTS data from overlapping inside TBP Non Routine Laboratorium.
- **Direct Image Previews**:
  - Resolved broken image thumbnail icon caused by Google Drive `lh3.googleusercontent.com` access blocks by routing all media requests through the local authenticated streaming proxy.
