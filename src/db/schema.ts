import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, date, json } from 'drizzle-orm/pg-core';

// Define the 'users' table (Linked to Firebase Auth)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('user'), // 'admin', 'user', 'inspector', etc.
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'employees' table (Data Karyawan)
export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  nik: text('nik').notNull().unique(),
  name: text('name').notNull(),
  jabatan: text('jabatan'),
  jobGrade: text('job_grade'),
  section: text('section'),
  gol: text('gol'),
  shift: text('shift'),
  poh: text('poh'),
  pt: text('pt'),
  statusMess: text('status_mess'),
  rotation: text('rotation'),
  tanggalAwalBergabung: text('tanggal_awal_bergabung'),
  tanggalBergabungTerbaru: text('tanggal_bergabung_terbaru'),
  tanggalLahir: text('tanggal_lahir'),
  statusKontrak: text('status_kontrak'),
  department: text('department'),
  position: text('position'),
  statusKaryawan: text('status_karyawan'),
  tanggalJabatanBaru: text('tanggal_jabatan_baru'),
  masaKerja: text('masa_kerja'),
  masaKerjaJabatanTerakhir: text('masa_kerja_jabatan_terakhir'),
  tanggalPermanent: text('tanggal_permanent'),
  tempatLahir: text('tempat_lahir'),
  phone: text('phone'),
  keluargaKandung: text('keluarga_kandung'),
  phoneKeluarga: text('phone_keluarga'),
  orangTerdekat: text('orang_terdekat'),
  phoneDarurat: text('phone_darurat'),
  alamatKtp: text('alamat_ktp'),
  alamatDomisili: text('alamat_domisili'),
  ktp: text('ktp'),
  sponsor: text('sponsor'),
  email: text('email'),
  username: text('username'),
  passwordHash: text('password_hash'),
  avatar: text('avatar'),
  cover: text('cover'),
  firstLoginComplete: boolean('first_login_complete').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define 'equipments' table (Alat / Unit)
export const equipments = pgTable('equipments', {
  id: serial('id').primaryKey(),
  category: text('category').default('Asset'), // e.g. Asset Preparation, Asset Laboratory, Hand Tools
  assetCode: text('asset_code'), // Asset Code / KODE ASET
  itemName: text('item_name').notNull(),  // Item Name / NAMA BARANG
  itemCode: text('item_code'), // Item Code / Part Number
  itemDescription: text('item_description'), // Item Description / Description
  uom: text('uom'), // UoM
  brand: text('brand'), // Brand
  typeSpecification: text('type_specification'), // Type & Spesification
  serialNumber: text('serial_number'), // Serial Number
  dateReceive: text('date_receive'), // Date Receive / Tanggal diterima
  dateInstalled: text('date_installed'), // Date Installed
  status: text('status').default('IN USE'), // Status / Kondisi
  location: text('location'), // Location
  company: text('company'), // Company
  poNumber: text('po_number'), // PO Number
  price: text('price'), // Price (Rp) / Price Unit
  baScrap: text('ba_scrap'), // BA Scrap
  remarks: text('remarks'), // Remarks
  createdAt: timestamp('created_at').defaultNow(),
});

// Define 'work_orders' table (WO)
export const workOrders = pgTable('work_orders', {
  id: serial('id').primaryKey(),
  woId: text('wo_id').notNull().unique(), // Added based on WO_ID from sheets
  date: timestamp('date').notNull().defaultNow(),
  requestorNik: text('requestor_nik').notNull(), // Swapped to NIK instead of relational ID to make migration easier
  requestorName: text('requestor_name'),
  equipmentCode: text('equipment_code'), // Using string instead of relation ID initially
  equipmentName: text('equipment_name'),
  location: text('location'),
  category: text('category'),
  priority: text('priority').default('Medium'),
  issueDescription: text('issue_description').notNull(),
  status: text('status').default('Open'), // 'Open', 'In Progress', 'Closed'
  photoUrl: text('photo_url'),
  technicianPic: text('technician_pic'),
  repairStart: timestamp('repair_start'),
  repairEnd: timestamp('repair_end'),
  actionTaken: text('action_taken'),
  closingPhoto: text('closing_photo'),
  sparepartName: text('sparepart_name'),
  sparepartQty: text('sparepart_qty'),
  downtimeDuration: text('downtime_duration'), // String format
  shift: text('shift'),
  pdfUrl: text('pdf_url'),
  pt: text('pt').default('TBP'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Tickets (Internal & Inspeksi) ---
export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  ticketId: text('ticket_id').notNull().unique(),
  date: timestamp('date').notNull().defaultNow(),
  requestorName: text('requestor_name'),
  category: text('category'),
  location: text('location'),
  description: text('description'),
  priority: text('priority').default('Medium'),
  targetDate: text('target_date'),
  status: text('status').default('OPEN'),
  photoUrl: text('photo_url'),
  actionTaken: text('action_taken'),
  pic: text('pic'),
  completionDate: timestamp('completion_date'),
  source: text('source').default('internal'), // 'internal', 'inspeksi'
  closingPhoto: text('closing_photo'),
  risk: text('risk'),
  initialControl: text('initial_control'),
  documentLink: text('document_link'),
  sparepartName: text('sparepart_name'),
  sparepartQty: text('sparepart_qty'),
  pt: text('pt').default('TBP'),
});

// --- Downtime ---
export const downtime = pgTable('downtime', {
  id: serial('id').primaryKey(),
  toolName: text('tool_name'),
  breakdownTime: text('breakdown_time'),
  repairTime: text('repair_time'),
  notes: text('notes'),
  status: text('status').default('Active'),
});

// --- Spareparts ---
export const spareparts = pgTable('spareparts', {
  id: serial('id').primaryKey(),
  status: text('status'),
  keterangan: text('keterangan'),
  code: text('code'),
  item: text('item'), // Equivalent to name
  type: text('type'),
  spesifikasi: text('spesifikasi'),
  materialCode: text('material_code'),
  materialDescription: text('material_description'),
  lokasi: text('lokasi'),
  uom: text('uom'),
  category: text('category'),
  stock: integer('stock').default(0),
});

// --- APD Settings ---
export const apdSettings = pgTable('apd_settings', {
  id: serial('id').primaryKey(),
  itemName: text('item_name').notNull().unique(),
  intervalMonths: integer('interval_months').default(6),
});

// --- APD History ---
export const apdHistory = pgTable('apd_history', {
  id: serial('id').primaryKey(),
  nik: text('nik'),
  name: text('name'),
  itemName: text('item_name'),
  dateTaken: timestamp('date_taken').defaultNow(),
  photoUrl: text('photo_url'),
  pt: text('pt').default('TBP'),
});

// --- APD Documents ---
export const apdDocuments = pgTable('apd_documents', {
  id: serial('id').primaryKey(),
  docId: text('doc_id').notNull().unique(),
  date: timestamp('date').defaultNow(),
  nik: text('nik'),
  name: text('name'),
  status: text('status').default('Pending'),
  sptSignature: text('spt_signature'),
  managerSignature: text('manager_signature'),
  items: text('items'), // JSON stringified array of items
  pt: text('pt').default('TBP'),
  pdfUrl: text('pdf_url'),
});

// --- Roster ---
export const roster = pgTable('roster', {
  id: serial('id').primaryKey(),
  nik: text('nik'),
  date: text('date'), // YYYY-MM-DD
  status: text('status'), // DS, NS, OFF, CT, etc
  keterangan: text('keterangan'),
});

// --- Inspeksi ---
export const inspections = pgTable('inspections', {
  id: serial('id').primaryKey(),
  importId: text('import_id'), // For migrating old data without duplication
  date: timestamp('date').defaultNow(),
  inspectorName: text('inspector_name'),
  equipmentCode: text('equipment_code'),
  equipmentName: text('equipment_name'),
  location: text('location'),
  shift: text('shift'),
  type: text('type'), // Harian, Mingguan
  status: text('status'), // Aman, Rusak, dll
  keterangan: text('keterangan'),
  notes: text('notes'),
  photoUrl: text('photo_url'),
  signature: text('signature'),
  dataF: text('data_f'), // JSON stringified data
  pdfUrl: text('pdf_url'), // PDF generated from Google Apps Script or other source
  pt: text('pt').default('TBP'),
});

// --- Pemantauan ---
export const pemantauan = pgTable('pemantauan', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow(),
  idPemantauan: text('id_pemantauan').unique(),
  kategori: text('kategori'),
  tanggal: text('tanggal'),
  jam: text('jam'),
  shift: text('shift'),
  lokasiArea: text('lokasi_area'),
  suhuCelcius: text('suhu_celcius'),
  kelembapanPersen: text('kelembapan_persen'),
  flowGas: text('flow_gas'),
  tekananGasPsi: text('tekanan_gas_psi'),
  kebocoranYn: text('kebocoran_yn'),
  catatanRemark: text('catatan_remark'),
  inspektorPetugas: text('inspektor_petugas'),
  foto: text('foto'),
  suhuUpper: text('suhu_upper'),
  suhuLower: text('suhu_lower'),
  kelembapanUpper: text('kelembapan_upper'),
  kelembapanLower: text('kelembapan_lower'),
  fileReport: text('file_report'),
  ttd: text('ttd'),
});

// --- Questions ---
export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  category: text('category'),
  questionText: text('question_text'),
  idForm: text('id_form'),
  judulForm: text('judul_form'),
  tipeInput: text('tipe_input'),
  kategori: text('kategori'),
  item: text('item'),
  info1: text('info1'),
  info2: text('info2'),
  info3: text('info3'),
  info4: text('info4'),
});

// --- Agenda Events ---
export const agendaEvents = pgTable('agenda_events', {
  universe: text('universe').default('TBP_GPS'),
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  kategori: text('kategori'),
  pic: text('pic'),
  deskripsi: text('deskripsi'),
  routineId: text('routine_id'),
  creatorNik: text('creator_nik'),
  attachmentUrl: text('attachment_url'),
  isRoutine: boolean('is_routine').default(false),
  frekuensi: text('frekuensi'),
  department: text('department'),
  bulletinPostId: integer('bulletin_post_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Private Notes ---
export const privateNotes = pgTable('private_notes', {
  id: text('id').primaryKey(),
  nik: text('nik'),
  title: text('title'),
  content: text('content'),
  color: text('color').default('#FFFBEB'),
  attachmentUrl: text('attachment_url'),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- User Themes ---
export const userThemes = pgTable('user_themes', {
  id: serial('id').primaryKey(),
  nik: text('nik').notNull(),
  mode: text('mode').notNull(),
  themeName: text('theme_name'),
  colors: text('colors'), // JSON string
  isPublished: boolean('is_published').default(false),
  authorName: text('author_name'),
  publishedAt: timestamp('published_at'),
  likesCount: integer('likes_count').default(0),
  likedBy: text('liked_by').array(),
  likedByUsers: text('liked_by_users'), // JSON array [{ nik, name, role }]
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- Community Quotes Pool ---
export const communityQuotes = pgTable('community_quotes', {
  id: serial('id').primaryKey(),
  quote: text('quote').notNull(),
  authorNik: text('author_nik').notNull(),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role'),
  authorSection: text('author_section'),
  category: text('category').default('Motivasi & Skena'),
  likesCount: integer('likes_count').default(0),
  likedBy: text('liked_by').array(),
  likedByUsers: text('liked_by_users'), // JSON array [{ nik, name, role }]
  isApproved: boolean('is_approved').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


export const bulletinPosts = pgTable('bulletin_posts', {
  universe: text('universe').default('TBP_GPS'),
  id: serial('id').primaryKey(),
  title: text('title'),
  notionId: text('notion_id').unique(),
  coverImage: text('cover_image'),
  tags: text('tags').array(),
  originalCreatedAt: timestamp('original_created_at'),
  department: text('department').notNull(),
  category: text('category').notNull(),
  content: text('content').notNull(),
  authorNik: text('author_nik'),
  authorName: text('author_name'),
  pt: text('pt').default('TBP'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Notifications ---
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: text('user_id'), // To target a specific user
  role: text('role'), // Or to target a specific role
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info'), // info, success, warning, error
  isRead: boolean('is_read').default(false),
  link: text('link'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bulletinComments = pgTable('bulletin_comments', {
  universe: text('universe').default('TBP_GPS'),
  id: serial('id').primaryKey(),
  postId: integer('post_id').references(() => bulletinPosts.id).notNull(),
  topicTitle: text('topic_title'),
  topicId: text('topic_id'),
  section: text('section'),
  category: text('category'),
  statusUpdate: text('status_update'),
  authorNik: text('author_nik'),
  authorName: text('author_name'),
  content: text('content').notNull(),
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const uploadedFiles = pgTable('uploaded_files', {
  universe: text('universe').default('TBP_GPS'),
  id: serial('id').primaryKey(),
  filename: text('filename'),
  mimeType: text('mime_type'),
  base64Data: text('base64_data'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- App Settings ---
export const appSettings = pgTable('app_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(),
  settingValue: text('setting_value'),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow(),
});


// Define the 'pelanggaran' table
export const pelanggaran = pgTable('pelanggaran', {
  id: serial('id').primaryKey(),
  nama: text('nama').notNull(),
  status: text('status').notNull(),
  tanggal: text('tanggal').notNull(),
  penjelasan: text('penjelasan'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mealReports = pgTable('meal_reports', {
  id: serial('id').primaryKey(),
  nik: text('nik').notNull(),
  name: text('name').notNull(),
  department: text('department'),
  reportDate: date('report_date').notNull(),
  shift: text('shift'),
  meals: text('meals'),
  status: text('status').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow()
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  nik: text('nik').notNull(),
  subscription: text('subscription').notNull(), // JSON string of the PushSubscription object
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow()
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  room: text('room').notNull(), // 'global', or room ID
  senderNik: text('sender_nik').notNull(),
  senderName: text('sender_name').notNull(),
  text: text('text').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

export const quizQuestions = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(),
  text: text('text').notNull(),
  options: text('options').array().notNull(),
  correctAnswerIndex: integer('correct_answer_index').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const preplabCloudLogs = pgTable('preplab_cloud_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  userName: text('user_name'),
  action: text('action'),
  fileName: text('file_name'),
  folderName: text('folder_name'),
  timestamp: timestamp('timestamp').defaultNow(),
});
export const quizScores = pgTable('quiz_scores', {
  id: serial('id').primaryKey(),
  nik: text('nik').notNull(),
  name: text('name').notNull(),
  department: text('department'),
  score: integer('score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  percentage: integer('percentage').notNull(),
  quizVersion: text('quiz_version'),
  pt: text('pt').default('TBP'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const easterEggProgress = pgTable('easter_egg_progress', {
  nik: text('nik').primaryKey(),
  node: integer('node').notNull().default(0),
  lastUpdated: timestamp('last_updated').defaultNow(),
});

// --- P5M ---
export const p5mMateri = pgTable('p5m_materi', {
  id: serial('id').primaryKey(),
  judul: text('judul').notNull(),
  kategori: text('kategori').notNull().default('Teknis'), // Teknis, Non-Teknis
  subKategori: text('sub_kategori').notNull().default('General'), // General, Laboratory, Preparation, Maintenance
  divisi: text('divisi').default('All'), // All, Preparation, Laboratory, Maintenance
  fileUrl: text('file_url'),
  notionId: text('notion_id'),
  isInternal: boolean('is_internal').default(false),
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const p5mSchedules = pgTable('p5m_schedules', {
  id: serial('id').primaryKey(),
  weekNumber: integer('week_number'),
  year: integer('year'),
  dateStart: text('date_start'),
  dateEnd: text('date_end'),
  scheduleData: json('schedule_data'),
  config: json('config'),
  summary: json('summary'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const induksi = pgTable("induksi", {
  id: serial("id").primaryKey(),
  tipeInduksi: text("tipe_induksi"),
  perusahaan: text("perusahaan"),
  namaPeserta: text("nama_peserta"),
  nikPeserta: text("nik_peserta"),
  jabatanPeserta: text("jabatan_peserta"),
  namaInduktor: text("nama_induktor"),
  jabatanInduktor: text("jabatan_induktor"),
  tanggal: text("tanggal"),
  materiData: json("materi_data"),
  pdfUrl: text("pdf_url"),
  pdfId: text("pdf_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const developerUsers = pgTable('developer_users', {
  id: serial('id').primaryKey(),
  nik: text('nik').notNull().unique(),
  name: text('name'),
  addedAt: timestamp('added_at').defaultNow(),
});

// Define 'app_feedbacks' table (Feedback & Bug Reports)
export const appFeedbacks = pgTable('app_feedbacks', {
  id: serial('id').primaryKey(),
  type: text('type').notNull().default('bug'), // 'bug', 'suggestion', 'improvement', 'question'
  category: text('category'), // 'Sistem & Error', 'UI / Tampilan', 'Fitur Baru', 'Kecepatan / Loading', 'Lainnya'
  module: text('module'), // 'Roster & Cuti', 'Inspeksi & P2H', 'P5M', 'Work Order', 'Sistem APD', 'Quotes Motivasi', 'Cloud & Drive', 'Umum'
  priority: text('priority').notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  title: text('title').notNull(),
  description: text('description').notNull(),
  screenshotUrl: text('screenshot_url'),
  authorNik: text('author_nik').notNull(),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role'),
  authorSection: text('author_section'),
  status: text('status').notNull().default('PENDING'), // 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'
  developerNotes: text('developer_notes'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

