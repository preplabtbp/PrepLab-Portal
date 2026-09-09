import { Router } from "express";
import { db } from "../../src/db/index.js";
import { chatMessages, employees } from "../../src/db/schema.js";
import { eq, desc, asc, or, like, sql } from "drizzle-orm";

export const router = Router();

// Default Team Groups available for all PrepLab staff
export const DEFAULT_CHAT_GROUPS = [
  {
    id: "group_all",
    name: "Ruang Obrolan Umum (General)",
    type: "group",
    description: "Saluran komunikasi dan koordinasi umum seluruh staf Prep & Lab",
    badge: "Umum",
    icon: "Users"
  },
  {
    id: "group_prep",
    name: "Grup Preparasi Sampel",
    type: "group",
    description: "Diskusi & koordinasi divisi Preparasi Basah & Preparasi Kering",
    badge: "Preparation",
    icon: "Layers"
  },
  {
    id: "group_lab",
    name: "Grup Laboratorium Analisis",
    type: "group",
    description: "Diskusi teknis analisis XRF, AAS, Fusion, & Instrumen Lab",
    badge: "Laboratory",
    icon: "FlaskConical"
  },
  {
    id: "group_maintenance",
    name: "Grup Maintenance & Workshop",
    type: "group",
    description: "Perawatan alat, perbaikan perkakas, & koordinasi downtime",
    badge: "Maintenance",
    icon: "Wrench"
  },
  {
    id: "group_qaic",
    name: "Grup QA & Inventory Control",
    type: "group",
    description: "Kontrol stok bahan kimia, suku cadang, & standar mutu QA",
    badge: "QA/IC",
    icon: "ShieldCheck"
  }
];

// GET /api/chat/users - Daftar seluruh personil/kontak untuk direktori Teams
router.get("/api/chat/users", async (req, res) => {
  try {
    const allEmployees = await db
      .select({
        nik: employees.nik,
        name: employees.name,
        jabatan: employees.jabatan,
        section: employees.section,
        department: employees.department,
        avatar: employees.avatar,
        statusMess: employees.statusMess
      })
      .from(employees)
      .orderBy(asc(employees.name));

    const filtered = allEmployees.filter(emp => {
      const nik = (emp.nik || '').toUpperCase().trim();
      const name = (emp.name || '').toLowerCase().trim();
      if (
        nik === 'DEMO123' || nik === 'DEMO' || nik.includes('DEMO') ||
        name.includes('user demo') || name.includes('demo staging') || name.includes('staging')
      ) {
        return false;
      }
      return true;
    });

    res.json(filtered);
  } catch (error: any) {
    console.error("Error fetching chat users:", error);
    res.status(500).json({ error: "Failed to fetch chat users" });
  }
});

// GET /api/chat/groups - Daftar grup default
router.get("/api/chat/groups", (req, res) => {
  res.json(DEFAULT_CHAT_GROUPS);
});

// GET /api/chat/messages/:room - Ambil riwayat pesan per ruangan/chat
router.get("/api/chat/messages/:room", async (req, res) => {
  try {
    const room = req.params.room;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.room, room))
      .orderBy(asc(chatMessages.timestamp))
      .limit(limit);

    res.json(messages);
  } catch (error: any) {
    console.error(`Error fetching messages for room ${req.params.room}:`, error);
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

// GET /api/chat/conversations/:nik - Daftar percakapan aktif milik user
router.get("/api/chat/conversations/:nik", async (req, res) => {
  try {
    const userNik = req.params.nik;
    if (!userNik) return res.status(400).json({ error: "NIK is required" });

    // 1. Ambil pesan terbaru dari semua percakapan yang relevan
    // Relevan jika room adalah grup ATAU direct room yang memuat NIK user
    const recentMessages = await db
      .select()
      .from(chatMessages)
      .where(
        or(
          like(chatMessages.room, "group_%"),
          like(chatMessages.room, `direct_%${userNik}%`)
        )
      )
      .orderBy(desc(chatMessages.timestamp));

    // Petakan pesan terakhir per room
    const lastMessagePerRoom = new Map<string, any>();
    recentMessages.forEach((msg) => {
      if (!lastMessagePerRoom.has(msg.room)) {
        lastMessagePerRoom.set(msg.room, msg);
      }
    });

    res.json({
      groups: DEFAULT_CHAT_GROUPS.map((g) => ({
        ...g,
        lastMessage: lastMessagePerRoom.get(g.id) || null
      })),
      activeDirectRooms: Array.from(lastMessagePerRoom.entries())
        .filter(([roomId]) => roomId.startsWith("direct_"))
        .map(([roomId, lastMsg]) => {
          // Format room: direct_<nik1>_<nik2>
          const parts = roomId.replace("direct_", "").split("_");
          const otherNik = parts[0] === userNik ? parts[1] : parts[0];
          return {
            roomId,
            otherNik,
            lastMessage: lastMsg
          };
        })
    });
  } catch (error: any) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// POST /api/chat/messages - Fallback pengiriman pesan melalui REST
router.post("/api/chat/messages", async (req, res) => {
  try {
    const { room, senderNik, senderName, text } = req.body;
    if (!room || !senderNik || !text || !text.trim()) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const inserted = await db
      .insert(chatMessages)
      .values({
        room,
        senderNik,
        senderName: senderName || "Pengguna",
        text: text.trim(),
        timestamp: new Date()
      })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (error: any) {
    console.error("Error creating chat message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});
