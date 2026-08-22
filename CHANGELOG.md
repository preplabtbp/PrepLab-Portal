# Changelog - Prep & Lab Portal

All notable changes to the PrepLab Portal project will be documented in this file.

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
