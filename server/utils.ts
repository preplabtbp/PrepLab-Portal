import { db } from "../src/db/index.js";
import { 
  employees, pushSubscriptions, agendaEvents, bulletinPosts, 
  notifications, workOrders, tickets, spareparts, apdSettings, 
  apdHistory, apdDocuments, roster, inspections, pemantauan, 
  questions, privateNotes, userThemes, bulletinComments, uploadedFiles, 
  appSettings, pelanggaran, mealReports, quizQuestions, preplabCloudLogs, 
  quizScores, induksi, chatMessages, equipments, downtime, users, developerUsers, appFeedbacks
} from "../src/db/schema.js";
import { eq, inArray, or, sql } from "drizzle-orm";
import webpush from 'web-push';

export async function sendWebPush(notifs: any | any[]) {
  try {
    const notificationsArray = Array.isArray(notifs) ? notifs : [notifs];
    for (const notif of notificationsArray) {
      let subs: any[] = [];
      if (notif.userId) {
         subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.nik, notif.userId));
      } else if (notif.role) {
         const targetEmployees = await db.select().from(employees).where(eq(employees.department, notif.role));
         const niks = targetEmployees.map((e: any) => e.nik);
         if (niks.length > 0) {
            subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.nik, niks));
         }
      } else {
         subs = await db.select().from(pushSubscriptions);
      }
      
      for (const sub of subs) {
        try {
          const pushSub = JSON.parse(sub.subscription);
          await webpush.sendNotification(pushSub, JSON.stringify({
            title: notif.title,
            body: notif.message,
            url: notif.link || '/'
          }));
        } catch (e: any) {
          if (e.statusCode === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          }
        }
      }
    }
  } catch(err) { console.error('Push error:', err); }
}

export function getUniverse(pt: string) {
  if (!pt) return 'TBP_GPS';
  const ptUpper = pt.toUpperCase();
  if (ptUpper.includes('GTS')) return 'GTS';
  return 'TBP_GPS';
}

export async function uploadFileToDrive(token: string, base64Data: string, mimeType: string, filename: string, folderId: string) {
  const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
  const buffer = Buffer.from(base64Clean, 'base64');
  
  const metadata = { name: filename, parents: [folderId] };
  const boundary = '-------314159265358979323846';
  const delimiter = `\r--${boundary}\r`;
  const close_delim = `\r--${boundary}--\r`;
  
  const multipartRequestBody = Buffer.concat([
    Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\r'),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(delimiter + `Content-Type: ${mimeType}\r\r`),
    buffer,
    Buffer.from(close_delim)
  ]);
  
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });
  
  const data = await res.json();
  
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });
  } catch(e) {}
  
  return data.webViewLink;
}

export async function syncBulletinToAgenda(post: any) {
  try {
    const titleLower = (post.title || "").toLowerCase();
    const contentLower = typeof post.content === 'string' ? post.content.toLowerCase() : "";
    const isMeeting = 
      post.category === 'MEETING' ||
      post.category === 'WEEKLY' ||
      titleLower.includes('meeting') ||
      titleLower.includes('rapat') ||
      titleLower.includes('weekly') ||
      titleLower.includes('briefing') ||
      titleLower.includes('p5m') ||
      contentLower.includes('notulensi') ||
      contentLower.includes('agenda');

    if (isMeeting) {
      const eventId = `ag-bulletin-${post.id}-${Date.now()}`;
      await db.insert(agendaEvents).values({
        id: eventId,
        title: post.title.startsWith('[') ? post.title : `[Meeting] ${post.title}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 60 * 1000),
        kategori: 'General',
        pic: post.authorName || 'PIC Prep & Lab',
        deskripsi: typeof post.content === 'string' ? post.content.substring(0, 500) : '',
        creatorNik: post.authorNik || null,
        department: post.department || 'ALL',
        bulletinPostId: post.id,
      });
      console.log(`[Sync] Successfully synced bulletin meeting "${post.title}" to agenda_events (ID: ${eventId})`);
    }
  } catch (err) {
    console.error("Failed to sync bulletin to agenda:", err);
  }
}

export async function getNotificationTargets(dept: string) {
  try {
    if (dept === 'Prep & Lab') {
      return await db.select().from(employees).where(
        or(
          eq(employees.department, 'Prep & Lab'),
          eq(employees.department, 'Preparation'),
          eq(employees.department, 'Laboratory')
        )
      );
    } else if (dept === 'Grade 4+') {
      return await db.select().from(employees).where(
        sql`CAST(SUBSTRING(COALESCE(${employees.jobGrade}, '') FROM '[0-9]+') AS INTEGER) >= 4`
      );
    }
    return await db.select().from(employees).where(eq(employees.department, dept));
  } catch (e) {
    console.error("Error getNotificationTargets:", e);
    return [];
  }
}

export const getTableObj = (name: string) => {
  switch (name) {
    case "employees": return employees;
    case "equipments": return equipments;
    case "workOrders": return workOrders;
    case "users": return users;
    case "tickets": return tickets;
    case "spareparts": return spareparts;
    case "downtime": return downtime;
    case "apdSettings": return apdSettings;
    case "apdHistory": return apdHistory;
    case "apdDocuments": return apdDocuments;
    case "roster": return roster;
    case "inspections": return inspections;
    case "pemantauan": return pemantauan;
    case "questions": return questions;
    case "agendaEvents": return agendaEvents;
    case "privateNotes": return privateNotes;
    case "userThemes": return userThemes;
    case "bulletinPosts": return bulletinPosts;
    case "notifications": return notifications;
    case "bulletinComments": return bulletinComments;
    case "uploadedFiles": return uploadedFiles;
    case "appSettings": return appSettings;
    case "pelanggaran": return pelanggaran;
    case "mealReports": return mealReports;
    case "pushSubscriptions": return pushSubscriptions;
    case "quizQuestions": return quizQuestions;
    case "preplabCloudLogs": return preplabCloudLogs;
    case "quizScores": return quizScores;
    case "induksi": return induksi;
    case "chatMessages": return chatMessages;
    case "developerUsers": return developerUsers;
    case "appFeedbacks": return appFeedbacks;
    default: return null;
  }
};

export const sanitizePayload = (t: any, payload: any): any => {
  const cleaned: any = {};
  for (const key of Object.keys(payload)) {
    if (t[key]) {
      let val = payload[key];
      
      if (val === '' && t[key].dataType !== 'string') {
        val = null;
      }

      // Convert string dates to Date objects for pg-core date/timestamp columns
      if (val !== null && typeof val === 'string' && (t[key].dataType === 'date' || t[key].columnType === 'PgTimestamp' || t[key].columnType === 'PgDate')) {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) {
          val = parsed;
        } else {
          val = null;
        }
      }
      cleaned[key] = val;
    }
  }
  return cleaned;
};
