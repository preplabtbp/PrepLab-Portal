import { Router } from "express";
import { db } from "../../src/db/index.js";
import { 
  ktaReports, inspections, roster, appFeedbacks, communityQuotes, 
  userThemes, bulletinComments, bulletinPosts, p5mSchedules, quizScores, 
  employees, appSettings, gamificationMilestones
} from "../../src/db/schema.js";
import { eq, sql, desc, or, and, count } from "drizzle-orm";
import { VANGUARD_RANKS, POINT_BLANK_RANKS, getRankByXp } from "../../src/lib/pointBlankRanks.js";
import { TIERED_ACHIEVEMENTS, calculateBranchProgress } from "../../src/lib/gamificationEngine.js";
import { broadcastGlobalChatMessage } from "../utils.js";

export const gamificationRouter = Router();

export function normalizeSection(sec?: string | null, dept?: string | null, pos?: string | null): string {
  const s = (sec || '').toUpperCase();
  const d = (dept || '').toUpperCase();
  const p = (pos || '').toUpperCase();

  if (s.includes('QA') || s.includes('QUALITY') || d.includes('QA') || d.includes('QUALITY') || p.includes('QA') || p.includes('QUALITY')) {
    return 'Quality Assurance';
  }
  if (s.includes('LAB') || d.includes('LAB') || p.includes('LAB')) {
    return 'Laboratory';
  }
  if (s.includes('PREP') || d.includes('PREP') || p.includes('PREP') || s.includes('WET') || s.includes('DRY')) {
    return 'Preparation';
  }
  if (s.includes('MAINT') || d.includes('MAINT') || p.includes('MAINT')) {
    return 'Maintenance';
  }
  if (s.includes('ADMIN') || d.includes('ADMIN') || s.includes('INVENTORY') || s.includes('MANAGER')) {
    return 'Administration';
  }
  return sec || dept || 'Preparation';
}

// In-memory cache for leaderboard
let cachedLeaderboardData: {
  leaderboard: any[];
  sectionScores: any[];
  ranksMaster: any[];
  achievementsMaster: any[];
  seasonInfo: any;
  timestamp: number;
} | null = null;
const CACHE_TTL_MS = 30 * 1000;

// Helper to determine the active Season Start Cutoff Date
export async function getSeasonStartDate(): Promise<Date> {
  // 1. Environment variable override
  if (process.env.GAMIFICATION_SEASON_START) {
    const d = new Date(process.env.GAMIFICATION_SEASON_START);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Database appSettings check (key: 'gamification_season_start')
  try {
    const setting = await db.select({ val: appSettings.settingValue })
      .from(appSettings)
      .where(eq(appSettings.settingKey, 'gamification_season_start'))
      .limit(1);

    if (setting.length > 0 && setting[0]?.val) {
      const d = new Date(setting[0].val);
      if (!isNaN(d.getTime())) return d;
    }
  } catch (e) {
    console.warn("Error fetching gamification_season_start setting:", e);
  }

  // 3. Default baseline cutoff date for Season 1 (Main Release)
  return new Date('2026-09-19T00:00:00Z');
}

// Helper to check and broadcast achievement unlocks and top 3 rank promotions
export async function checkAndBroadcastMilestones(
  nik: string,
  name: string,
  rankId: number,
  rankName: string,
  branchResults: any[]
) {
  try {
    const cleanNik = String(nik).trim().toUpperCase();

    // 1. Broadcast Top 3 Pangkat Tertinggi: Rank 49 (Lt General), 50 (General), 51 (Supreme Vanguard Commander)
    if (rankId >= 49) {
      const milestoneKey = `RANK_${rankId}`;
      const existing = await db.select()
        .from(gamificationMilestones)
        .where(and(
          eq(gamificationMilestones.nik, cleanNik),
          eq(gamificationMilestones.milestoneKey, milestoneKey)
        ))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(gamificationMilestones).values({
          nik: cleanNik,
          milestoneType: 'RANK_PROMOTION',
          milestoneKey,
          title: rankName
        });

        await broadcastGlobalChatMessage({
          text: `🎖️ [PENGHORMATAN TERTINGGI]: Seluruh divisi beri hormat! ${name} (@${cleanNik}) telah resmi dipromosikan ke jenjang prestisius: ${rankName} (#${rankId}/51)!`,
          senderName: 'HQ VANGUARD COMMAND',
          senderNik: 'SYSTEM_BROADCAST',
          isAnnouncement: true,
          metadata: { type: 'RANK_PROMOTION', rankId, rankName, name, nik: cleanNik }
        });
      }
    }

    // 2. Broadcast Unlocked Achievement Tiers
    if (Array.isArray(branchResults)) {
      for (const b of branchResults) {
        if (b.unlockedTitles && b.unlockedTitles.length > 0 && b.branch && b.branch.tiers) {
          for (const t of b.branch.tiers) {
            if (b.progressCount >= t.requiredCount) {
              const milestoneKey = `ACH_${b.branch.code}_T${t.tierLevel}`;
              const existing = await db.select()
                .from(gamificationMilestones)
                .where(and(
                  eq(gamificationMilestones.nik, cleanNik),
                  eq(gamificationMilestones.milestoneKey, milestoneKey)
                ))
                .limit(1);

              if (existing.length === 0) {
                await db.insert(gamificationMilestones).values({
                  nik: cleanNik,
                  milestoneType: 'ACHIEVEMENT',
                  milestoneKey,
                  title: `${b.branch.name} - ${t.tierName}`
                });

                await broadcastGlobalChatMessage({
                  text: `🎉 [ACHIEVEMENT UNLOCKED]: Selamat kepada ${name} (@${cleanNik}) atas keberhasilan mengungkap Secret Achievement "${b.branch.name}" (${t.tierName})! Membuka Gelar Kehormatan [${t.titleReward}] & Kosmetik Eksklusif Portal!`,
                  senderName: 'HQ VANGUARD COMMAND',
                  senderNik: 'SYSTEM_BROADCAST',
                  isAnnouncement: true,
                  metadata: { type: 'ACHIEVEMENT_UNLOCKED', branchName: b.branch.name, tierName: t.tierName, title: t.titleReward, name, nik: cleanNik }
                });
              }
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[Gamification Milestone Broadcast Notice]:', err?.message);
  }
}

// Helper to compute user gamification metrics and XP
export async function computeUserGamification(nik: string, userName?: string) {
  const cleanNik = String(nik).trim().toUpperCase();
  const seasonStart = await getSeasonStartDate();

  // Resolve employee metadata from database
  let resolvedName = userName || 'Personil PrepLab';
  let resolvedSection = 'Preparation';
  let resolvedPt = 'TBP';
  let resolvedEquippedFrame = 'default';
  let resolvedEquippedTitle = 'Frontline Trainee';
  let resolvedAvatar: string | null = null;

  try {
    const emp = await db.select({
      name: employees.name,
      section: employees.section,
      department: employees.department,
      position: employees.position,
      pt: employees.pt,
      equippedFrame: employees.equippedFrame,
      equippedTitle: employees.equippedTitle,
      avatar: employees.avatar
    })
    .from(employees)
    .where(sql`UPPER(${employees.nik}) = ${cleanNik}`)
    .limit(1);

    if (emp && emp.length > 0) {
      if (!userName || userName.includes('Personil')) resolvedName = emp[0].name;
      resolvedSection = normalizeSection(emp[0].section, emp[0].department, emp[0].position);
      resolvedPt = (emp[0].pt || 'TBP').trim().toUpperCase();
      resolvedEquippedFrame = emp[0].equippedFrame || 'default';
      resolvedEquippedTitle = emp[0].equippedTitle || 'Frontline Trainee';
      resolvedAvatar = emp[0].avatar || null;
    }
  } catch (e) {
    console.warn("Error resolving employee for gamification:", e);
  }

  // 1. KTA count (within active season)
  let ktaCount = 0;
  try {
    const ktaRes = await db.select({ count: count() })
      .from(ktaReports)
      .where(and(
        sql`UPPER(${ktaReports.nik}) = ${cleanNik}`,
        sql`${ktaReports.createdAt} >= ${seasonStart}`
      ));
    ktaCount = Number(ktaRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting KTA:", e);
  }

  // 2. Inspections & Defect count (within active season)
  let inspectionCount = 0;
  let defectCount = 0;
  let nightCount = 0;
  try {
    const inspList = await db.select({
      id: inspections.id,
      status: inspections.status,
      keterangan: inspections.keterangan,
      date: inspections.date,
      inspectorName: inspections.inspectorName
    })
    .from(inspections)
    .where(and(
      or(
        sql`UPPER(${inspections.equipmentCode}) = ${cleanNik}`, // fallback
        sql`UPPER(${inspections.inspectorName}) LIKE ${'%' + (userName || cleanNik).toUpperCase() + '%'}`
      ),
      sql`${inspections.date} >= ${seasonStart}`
    ));

    inspectionCount = inspList.length;
    for (const item of inspList) {
      if (item.status && item.status !== 'Aman' && item.status !== 'Normal') {
        defectCount++;
      } else if (item.keterangan && item.keterangan.trim().length > 3 && item.keterangan !== '-') {
        defectCount++;
      }
      if (item.date) {
        const h = new Date(item.date).getHours();
        if (h >= 1 && h <= 4) nightCount++;
      }
    }
  } catch (e) {
    console.warn("Error counting inspections:", e);
  }

  // 3. CS (Cuti Site) count in roster (within active season)
  let csCount = 0;
  try {
    const csRes = await db.select({ count: count() })
      .from(roster)
      .where(and(
        sql`UPPER(${roster.nik}) = ${cleanNik}`,
        sql`${roster.date} ~ '^[0-9]{1,2} [A-Za-z]{3} [0-9]{2}$'`,
        sql`to_date(${roster.date}, 'DD Mon YY') >= ${seasonStart}::date`,
        sql`to_date(${roster.date}, 'DD Mon YY') <= CURRENT_DATE`,
        or(
          sql`UPPER(${roster.status}) = 'CS'`,
          sql`UPPER(${roster.status}) LIKE '%CUTI SITE%'`
        )
      ));
    csCount = Number(csRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting CS in roster:", e);
  }

  // 4. Feedback suggestions (within active season)
  let feedbackCount = 0;
  try {
    const fbRes = await db.select({ count: count() })
      .from(appFeedbacks)
      .where(and(
        sql`UPPER(${appFeedbacks.authorNik}) = ${cleanNik}`,
        sql`${appFeedbacks.createdAt} >= ${seasonStart}`
      ));
    feedbackCount = Number(fbRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting feedbacks:", e);
  }

  // 5. Community Quotes (within active season)
  let quotesCount = 0;
  try {
    const qRes = await db.select({ count: count() })
      .from(communityQuotes)
      .where(and(
        sql`UPPER(${communityQuotes.authorNik}) = ${cleanNik}`,
        sql`${communityQuotes.createdAt} >= ${seasonStart}`
      ));
    quotesCount = Number(qRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting quotes:", e);
  }

  // 6. User Custom Themes (within active season)
  let themesCount = 0;
  try {
    const thRes = await db.select({ count: count() })
      .from(userThemes)
      .where(and(
        sql`UPPER(${userThemes.nik}) = ${cleanNik}`,
        sql`${userThemes.createdAt} >= ${seasonStart}`
      ));
    themesCount = Number(thRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting themes:", e);
  }

  // 7. Bulletin Comments / Posts (within active season)
  let bulletinCount = 0;
  try {
    const bcRes = await db.select({ count: count() })
      .from(bulletinComments)
      .where(and(
        sql`UPPER(${bulletinComments.authorNik}) = ${cleanNik}`,
        sql`${bulletinComments.createdAt} >= ${seasonStart}`
      ));
    bulletinCount = Number(bcRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting bulletin activity:", e);
  }

  // 8. P5M Speaker Count (within active season)
  let p5mSpeakerCount = 0;
  try {
    const allSchedules = await db.select({ scheduleData: p5mSchedules.scheduleData })
      .from(p5mSchedules)
      .where(sql`${p5mSchedules.createdAt} >= ${seasonStart}`);

    for (const row of allSchedules) {
      if (row.scheduleData && typeof row.scheduleData === 'object') {
        const str = JSON.stringify(row.scheduleData).toUpperCase();
        if (str.includes(cleanNik)) p5mSpeakerCount++;
      }
    }
  } catch (e) {
    console.warn("Error counting P5M speaker count:", e);
  }

  // 9. Quiz 100% Score count (within active season)
  let quiz100Count = 0;
  try {
    const qzRes = await db.select({ count: count() })
      .from(quizScores)
      .where(and(
        sql`UPPER(${quizScores.nik}) = ${cleanNik}`,
        eq(quizScores.percentage, 100),
        sql`${quizScores.timestamp} >= ${seasonStart}`
      ));
    quiz100Count = Number(qzRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting quiz scores:", e);
  }

  // 10. Season Champion Count
  let seasonChampionCount = 0;

  // Map metric counts to achievement branch codes
  const countsMap: Record<string, number> = {
    BRANCH_KTA: ktaCount,
    BRANCH_INSPECTION: inspectionCount,
    BRANCH_CS: csCount,
    BRANCH_FEEDBACK: feedbackCount,
    BRANCH_QUOTES: quotesCount,
    BRANCH_THEMES: themesCount,
    BRANCH_BULLETIN: bulletinCount,
    BRANCH_P5M_SPEAKER: p5mSpeakerCount,
    BRANCH_DEFECTS: defectCount,
    BRANCH_QUIZ: quiz100Count,
    BRANCH_NIGHT: nightCount,
    BRANCH_SEASON: seasonChampionCount
  };

  // Evaluate Tiered Branch Milestones
  let achievementBonusXp = 0;
  const branchResults = TIERED_ACHIEVEMENTS.map(branch => {
    const currentVal = countsMap[branch.code] || 0;
    const prog = calculateBranchProgress(branch, currentVal);

    branch.tiers.forEach(t => {
      if (currentVal >= t.requiredCount) {
        achievementBonusXp += t.xpReward;
      }
    });

    return {
      branch,
      ...prog
    };
  });

  // Calculate Base EXP from raw actions in the active season
  const baseActionsXp = 
    (ktaCount * 35) +
    (inspectionCount * 50) +
    (defectCount * 40) +
    (csCount * 250) +
    (feedbackCount * 100) +
    (quotesCount * 100) +
    (themesCount * 150) +
    (bulletinCount * 20) +
    (p5mSpeakerCount * 60) +
    (quiz100Count * 250) +
    (nightCount * 50);

  // Total XP = Base Actions + Achievement Milestones (Clean zero baseline for main launch)
  const totalXp = Math.max(0, baseActionsXp + achievementBonusXp);

  // Derive Point Blank Rank from 1-year curve
  const rankInfo = getRankByXp(totalXp);

  // Collect all unlocked titles
  const allUnlockedTitles: string[] = [];
  branchResults.forEach(b => {
    allUnlockedTitles.push(...b.unlockedTitles);
  });

  const defaultTitle = allUnlockedTitles.length > 0 
    ? allUnlockedTitles[allUnlockedTitles.length - 1] 
    : 'Frontline Trainee';

  // Asynchronously check and broadcast new milestone unlocks if applicable
  checkAndBroadcastMilestones(cleanNik, resolvedName, rankInfo.currentRank.id, rankInfo.currentRank.name, branchResults).catch(() => {});

  return {
    nik: cleanNik,
    name: resolvedName,
    section: resolvedSection,
    pt: resolvedPt,
    equippedFrame: resolvedEquippedFrame,
    equippedTitle: resolvedEquippedTitle,
    avatar: resolvedAvatar,
    stats: {
      ktaCount,
      inspectionCount,
      defectCount,
      csCount,
      feedbackCount,
      quotesCount,
      themesCount,
      bulletinCount,
      p5mSpeakerCount,
      quiz100Count,
      nightCount,
      seasonChampionCount
    },
    totalXp,
    seasonXp: Math.round(totalXp * 0.4),
    badgesEarned: allUnlockedTitles.length,
    rankInfo,
    branchResults,
    unlockedTitles: allUnlockedTitles,
    defaultTitle,
    seasonInfo: {
      startDate: seasonStart.toISOString(),
      isZeroBaseline: true
    }
  };
}

// GET /api/gamification/season-info
gamificationRouter.get("/season-info", async (_req, res) => {
  try {
    const seasonStart = await getSeasonStartDate();
    res.json({
      seasonName: "Season 1 (Official Main Launch)",
      seasonStartDate: seasonStart.toISOString(),
      isZeroBaseline: true
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/gamification/reset-season (Admin / Dev control to trigger clean reset)
gamificationRouter.post("/reset-season", async (req, res) => {
  try {
    const newStartDate = req.body?.seasonStartDate 
      ? new Date(req.body.seasonStartDate) 
      : new Date();

    if (isNaN(newStartDate.getTime())) {
      return res.status(400).json({ error: "Invalid seasonStartDate format" });
    }

    const iso = newStartDate.toISOString();

    // Upsert into appSettings
    const existing = await db.select()
      .from(appSettings)
      .where(eq(appSettings.settingKey, 'gamification_season_start'))
      .limit(1);

    if (existing.length > 0) {
      await db.update(appSettings)
        .set({ settingValue: iso, updatedAt: new Date() })
        .where(eq(appSettings.settingKey, 'gamification_season_start'));
    } else {
      await db.insert(appSettings).values({
        settingKey: 'gamification_season_start',
        settingValue: iso,
        description: 'Gamification & Achievement Season Start Cutoff Date'
      });
    }

    // Invalidate cache immediately
    cachedLeaderboardData = null;

    res.json({
      success: true,
      message: "Seluruh achievement dan XP berhasil di-reset ke 0 untuk rilis main.",
      seasonStartDate: iso
    });
  } catch (e: any) {
    console.error("Error resetting gamification season:", e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/gamification/user-stats/:nik
gamificationRouter.get("/user-stats/:nik", async (req, res) => {
  try {
    const nik = req.params.nik;
    const userName = (req.query.name as string) || '';
    const result = await computeUserGamification(nik, userName);
    res.json(result);
  } catch (err) {
    console.error("Failed to compute gamification stats:", err);
    res.status(500).json({ error: "Failed to load gamification stats" });
  }
});

// POST /api/gamification/equip-customization (Simpan Gelar & Bingkai Avatar Kosmetik ke Database)
gamificationRouter.post("/equip-customization", async (req, res) => {
  try {
    const { nik, frame, title } = req.body;
    if (!nik) return res.status(400).json({ error: "NIK wajib diisi" });

    const cleanNik = String(nik).trim().toUpperCase();
    const updateData: any = {};
    if (frame !== undefined) updateData.equippedFrame = frame;
    if (title !== undefined) updateData.equippedTitle = title;

    await db.update(employees)
      .set(updateData)
      .where(sql`UPPER(${employees.nik}) = ${cleanNik}`);

    // Invalidate cache seketika agar seluruh portal langsung melihat perubahannya
    cachedLeaderboardData = null;

    res.json({
      success: true,
      message: "Kustomisasi berhasil disimpan dan diterapkan!",
      equippedFrame: frame,
      equippedTitle: title
    });
  } catch (err: any) {
    console.error("Failed to equip customization:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gamification/leaderboard
gamificationRouter.get("/leaderboard", async (_req, res) => {
  try {
    // Return cache if still fresh
    if (cachedLeaderboardData && (Date.now() - cachedLeaderboardData.timestamp < CACHE_TTL_MS)) {
      return res.json(cachedLeaderboardData);
    }

    const seasonStart = await getSeasonStartDate();

    // 1. Fetch all employees to ensure complete section coverage and authentic PT metadata
    const allEmps = await db.select({
      nik: employees.nik,
      name: employees.name,
      section: employees.section,
      department: employees.department,
      position: employees.position,
      pt: employees.pt,
      equippedFrame: employees.equippedFrame,
      equippedTitle: employees.equippedTitle,
      avatar: employees.avatar
    }).from(employees);

    // 2. Fetch grouped counts across all activity tables filtered by active season
    const [
      ktaGroups,
      inspList,
      csGroups,
      fbGroups,
      quoteGroups,
      themeGroups,
      commentGroups,
      quizGroups,
      p5mRows
    ] = await Promise.all([
      db.select({ nik: sql<string>`UPPER(${ktaReports.nik})`, count: sql<number>`count(*)::int` })
        .from(ktaReports)
        .where(sql`${ktaReports.createdAt} >= ${seasonStart}`)
        .groupBy(sql`UPPER(${ktaReports.nik})`),
      
      db.select({
        inspectorName: inspections.inspectorName,
        status: inspections.status,
        keterangan: inspections.keterangan,
        date: inspections.date
      })
      .from(inspections)
      .where(sql`${inspections.date} >= ${seasonStart}`),

      db.select({ nik: sql<string>`UPPER(${roster.nik})`, count: sql<number>`count(*)::int` })
        .from(roster)
        .where(and(
          sql`${roster.date} ~ '^[0-9]{1,2} [A-Za-z]{3} [0-9]{2}$'`,
          sql`to_date(${roster.date}, 'DD Mon YY') >= ${seasonStart}::date`,
          sql`to_date(${roster.date}, 'DD Mon YY') <= CURRENT_DATE`,
          or(sql`UPPER(${roster.status}) = 'CS'`, sql`UPPER(${roster.status}) LIKE '%CUTI SITE%'`)
        ))
        .groupBy(sql`UPPER(${roster.nik})`),

      db.select({ nik: sql<string>`UPPER(${appFeedbacks.authorNik})`, count: sql<number>`count(*)::int` })
        .from(appFeedbacks)
        .where(sql`${appFeedbacks.createdAt} >= ${seasonStart}`)
        .groupBy(sql`UPPER(${appFeedbacks.authorNik})`),

      db.select({ nik: sql<string>`UPPER(${communityQuotes.authorNik})`, count: sql<number>`count(*)::int` })
        .from(communityQuotes)
        .where(sql`${communityQuotes.createdAt} >= ${seasonStart}`)
        .groupBy(sql`UPPER(${communityQuotes.authorNik})`),

      db.select({ nik: sql<string>`UPPER(${userThemes.nik})`, count: sql<number>`count(*)::int` })
        .from(userThemes)
        .where(sql`${userThemes.createdAt} >= ${seasonStart}`)
        .groupBy(sql`UPPER(${userThemes.nik})`),

      db.select({ nik: sql<string>`UPPER(${bulletinComments.authorNik})`, count: sql<number>`count(*)::int` })
        .from(bulletinComments)
        .where(sql`${bulletinComments.createdAt} >= ${seasonStart}`)
        .groupBy(sql`UPPER(${bulletinComments.authorNik})`),

      db.select({ nik: sql<string>`UPPER(${quizScores.nik})`, count: sql<number>`count(*)::int` })
        .from(quizScores)
        .where(and(
          sql`${quizScores.percentage} >= 100`,
          sql`${quizScores.timestamp} >= ${seasonStart}`
        ))
        .groupBy(sql`UPPER(${quizScores.nik})`),

      db.select({ scheduleData: p5mSchedules.scheduleData })
        .from(p5mSchedules)
        .where(sql`${p5mSchedules.createdAt} >= ${seasonStart}`)
    ]);

    const ktaMap = new Map(ktaGroups.map(g => [g.nik, g.count]));
    const csMap = new Map(csGroups.map(g => [g.nik, g.count]));
    const fbMap = new Map(fbGroups.map(g => [g.nik, g.count]));
    const quoteMap = new Map(quoteGroups.map(g => [g.nik, g.count]));
    const themeMap = new Map(themeGroups.map(g => [g.nik, g.count]));
    const commentMap = new Map(commentGroups.map(g => [g.nik, g.count]));
    const quizMap = new Map(quizGroups.map(g => [g.nik, g.count]));

    const inspCountMap = new Map<string, number>();
    const defectCountMap = new Map<string, number>();
    const nightCountMap = new Map<string, number>();

    inspList.forEach(item => {
      const nameKey = (item.inspectorName || '').trim().toUpperCase();
      if (!nameKey) return;
      inspCountMap.set(nameKey, (inspCountMap.get(nameKey) || 0) + 1);

      if ((item.status && item.status !== 'Aman' && item.status !== 'Normal') || 
          (item.keterangan && item.keterangan.trim().length > 3 && item.keterangan !== '-')) {
        defectCountMap.set(nameKey, (defectCountMap.get(nameKey) || 0) + 1);
      }
      if (item.date) {
        const h = new Date(item.date).getHours();
        if (h >= 1 && h <= 4) {
          nightCountMap.set(nameKey, (nightCountMap.get(nameKey) || 0) + 1);
        }
      }
    });

    const p5mStrings = p5mRows
      .filter(r => r.scheduleData && typeof r.scheduleData === 'object')
      .map(r => JSON.stringify(r.scheduleData).toUpperCase());

    const leaderboard = allEmps.map((emp) => {
      const cleanNik = (emp.nik || '').trim().toUpperCase();
      const cleanName = (emp.name || '').trim().toUpperCase();

      const ktaCount = ktaMap.get(cleanNik) || 0;
      const csCount = csMap.get(cleanNik) || 0;
      const feedbackCount = fbMap.get(cleanNik) || 0;
      const quotesCount = quoteMap.get(cleanNik) || 0;
      const themesCount = themeMap.get(cleanNik) || 0;
      const bulletinCount = commentMap.get(cleanNik) || 0;
      const quiz100Count = quizMap.get(cleanNik) || 0;

      let inspectionCount = 0;
      let defectCount = 0;
      let nightCount = 0;
      for (const [inspName, cnt] of inspCountMap.entries()) {
        if (inspName.includes(cleanName) || cleanName.includes(inspName) || (cleanNik && inspName.includes(cleanNik))) {
          inspectionCount += cnt;
          defectCount += defectCountMap.get(inspName) || 0;
          nightCount += nightCountMap.get(inspName) || 0;
        }
      }

      let p5mSpeakerCount = 0;
      for (const pStr of p5mStrings) {
        if (pStr.includes(cleanNik) || (cleanName.length > 4 && pStr.includes(cleanName))) {
          p5mSpeakerCount++;
        }
      }

      let achievementBonusXp = 0;
      const allUnlockedTitles: string[] = [];

      TIERED_ACHIEVEMENTS.forEach(ach => {
        let currentVal = 0;
        switch (ach.code) {
          case 'BRANCH_KTA': currentVal = ktaCount; break;
          case 'BRANCH_INSPECTION': currentVal = inspectionCount; break;
          case 'BRANCH_DEFECTS': currentVal = defectCount; break;
          case 'BRANCH_CS': currentVal = csCount; break;
          case 'BRANCH_FEEDBACK': currentVal = feedbackCount; break;
          case 'BRANCH_QUOTES': currentVal = quotesCount; break;
          case 'BRANCH_THEMES': currentVal = themesCount; break;
          case 'BRANCH_BULLETIN': currentVal = bulletinCount; break;
          case 'BRANCH_P5M_SPEAKER': currentVal = p5mSpeakerCount; break;
          case 'BRANCH_QUIZ': currentVal = quiz100Count; break;
          case 'BRANCH_NIGHT': currentVal = nightCount; break;
          default: currentVal = 0;
        }

        ach.tiers.forEach(t => {
          if (currentVal >= t.requiredCount) {
            achievementBonusXp += (t.xpReward || 0);
            allUnlockedTitles.push(t.titleReward);
          }
        });
      });

      const baseActionsXp = 
        (ktaCount * 30) +
        (inspectionCount * 25) +
        (defectCount * 35) +
        (csCount * 400) +
        (feedbackCount * 120) +
        (quotesCount * 80) +
        (themesCount * 100) +
        (bulletinCount * 40) +
        (p5mSpeakerCount * 60) +
        (quiz100Count * 250) +
        (nightCount * 50);

      const totalXp = Math.max(0, baseActionsXp + achievementBonusXp);
      const rankInfo = getRankByXp(totalXp);
      const normSec = normalizeSection(emp.section, emp.department, emp.position);

      const defaultTitle = allUnlockedTitles.length > 0
        ? allUnlockedTitles[allUnlockedTitles.length - 1]
        : 'Frontline Trainee';

      return {
        nik: emp.nik,
        name: emp.name,
        section: normSec,
        pt: (emp.pt || 'TBP').trim().toUpperCase(),
        title: emp.equippedTitle || defaultTitle,
        frame: emp.equippedFrame || 'default',
        avatar: emp.avatar || null,
        totalXp,
        currentRank: rankInfo.currentRank,
        badgesCount: allUnlockedTitles.length,
        inspectionCount,
        ktaCount,
        seasonXp: Math.round(totalXp * 0.4)
      };
    });

    leaderboard.sort((a, b) => b.totalXp - a.totalXp);
    
    // Assign rank and frames (prioritize custom equipped frame if set by employee)
    const finalLeaderboard = leaderboard.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      frame: (item.frame && item.frame !== 'default') 
        ? item.frame 
        : (idx === 0 ? 'golden_halo' : idx === 1 ? 'cyber_neon' : idx === 2 ? 'emerald_aurora' : idx < 10 ? 'obsidian_dark' : 'default'),
      p5mStreak: 14 + (idx % 7)
    }));

    // Dynamic Section rankings
    const sectionsConfig = [
      { name: 'Laboratory', color: 'text-emerald-500' },
      { name: 'Preparation', color: 'text-amber-500' },
      { name: 'Maintenance', color: 'text-blue-500' },
      { name: 'Quality Assurance', color: 'text-purple-500' },
      { name: 'Administration', color: 'text-slate-400' }
    ];

    const sectionScores = sectionsConfig.map(sec => {
      const members = finalLeaderboard.filter(u => u.section === sec.name);
      const totalPersonnel = members.length;
      const totalXpSum = members.reduce((sum, u) => sum + (u.totalXp || 0), 0);
      const avgXp = totalPersonnel > 0 ? Math.round(totalXpSum / totalPersonnel) : 0;
      const totalInspections = members.reduce((sum, u) => sum + (u.inspectionCount || 0), 0);
      const totalKta = members.reduce((sum, u) => sum + (u.ktaCount || 0), 0);

      return {
        name: sec.name,
        totalPersonnel,
        avgXp,
        safetyCompliance: 94 + Math.min(5, Math.round(avgXp / 600)),
        totalInspections,
        totalKta,
        color: sec.color
      };
    });
    sectionScores.sort((a, b) => b.avgXp - a.avgXp);
    sectionScores.forEach((s, idx) => { (s as any).rank = idx + 1; });

    const responsePayload = {
      leaderboard: finalLeaderboard,
      sectionScores,
      ranksMaster: VANGUARD_RANKS,
      achievementsMaster: TIERED_ACHIEVEMENTS,
      seasonInfo: {
        name: "Season 1 (Official Main Launch)",
        startDate: seasonStart.toISOString(),
        isZeroBaseline: true
      }
    };

    // Cache the response
    cachedLeaderboardData = {
      ...responsePayload,
      timestamp: Date.now()
    };

    res.json(responsePayload);
  } catch (err) {
    console.error("Leaderboard load error:", err);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});
