import { Router } from "express";
import { db } from "../../src/db/index.js";
import { 
  ktaReports, inspections, roster, appFeedbacks, communityQuotes, 
  userThemes, bulletinComments, bulletinPosts, p5mSchedules, quizScores, 
  employees, appSettings, gamificationMilestones, workOrders, portalLogins, easterEggProgress, tickets,
  developerUsers
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

  // 1. Maintenance
  if (s.includes('MAINT') || d.includes('MAINT') || p.includes('MAINT')) {
    return 'Maintenance';
  }
  // 2. Inventory Control
  if (s.includes('INVENTORY') || d.includes('INVENTORY') || p.includes('INVENTORY') || s.includes('LOGISTIC') || d.includes('LOGISTIC') || p.includes('LOGISTIC')) {
    return 'Inventory Control';
  }
  // 3. Quality Assurance
  if (s.includes('QA') || s.includes('QUALITY') || d.includes('QA') || d.includes('QUALITY') || p.includes('QA') || p.includes('QUALITY')) {
    return 'Quality Assurance';
  }
  // 4. Administration
  if (s.includes('ADMIN') || d.includes('ADMIN') || p.includes('ADMIN') || s.includes('FINANCE') || d.includes('FINANCE') || p.includes('FINANCE') || s.includes('MANAGER') || d.includes('MANAGER')) {
    return 'Administration';
  }
  // 5. Preparation
  if (s.includes('PREP') || d.includes('PREP') || p.includes('PREP') || s.includes('WET') || s.includes('DRY')) {
    return 'Preparation';
  }
  // 6. Laboratory
  if (s.includes('LAB') || d.includes('LAB') || p.includes('LAB')) {
    return 'Laboratory';
  }

  return sec || dept || 'Preparation';
}

// Helper to provide starting rank points based on organizational leadership roles:
// - Manager -> Pangkat Bintang 5 (Rank 51: Supreme Vanguard Commander, minXp: 24,501)
// - Superintendent (SPT) -> Pangkat Bintang 3 (Rank 49: Lieutenant General, minXp: 22,601)
export function getRoleStartingXp(position?: string | null, department?: string | null, section?: string | null): number {
  const p = (position || '').toUpperCase();
  const d = (department || '').toUpperCase();
  const s = (section || '').toUpperCase();

  // 1. Manager -> Bintang 5 (24,501 EXP)
  if (p.includes('MANAGER') || d.includes('MANAGER') || s.includes('MANAGER') || p.includes('DEPT HEAD') || d.includes('DEPT HEAD')) {
    return 24501;
  }

  // 2. Superintendent (SPT) -> Bintang 3 (22,601 EXP)
  if (p.includes('SUPERINTENDENT') || p.includes('SPT') || d.includes('SUPERINTENDENT') || s.includes('SUPERINTENDENT')) {
    return 22601;
  }

  return 0;
}

// Helper to compute consecutive unbroken daily login streak
export function calculateStreak(dates: string[]): number {
  if (!dates || dates.length === 0) return 0;
  const uniqueSorted = Array.from(new Set(dates.filter(Boolean))).sort().reverse();
  if (uniqueSorted.length === 0) return 0;

  let maxStreak = 1;
  let currentChain = 1;

  for (let i = 0; i < uniqueSorted.length - 1; i++) {
    const d1 = new Date(uniqueSorted[i]);
    const d2 = new Date(uniqueSorted[i + 1]);
    const diffDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      currentChain++;
    } else if (diffDays > 1) {
      if (currentChain > maxStreak) maxStreak = currentChain;
      currentChain = 1;
    }
  }
  if (currentChain > maxStreak) maxStreak = currentChain;

  return maxStreak;
}

// Shared action weights for gamification base EXP calculation
// NOTE: Cuti Site (CS) gives 0 EXP. It is purely a hidden achievement with titles and cosmetic border rewards.
export const ACTION_XP_WEIGHTS = {
  KTA: 35,
  INSPECTION: 50,
  DEFECTS: 60, // Penuntasan Temuan Hasil Inspeksi
  WO_CREATE: 40,
  WO_RESOLVE: 60,
  CS: 0, // Cuti Site gives 0 EXP (Hidden achievement only)
  FEEDBACK: 100,
  QUOTES: 20,
  THEMES: 40,
  BULLETIN: 10,
  P5M_SPEAKER: 60,
  QUIZ_100: 250,
  NIGHT_SHIFT: 50,
  DAWN_SHIFT: 50,
  WEEKEND_SHIFT: 50
};

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

export function invalidateGamificationCache() {
  cachedLeaderboardData = null;
}

// Helper to determine the active Season Start Cutoff Date
// Resets automatically on the 1st day of every month at 00:00:00 WIT (UTC+9)
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

  // 3. Default baseline: First day of current calendar month at 00:00:00 WIT (UTC+9)
  // Ensures leaderboard ranking is cleanly reset every month!
  const now = new Date();
  const witTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const year = witTime.getUTCFullYear();
  const month = witTime.getUTCMonth();
  return new Date(Date.UTC(year, month, 1, -9, 0, 0, 0));
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
  const seasonStartIso = seasonStart.toISOString();

  // Check if NIK is a developer
  let isDevUser = false;
  try {
    const devCheck = await db.select({ nik: developerUsers.nik })
      .from(developerUsers)
      .where(sql`UPPER(${developerUsers.nik}) = ${cleanNik}`)
      .limit(1);
    isDevUser = devCheck.length > 0;
  } catch (e) {
    console.warn('Error checking developerUsers:', e);
  }

  // Resolve employee metadata from database
  let resolvedName = userName || 'Personil PrepLab';
  let resolvedSection = 'Preparation';
  let resolvedDepartment = 'Preparation';
  let resolvedPosition = '';
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
      resolvedName = emp[0].name || userName || 'Personil PrepLab';
      resolvedPosition = emp[0].position || '';
      resolvedDepartment = emp[0].department || '';
      resolvedSection = normalizeSection(emp[0].section, emp[0].department, emp[0].position);
      resolvedPt = (emp[0].pt || 'TBP').trim().toUpperCase();
      resolvedEquippedFrame = emp[0].equippedFrame || 'default';
      resolvedEquippedTitle = emp[0].equippedTitle || 'Frontline Trainee';
      resolvedAvatar = emp[0].avatar || null;
    }
  } catch (e) {
    console.warn("Error resolving employee for gamification:", e);
  }

  const cleanName = (resolvedName || '').trim().toUpperCase();

  // 1. KTA count (Lifetime career contributions)
  let ktaCount = 0;
  try {
    const ktaRes = await db.select({ count: count() })
      .from(ktaReports)
      .where(sql`UPPER(${ktaReports.nik}) = ${cleanNik}`);
    ktaCount = Number(ktaRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting KTA:", e);
  }

  // 2. Inspections count, Night Shift & Dawn Patrol (Lifetime career contributions)
  let inspectionCount = 0;
  let nightCount = 0;
  let dawnCount = 0;
  let weekendCount = 0;
  const activityDates: string[] = [];
  let userInspList: { id: number; date: Date | null; inspectorName: string | null; equipmentCode: string | null }[] = [];

  try {
    const allInsps = await db.select({
      id: inspections.id,
      date: inspections.date,
      inspectorName: inspections.inspectorName,
      equipmentCode: inspections.equipmentCode
    }).from(inspections);

    userInspList = allInsps.filter(item => {
      const inspName = (item.inspectorName || '').trim().toUpperCase();
      const eqCode = (item.equipmentCode || '').trim().toUpperCase();
      if (cleanNik && (inspName.includes(cleanNik) || eqCode.includes(cleanNik))) return true;
      if (!inspName) return false;
      if (cleanName && cleanName.length >= 3 && (inspName.includes(cleanName) || (inspName.length >= 3 && cleanName.includes(inspName)))) return true;
      return false;
    });

    inspectionCount = userInspList.length;
    for (const item of userInspList) {
      if (item.date) {
        const d = new Date(item.date);
        activityDates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' }));
        const h = d.getHours();
        const m = d.getMinutes();
        if (h >= 1 && h <= 4) nightCount++;
        if ((h === 4 && m >= 30) || h === 5 || (h === 6 && m <= 30)) dawnCount++;

        const witD = new Date(d.getTime() + (9 * 60 * 60 * 1000));
        const day = witD.getUTCDay();
        if (day === 0 || day === 6) weekendCount++;
      }
    }
  } catch (e) {
    console.warn("Error counting inspections:", e);
  }

  // 3. Work Orders Created & Resolved
  let woCreateCount = 0;
  let woResolveCount = 0;
  try {
    const woCreated = await db.select({ count: count() })
      .from(workOrders)
      .where(sql`UPPER(${workOrders.requestorNik}) = ${cleanNik}`);
    woCreateCount = Number(woCreated[0]?.count || 0);

    const closedWOs = await db.select({
      technicianPic: workOrders.technicianPic,
      requestorNik: workOrders.requestorNik,
      createdAt: workOrders.createdAt,
      repairEnd: workOrders.repairEnd
    })
    .from(workOrders)
    .where(eq(workOrders.status, 'Closed'));

    const searchName = (resolvedName || cleanNik).toUpperCase();
    for (const wo of closedWOs) {
      const pic = (wo.technicianPic || '').toUpperCase();
      if (pic.includes(searchName) || (cleanNik && wo.requestorNik && wo.requestorNik.toUpperCase() === cleanNik && pic.length === 0)) {
        woResolveCount++;
      }
    }
  } catch (e) {
    console.warn("Error counting Work Orders:", e);
  }

  // 3b. Closed inspection findings / Defects (Tickets with status CLOSED)
  let defectsCount = 0;
  try {
    const closedTickets = await db.select({
      pic: tickets.pic,
      completionDate: tickets.completionDate,
      date: tickets.date
    })
    .from(tickets)
    .where(sql`UPPER(${tickets.status}) = 'CLOSED'`);

    const searchName = (resolvedName || cleanNik).toUpperCase();
    for (const t of closedTickets) {
      if (!t.pic) continue;
      const rawPic = String(t.pic).trim().toUpperCase();
      if (rawPic.includes(cleanNik) || (searchName.length >= 3 && (rawPic.includes(searchName) || searchName.includes(rawPic.replace(/\(.*?\)/g, '').trim())))) {
        defectsCount++;
      }
    }
  } catch (e) {
    console.warn("Error counting closed tickets/defects:", e);
  }

  // 4. CS (Cuti Site) count in roster (Lifetime career contributions)
  let csCount = 0;
  try {
    const csRes = await db.select({ count: count() })
      .from(roster)
      .where(and(
        sql`UPPER(${roster.nik}) = ${cleanNik}`,
        sql`${roster.date} ~ '^[0-9]{1,2} [A-Za-z]{3} [0-9]{2}$'`,
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

  // 5. Feedback suggestions (Lifetime career contributions)
  let feedbackCount = 0;
  try {
    const fbRes = await db.select({ count: count() })
      .from(appFeedbacks)
      .where(sql`UPPER(${appFeedbacks.authorNik}) = ${cleanNik}`);
    feedbackCount = Number(fbRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting feedbacks:", e);
  }

  // 6. Community Quotes (Lifetime career contributions)
  let quotesCount = 0;
  try {
    const qRes = await db.select({ count: count() })
      .from(communityQuotes)
      .where(sql`UPPER(${communityQuotes.authorNik}) = ${cleanNik}`);
    quotesCount = Number(qRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting quotes:", e);
  }

  // 7. User Custom Themes (Lifetime career contributions)
  let themesCount = 0;
  try {
    const thRes = await db.select({
      count: sql<number>`count(distinct case when ${userThemes.mode} like 'template:%' then ${userThemes.id}::text else 'active_theme' end)::int`
    })
    .from(userThemes)
    .where(sql`UPPER(${userThemes.nik}) = ${cleanNik}`);
    themesCount = Number(thRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting themes:", e);
  }

  // 8. Bulletin Comments / Posts (Lifetime career contributions)
  let bulletinCount = 0;
  try {
    const bcRes = await db.select({ count: count() })
      .from(bulletinComments)
      .where(sql`UPPER(${bulletinComments.authorNik}) = ${cleanNik}`);
    bulletinCount = Number(bcRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting bulletin activity:", e);
  }

  // 9. P5M Speaker Count (Lifetime career contributions)
  let p5mSpeakerCount = 0;
  try {
    const allSchedules = await db.select({ scheduleData: p5mSchedules.scheduleData })
      .from(p5mSchedules);

    for (const row of allSchedules) {
      if (row.scheduleData && typeof row.scheduleData === 'object') {
        const str = JSON.stringify(row.scheduleData).toUpperCase();
        if (str.includes(cleanNik)) p5mSpeakerCount++;
      }
    }
  } catch (e) {
    console.warn("Error counting P5M speaker count:", e);
  }

  // 10. Quiz 100% Score count (Lifetime career contributions)
  let quiz100Count = 0;
  try {
    const qzRes = await db.select({ count: count() })
      .from(quizScores)
      .where(and(
        sql`UPPER(${quizScores.nik}) = ${cleanNik}`,
        eq(quizScores.percentage, 100)
      ));
    quiz100Count = Number(qzRes[0]?.count || 0);
  } catch (e) {
    console.warn("Error counting quiz scores:", e);
  }

  // 11. Login Streak Calculation (consecutive unbroken daily portal visits)
  let loginStreak = 0;
  try {
    const loginDates = await db.select({ loginDate: portalLogins.loginDate })
      .from(portalLogins)
      .where(sql`UPPER(${portalLogins.nik}) = ${cleanNik}`);
    
    for (const l of loginDates) {
      if (l.loginDate) activityDates.push(l.loginDate);
    }
    loginStreak = calculateStreak(activityDates);
  } catch (e) {
    console.warn("Error calculating login streak:", e);
    loginStreak = 1;
  }

  // 12. Easter Egg Mini-Game Progress
  let easterEggCount = 0;
  try {
    const eeRes = await db.select()
      .from(easterEggProgress)
      .where(sql`UPPER(${easterEggProgress.nik}) = ${cleanNik}`)
      .limit(1);
    if (eeRes.length > 0) {
      easterEggCount = eeRes[0].node || 1;
    }
  } catch (e) {
    console.warn("Error counting easter egg:", e);
  }

  // 13. Season Champion Count
  let seasonChampionCount = 0;

  // Polymath count (number of distinct operational disciplines where user has activity)
  const polymathCategories = [
    ktaCount > 0,
    inspectionCount > 0,
    defectsCount > 0,
    woCreateCount > 0,
    woResolveCount > 0,
    csCount > 0,
    feedbackCount > 0,
    quotesCount > 0,
    themesCount > 0,
    bulletinCount > 0,
    p5mSpeakerCount > 0,
    quiz100Count > 0,
    loginStreak > 0
  ];
  const polymathCount = polymathCategories.filter(Boolean).length;

  // Map metric counts to achievement branch codes
  const countsMap: Record<string, number> = {
    BRANCH_KTA: ktaCount,
    BRANCH_INSPECTION: inspectionCount,
    BRANCH_DEFECTS: defectsCount,
    BRANCH_WO_CREATE: woCreateCount,
    BRANCH_WO_RESOLVE: woResolveCount,
    BRANCH_CS: csCount,
    BRANCH_FEEDBACK: feedbackCount,
    BRANCH_QUOTES: quotesCount,
    BRANCH_THEMES: themesCount,
    BRANCH_BULLETIN: bulletinCount,
    BRANCH_P5M_SPEAKER: p5mSpeakerCount,
    BRANCH_QUIZ: quiz100Count,
    BRANCH_LOGIN_STREAK: loginStreak,
    BRANCH_NIGHT: nightCount,
    BRANCH_DAWN: dawnCount,
    BRANCH_WEEKEND: weekendCount,
    BRANCH_POLYMATH: polymathCount,
    BRANCH_EASTER_EGG: easterEggCount,
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

  // XP cap thresholds: after reaching Max Achievement Tier, further creations give reduced EXP
  // Quotes: Max Tier IV at 30 quotes → post-cap 5 EXP | Themes: Max Tier IV at 15 themes → post-cap 10 EXP
  const QUOTES_XP_CAP_COUNT = 30;
  const THEMES_XP_CAP_COUNT = 15;
  const QUOTES_POST_CAP_XP = 5;
  const THEMES_POST_CAP_XP = 10;

  const cappedQuotesXp = quotesCount <= QUOTES_XP_CAP_COUNT
    ? (quotesCount * ACTION_XP_WEIGHTS.QUOTES)
    : (QUOTES_XP_CAP_COUNT * ACTION_XP_WEIGHTS.QUOTES) + ((quotesCount - QUOTES_XP_CAP_COUNT) * QUOTES_POST_CAP_XP);

  const cappedThemesXp = themesCount <= THEMES_XP_CAP_COUNT
    ? (themesCount * ACTION_XP_WEIGHTS.THEMES)
    : (THEMES_XP_CAP_COUNT * ACTION_XP_WEIGHTS.THEMES) + ((themesCount - THEMES_XP_CAP_COUNT) * THEMES_POST_CAP_XP);

  // Calculate Base EXP from raw actions
  const baseActionsXp = 
    (ktaCount * ACTION_XP_WEIGHTS.KTA) +
    (inspectionCount * ACTION_XP_WEIGHTS.INSPECTION) +
    (defectsCount * ACTION_XP_WEIGHTS.DEFECTS) +
    (woCreateCount * ACTION_XP_WEIGHTS.WO_CREATE) +
    (woResolveCount * ACTION_XP_WEIGHTS.WO_RESOLVE) +
    (csCount * ACTION_XP_WEIGHTS.CS) + // Cuti Site gives 0 EXP (pure hidden achievement)
    (feedbackCount * ACTION_XP_WEIGHTS.FEEDBACK) +
    cappedQuotesXp +
    cappedThemesXp +
    (bulletinCount * ACTION_XP_WEIGHTS.BULLETIN) +
    (p5mSpeakerCount * ACTION_XP_WEIGHTS.P5M_SPEAKER) +
    (quiz100Count * ACTION_XP_WEIGHTS.QUIZ_100) +
    (nightCount * ACTION_XP_WEIGHTS.NIGHT_SHIFT) +
    (dawnCount * ACTION_XP_WEIGHTS.DAWN_SHIFT) +
    (weekendCount * ACTION_XP_WEIGHTS.WEEKEND_SHIFT);

  const roleStartingXp = getRoleStartingXp(resolvedPosition, resolvedDepartment, resolvedSection);

  // Total XP = Role Starting Baseline (Bintang 5 / Bintang 3) + Base Actions + Achievement Milestones
  const totalXp = Math.max(0, roleStartingXp + baseActionsXp + achievementBonusXp);

  // Derive Point Blank Rank from 1-year curve
  const rankInfo = getRankByXp(totalXp);

  // Collect all unlocked titles
  const allUnlockedTitles: string[] = [];
  if (roleStartingXp >= 24501) {
    allUnlockedTitles.push('Supreme Commander', 'Division General');
  } else if (roleStartingXp >= 22601) {
    allUnlockedTitles.push('Field Superintendent', 'Brigade Commander');
  }

  branchResults.forEach(b => {
    allUnlockedTitles.push(...b.unlockedTitles);
  });

  const defaultTitle = allUnlockedTitles.length > 0 
    ? allUnlockedTitles[allUnlockedTitles.length - 1] 
    : 'Frontline Trainee';

  // Asynchronously check and broadcast new milestone unlocks if applicable
  checkAndBroadcastMilestones(cleanNik, resolvedName, rankInfo.currentRank.id, rankInfo.currentRank.name, branchResults).catch(() => {});

  // Calculate Season EXP: starts strictly from 0 for everyone on season launch.
  // Only counts activities created on or after seasonStart cutoff date. No role baseline added.
  let seasonXp = 0;
  let seasonStats = {
    ktaCount: 0,
    inspectionCount: 0,
    defectsCount: 0,
    woCreateCount: 0,
    woResolveCount: 0,
    feedbackCount: 0,
    quotesCount: 0,
    themesCount: 0,
    bulletinCount: 0,
    p5mSpeakerCount: 0,
    quiz100Count: 0,
    nightCount: 0,
    dawnCount: 0,
    weekendCount: 0
  };

  try {
    const [sKta] = await db.select({ count: count() })
      .from(ktaReports)
      .where(and(sql`UPPER(${ktaReports.nik}) = ${cleanNik}`, sql`${ktaReports.createdAt} >= ${seasonStart}`));

    const sInsp = userInspList.filter(item => {
      if (!item.date) return false;
      return new Date(item.date) >= seasonStart;
    });

    let sNight = 0;
    let sDawn = 0;
    let sWeekend = 0;
    for (const item of sInsp) {
      if (item.date) {
        const d = new Date(item.date);
        const h = d.getHours();
        const m = d.getMinutes();
        if (h >= 1 && h <= 4) sNight++;
        if ((h === 4 && m >= 30) || h === 5 || (h === 6 && m <= 30)) sDawn++;
        const witD = new Date(d.getTime() + (9 * 60 * 60 * 1000));
        const day = witD.getUTCDay();
        if (day === 0 || day === 6) sWeekend++;
      }
    }

    const [sWoCreate] = await db.select({ count: count() })
      .from(workOrders)
      .where(and(sql`UPPER(${workOrders.requestorNik}) = ${cleanNik}`, sql`${workOrders.createdAt} >= ${seasonStart}`));

    const sClosedWOs = await db.select({ technicianPic: workOrders.technicianPic, requestorNik: workOrders.requestorNik })
      .from(workOrders)
      .where(and(eq(workOrders.status, 'Closed'), sql`${workOrders.repairEnd} >= ${seasonStart}`));
    
    let sWoResolve = 0;
    const searchName = (resolvedName || cleanNik).toUpperCase();
    for (const wo of sClosedWOs) {
      const pic = (wo.technicianPic || '').toUpperCase();
      if (pic.includes(searchName) || (cleanNik && wo.requestorNik && wo.requestorNik.toUpperCase() === cleanNik && pic.length === 0)) {
        sWoResolve++;
      }
    }

    const sClosedTickets = await db.select({
      pic: tickets.pic,
      completionDate: tickets.completionDate,
      date: tickets.date
    })
    .from(tickets)
    .where(and(
      sql`UPPER(${tickets.status}) = 'CLOSED'`,
      sql`COALESCE(${tickets.completionDate}, ${tickets.date}) >= ${seasonStart}`
    ));

    let sDefects = 0;
    for (const t of sClosedTickets) {
      if (!t.pic) continue;
      const rawPic = String(t.pic).trim().toUpperCase();
      if (rawPic.includes(cleanNik) || (searchName.length >= 3 && (rawPic.includes(searchName) || searchName.includes(rawPic.replace(/\(.*?\)/g, '').trim())))) {
        sDefects++;
      }
    }

    const [sFb] = await db.select({ count: count() })
      .from(appFeedbacks)
      .where(and(sql`UPPER(${appFeedbacks.authorNik}) = ${cleanNik}`, sql`${appFeedbacks.createdAt} >= ${seasonStart}`));

    const [sQuotes] = await db.select({ count: count() })
      .from(communityQuotes)
      .where(and(sql`UPPER(${communityQuotes.authorNik}) = ${cleanNik}`, sql`${communityQuotes.createdAt} >= ${seasonStart}`));

    const [sThemes] = await db.select({ count: count() })
      .from(userThemes)
      .where(and(sql`UPPER(${userThemes.nik}) = ${cleanNik}`, sql`${userThemes.createdAt} >= ${seasonStart}`));

    const [sComments] = await db.select({ count: count() })
      .from(bulletinComments)
      .where(and(sql`UPPER(${bulletinComments.authorNik}) = ${cleanNik}`, sql`${bulletinComments.createdAt} >= ${seasonStart}`));

    const [sQuiz] = await db.select({ count: count() })
      .from(quizScores)
      .where(and(sql`UPPER(${quizScores.nik}) = ${cleanNik}`, eq(quizScores.percentage, 100), sql`${quizScores.timestamp} >= ${seasonStart}`));

    // Season XP also respects the post-cap rule
    const sQuotesCount = Number(sQuotes?.count || 0);
    const sThemesCount = Number(sThemes?.count || 0);
    const sCappedQuotesXp = sQuotesCount <= QUOTES_XP_CAP_COUNT
      ? (sQuotesCount * ACTION_XP_WEIGHTS.QUOTES)
      : (QUOTES_XP_CAP_COUNT * ACTION_XP_WEIGHTS.QUOTES) + ((sQuotesCount - QUOTES_XP_CAP_COUNT) * QUOTES_POST_CAP_XP);
    const sCappedThemesXp = sThemesCount <= THEMES_XP_CAP_COUNT
      ? (sThemesCount * ACTION_XP_WEIGHTS.THEMES)
      : (THEMES_XP_CAP_COUNT * ACTION_XP_WEIGHTS.THEMES) + ((sThemesCount - THEMES_XP_CAP_COUNT) * THEMES_POST_CAP_XP);

    seasonXp = 
      (Number(sKta?.count || 0) * ACTION_XP_WEIGHTS.KTA) +
      (sInsp.length * ACTION_XP_WEIGHTS.INSPECTION) +
      (sDefects * ACTION_XP_WEIGHTS.DEFECTS) +
      (Number(sWoCreate?.count || 0) * ACTION_XP_WEIGHTS.WO_CREATE) +
      (sWoResolve * ACTION_XP_WEIGHTS.WO_RESOLVE) +
      (Number(sFb?.count || 0) * ACTION_XP_WEIGHTS.FEEDBACK) +
      sCappedQuotesXp +
      sCappedThemesXp +
      (Number(sComments?.count || 0) * ACTION_XP_WEIGHTS.BULLETIN) +
      (Number(sQuiz?.count || 0) * ACTION_XP_WEIGHTS.QUIZ_100) +
      (sNight * ACTION_XP_WEIGHTS.NIGHT_SHIFT) +
      (sDawn * ACTION_XP_WEIGHTS.DAWN_SHIFT) +
      (sWeekend * ACTION_XP_WEIGHTS.WEEKEND_SHIFT);

    seasonStats = {
      ktaCount: Number(sKta?.count || 0),
      inspectionCount: sInsp.length,
      defectsCount: sDefects,
      woCreateCount: Number(sWoCreate?.count || 0),
      woResolveCount: sWoResolve,
      feedbackCount: Number(sFb?.count || 0),
      quotesCount: Number(sQuotes?.count || 0),
      themesCount: Number(sThemes?.count || 0),
      bulletinCount: Number(sComments?.count || 0),
      p5mSpeakerCount: 0,
      quiz100Count: Number(sQuiz?.count || 0),
      nightCount: sNight,
      dawnCount: sDawn,
      weekendCount: sWeekend
    };
  } catch (e) {
    console.warn("Error calculating season stats:", e);
    seasonXp = 0;
  }

  return {
    nik: cleanNik,
    name: resolvedName,
    section: resolvedSection,
    pt: resolvedPt,
    equippedFrame: resolvedEquippedFrame,
    equippedTitle: resolvedEquippedTitle,
    avatar: resolvedAvatar,
    roleStartingXp,
    achievementBonusXp,
    baseActionsXp,
    stats: {
      ktaCount,
      inspectionCount,
      defectsCount,
      woCreateCount,
      woResolveCount,
      csCount,
      feedbackCount,
      quotesCount,
      themesCount,
      bulletinCount,
      p5mSpeakerCount,
      quiz100Count,
      loginStreak,
      nightCount,
      dawnCount,
      weekendCount,
      polymathCount,
      easterEggCount,
      seasonChampionCount
    },
    seasonStats,
    totalXp,
    seasonXp: Math.max(0, seasonXp),
    badgesEarned: allUnlockedTitles.length,
    rankInfo,
    branchResults,
    unlockedTitles: allUnlockedTitles,
    defaultTitle,
    isDevUser,
    // publicRank: what others see. GM for developers, real rank for regular users.
    publicRank: isDevUser
      ? { id: 0, name: 'Game Master', tier: 'GM', tierGroup: 'System', icon: '/assets/ranks/rank_special_gm.png', isGM: true }
      : rankInfo.currentRank,
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

// GET /api/gamification/user-stats/:nik & /api/gamification/user/:nik
gamificationRouter.get(["/user-stats/:nik", "/user/:nik"], async (req, res) => {
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
    const seasonStartIso = seasonStart.toISOString();

    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const todayStr = `${now.getDate()} ${months[now.getMonth()]} ${String(now.getFullYear()).slice(-2)}`;

    // 1. Fetch employees, today's roster, and developer NIKs
    const [allEmps, todayRoster, devRows] = await Promise.all([
      db.select({
        nik: employees.nik,
        name: employees.name,
        section: employees.section,
        department: employees.department,
        position: employees.position,
        pt: employees.pt,
        equippedFrame: employees.equippedFrame,
        equippedTitle: employees.equippedTitle,
        avatar: employees.avatar
      }).from(employees),
      db.select({
        nik: sql<string>`UPPER(${roster.nik})`,
        status: roster.status
      }).from(roster).where(eq(roster.date, todayStr)),
      db.select({ nik: developerUsers.nik }).from(developerUsers)
    ]);

    // Build a set of developer NIKs (uppercase) for fast O(1) lookup
    const devNikSet = new Set(devRows.map(d => (d.nik || '').trim().toUpperCase()));

    const todayRosterMap = new Map<string, string>();
    for (const r of todayRoster) {
      if (r.nik) todayRosterMap.set(r.nik, (r.status || '').trim());
    }

    // Exclude resigned personnel AND developers from public leaderboard
    const activeEmps = allEmps.filter(emp => {
      const cleanNik = (emp.nik || '').trim().toUpperCase();
      // Exclude developers — they get a GM rank and are not part of the competitive ladder
      if (devNikSet.has(cleanNik)) return false;
      const status = todayRosterMap.get(cleanNik);
      if (!status || status === '-' || status.toLowerCase() === 'resign' || status.toLowerCase() === 'keluar') {
        return false;
      }
      return true;
    });

    // 2. Fetch grouped counts across all lifetime career activity tables in safe parallel chunks (max 8 connections at a time)
    const [
      ktaGroups,
      inspList,
      csGroups,
      fbGroups,
      quoteGroups,
      themeGroups,
      commentGroups
    ] = await Promise.all([
      db.select({ nik: sql<string>`UPPER(${ktaReports.nik})`, count: sql<number>`count(*)::int` })
        .from(ktaReports)
        .groupBy(sql`UPPER(${ktaReports.nik})`),
      
      db.select({
        inspectorName: inspections.inspectorName,
        date: inspections.date
      })
      .from(inspections),

      db.select({ nik: sql<string>`UPPER(${roster.nik})`, count: sql<number>`count(*)::int` })
        .from(roster)
        .where(and(
          sql`${roster.date} ~ '^[0-9]{1,2} [A-Za-z]{3} [0-9]{2}$'`,
          sql`to_date(${roster.date}, 'DD Mon YY') <= CURRENT_DATE`,
          or(sql`UPPER(${roster.status}) = 'CS'`, sql`UPPER(${roster.status}) LIKE '%CUTI SITE%'`)
        ))
        .groupBy(sql`UPPER(${roster.nik})`),

      db.select({ nik: sql<string>`UPPER(${appFeedbacks.authorNik})`, count: sql<number>`count(*)::int` })
        .from(appFeedbacks)
        .groupBy(sql`UPPER(${appFeedbacks.authorNik})`),

      db.select({ nik: sql<string>`UPPER(${communityQuotes.authorNik})`, count: sql<number>`count(*)::int` })
        .from(communityQuotes)
        .groupBy(sql`UPPER(${communityQuotes.authorNik})`),

      db.select({ 
        nik: sql<string>`UPPER(${userThemes.nik})`, 
        count: sql<number>`count(distinct case when ${userThemes.mode} like 'template:%' then ${userThemes.id}::text else 'active_theme' end)::int` 
      })
        .from(userThemes)
        .groupBy(sql`UPPER(${userThemes.nik})`),

      db.select({ nik: sql<string>`UPPER(${bulletinComments.authorNik})`, count: sql<number>`count(*)::int` })
        .from(bulletinComments)
        .groupBy(sql`UPPER(${bulletinComments.authorNik})`)
    ]);

    const [
      quizGroups,
      p5mRows,
      woCreateGroups,
      closedWOs,
      closedTicketsAll,
      portalLoginRows,
      easterEggRows
    ] = await Promise.all([
      db.select({ nik: sql<string>`UPPER(${quizScores.nik})`, count: sql<number>`count(*)::int` })
        .from(quizScores)
        .where(sql`${quizScores.percentage} >= 100`)
        .groupBy(sql`UPPER(${quizScores.nik})`),

      db.select({ scheduleData: p5mSchedules.scheduleData })
        .from(p5mSchedules),

      db.select({ nik: sql<string>`UPPER(${workOrders.requestorNik})`, count: sql<number>`count(*)::int` })
        .from(workOrders)
        .groupBy(sql`UPPER(${workOrders.requestorNik})`),

      db.select({ technicianPic: workOrders.technicianPic, requestorNik: workOrders.requestorNik })
        .from(workOrders)
        .where(eq(workOrders.status, 'Closed')),

      db.select({
        pic: tickets.pic,
        completionDate: tickets.completionDate,
        date: tickets.date
      })
      .from(tickets)
      .where(sql`UPPER(${tickets.status}) = 'CLOSED'`),

      db.select({ nik: sql<string>`UPPER(${portalLogins.nik})`, loginDate: portalLogins.loginDate })
        .from(portalLogins),

      db.select({ nik: sql<string>`UPPER(${easterEggProgress.nik})`, node: easterEggProgress.node })
        .from(easterEggProgress)
    ]);

    // Active Season queries (activities created on or after seasonStart cutoff date)
    const [
      sKtaGroups,
      sInspList,
      sClosedTickets,
      sFbGroups,
      sQuoteGroups,
      sThemeGroups,
      sCommentGroups,
      sQuizGroups,
      sWoCreateGroups,
      sClosedWOs
    ] = await Promise.all([
      db.select({ nik: sql<string>`UPPER(${ktaReports.nik})`, count: sql<number>`count(*)::int` })
        .from(ktaReports)
        .where(sql`${ktaReports.createdAt} >= ${seasonStart}`)
        .groupBy(sql`UPPER(${ktaReports.nik})`),

      db.select({
        inspectorName: inspections.inspectorName,
        date: inspections.date
      })
      .from(inspections)
      .where(sql`${inspections.date} >= ${seasonStart}`),

      db.select({
        pic: tickets.pic,
        completionDate: tickets.completionDate,
        date: tickets.date
      })
      .from(tickets)
      .where(and(
        sql`UPPER(${tickets.status}) = 'CLOSED'`,
        sql`COALESCE(${tickets.completionDate}, ${tickets.date}) >= ${seasonStart}`
      )),

      db.select({ nik: sql<string>`UPPER(${appFeedbacks.authorNik})`, count: sql<number>`count(*)::int` })
        .from(appFeedbacks)
        .where(sql`${appFeedbacks.createdAt} >= ${seasonStart}`)
        .groupBy(sql`UPPER(${appFeedbacks.authorNik})`),

      db.select({ nik: sql<string>`UPPER(${communityQuotes.authorNik})`, count: sql<number>`count(*)::int` })
        .from(communityQuotes)
        .where(sql`${communityQuotes.createdAt} >= ${seasonStart}`)
        .groupBy(sql`UPPER(${communityQuotes.authorNik})`),

      db.select({ 
        nik: sql<string>`UPPER(${userThemes.nik})`, 
        count: sql<number>`count(distinct case when ${userThemes.mode} like 'template:%' then ${userThemes.id}::text else 'active_theme' end)::int` 
      })
        .from(userThemes)
        .where(sql`${userThemes.createdAt} >= ${seasonStart}`)
        .groupBy(sql`UPPER(${userThemes.nik})`),

      db.select({ nik: sql<string>`UPPER(${bulletinComments.authorNik})`, count: sql<number>`count(*)::int` })
        .from(bulletinComments)
        .where(sql`${bulletinComments.createdAt} >= ${seasonStart}`)
        .groupBy(sql`UPPER(${bulletinComments.authorNik})`),

      db.select({ nik: sql<string>`UPPER(${quizScores.nik})`, count: sql<number>`count(*)::int` })
        .from(quizScores)
        .where(and(sql`${quizScores.percentage} >= 100`, sql`${quizScores.timestamp} >= ${seasonStart}`))
        .groupBy(sql`UPPER(${quizScores.nik})`),

      db.select({ nik: sql<string>`UPPER(${workOrders.requestorNik})`, count: sql<number>`count(*)::int` })
        .from(workOrders)
        .where(sql`${workOrders.createdAt} >= ${seasonStart}`)
        .groupBy(sql`UPPER(${workOrders.requestorNik})`),

      db.select({ technicianPic: workOrders.technicianPic, requestorNik: workOrders.requestorNik })
        .from(workOrders)
        .where(and(eq(workOrders.status, 'Closed'), sql`${workOrders.repairEnd} >= ${seasonStart}`))
    ]);

    const ktaMap = new Map(ktaGroups.map(g => [g.nik, g.count]));
    const csMap = new Map(csGroups.map(g => [g.nik, g.count]));
    const fbMap = new Map(fbGroups.map(g => [g.nik, g.count]));
    const quoteMap = new Map(quoteGroups.map(g => [g.nik, g.count]));
    const themeMap = new Map(themeGroups.map(g => [g.nik, g.count]));
    const commentMap = new Map(commentGroups.map(g => [g.nik, g.count]));
    const quizMap = new Map(quizGroups.map(g => [g.nik, g.count]));
    const woCreateMap = new Map(woCreateGroups.map(g => [g.nik, g.count]));
    const easterEggMap = new Map(easterEggRows.map(g => [g.nik, g.node || 1]));

    const sKtaMap = new Map(sKtaGroups.map(g => [g.nik, g.count]));
    const sFbMap = new Map(sFbGroups.map(g => [g.nik, g.count]));
    const sQuoteMap = new Map(sQuoteGroups.map(g => [g.nik, g.count]));
    const sThemeMap = new Map(sThemeGroups.map(g => [g.nik, g.count]));
    const sCommentMap = new Map(sCommentGroups.map(g => [g.nik, g.count]));
    const sQuizMap = new Map(sQuizGroups.map(g => [g.nik, g.count]));
    const sWoCreateMap = new Map(sWoCreateGroups.map(g => [g.nik, g.count]));

    const loginsMap = new Map<string, string[]>();
    for (const row of portalLoginRows) {
      if (row.nik && row.loginDate) {
        if (!loginsMap.has(row.nik)) loginsMap.set(row.nik, []);
        loginsMap.get(row.nik)!.push(row.loginDate);
      }
    }

    const inspCountMap = new Map<string, number>();
    const nightCountMap = new Map<string, number>();
    const dawnCountMap = new Map<string, number>();
    const weekendCountMap = new Map<string, number>();
    const inspDatesMap = new Map<string, string[]>();

    inspList.forEach(item => {
      const nameKey = (item.inspectorName || '').trim().toUpperCase();
      if (!nameKey) return;
      inspCountMap.set(nameKey, (inspCountMap.get(nameKey) || 0) + 1);

      if (item.date) {
        const d = new Date(item.date);
        const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
        if (!inspDatesMap.has(nameKey)) inspDatesMap.set(nameKey, []);
        inspDatesMap.get(nameKey)!.push(dateStr);

        const h = d.getHours();
        const m = d.getMinutes();
        if (h >= 1 && h <= 4) {
          nightCountMap.set(nameKey, (nightCountMap.get(nameKey) || 0) + 1);
        }
        if ((h === 4 && m >= 30) || h === 5 || (h === 6 && m <= 30)) {
          dawnCountMap.set(nameKey, (dawnCountMap.get(nameKey) || 0) + 1);
        }
        const witD = new Date(d.getTime() + (9 * 60 * 60 * 1000));
        const day = witD.getUTCDay();
        if (day === 0 || day === 6) {
          weekendCountMap.set(nameKey, (weekendCountMap.get(nameKey) || 0) + 1);
        }
      }
    });

    const sInspCountMap = new Map<string, number>();
    const sNightCountMap = new Map<string, number>();
    const sDawnCountMap = new Map<string, number>();
    const sWeekendCountMap = new Map<string, number>();

    sInspList.forEach(item => {
      const nameKey = (item.inspectorName || '').trim().toUpperCase();
      if (!nameKey) return;
      sInspCountMap.set(nameKey, (sInspCountMap.get(nameKey) || 0) + 1);

      if (item.date) {
        const d = new Date(item.date);
        const h = d.getHours();
        const m = d.getMinutes();
        if (h >= 1 && h <= 4) {
          sNightCountMap.set(nameKey, (sNightCountMap.get(nameKey) || 0) + 1);
        }
        if ((h === 4 && m >= 30) || h === 5 || (h === 6 && m <= 30)) {
          sDawnCountMap.set(nameKey, (sDawnCountMap.get(nameKey) || 0) + 1);
        }
        const witD = new Date(d.getTime() + (9 * 60 * 60 * 1000));
        const day = witD.getUTCDay();
        if (day === 0 || day === 6) {
          sWeekendCountMap.set(nameKey, (sWeekendCountMap.get(nameKey) || 0) + 1);
        }
      }
    });

    const p5mStrings = p5mRows
      .filter(r => r.scheduleData && typeof r.scheduleData === 'object')
      .map(r => JSON.stringify(r.scheduleData).toUpperCase());

    const leaderboard = activeEmps.map((emp) => {
      const cleanNik = (emp.nik || '').trim().toUpperCase();
      const cleanName = (emp.name || '').trim().toUpperCase();

      const ktaCount = ktaMap.get(cleanNik) || 0;
      const csCount = csMap.get(cleanNik) || 0;
      const feedbackCount = fbMap.get(cleanNik) || 0;
      const quotesCount = quoteMap.get(cleanNik) || 0;
      const themesCount = themeMap.get(cleanNik) || 0;
      const bulletinCount = commentMap.get(cleanNik) || 0;
      const quiz100Count = quizMap.get(cleanNik) || 0;
      const woCreateCount = woCreateMap.get(cleanNik) || 0;

      let woResolveCount = 0;
      for (const wo of closedWOs) {
        const pic = (wo.technicianPic || '').toUpperCase();
        if (pic.includes(cleanName) || (cleanNik && wo.requestorNik && wo.requestorNik.toUpperCase() === cleanNik && pic.length === 0)) {
          woResolveCount++;
        }
      }

      let defectsCount = 0;
      for (const t of closedTicketsAll) {
        if (!t.pic) continue;
        const rawPic = String(t.pic).trim().toUpperCase();
        if (rawPic.includes(cleanNik) || (cleanName.length >= 3 && (rawPic.includes(cleanName) || cleanName.includes(rawPic.replace(/\(.*?\)/g, '').trim())))) {
          defectsCount++;
        }
      }

      let sDefectsCount = 0;
      for (const t of sClosedTickets) {
        if (!t.pic) continue;
        const rawPic = String(t.pic).trim().toUpperCase();
        if (rawPic.includes(cleanNik) || (cleanName.length >= 3 && (rawPic.includes(cleanName) || cleanName.includes(rawPic.replace(/\(.*?\)/g, '').trim())))) {
          sDefectsCount++;
        }
      }

      let inspectionCount = 0;
      let nightCount = 0;
      let dawnCount = 0;
      let weekendCount = 0;
      const empActivityDates: string[] = loginsMap.get(cleanNik) ? [...loginsMap.get(cleanNik)!] : [];

      for (const [inspName, cnt] of inspCountMap.entries()) {
        if (inspName.includes(cleanName) || cleanName.includes(inspName) || (cleanNik && inspName.includes(cleanNik))) {
          inspectionCount += cnt;
          nightCount += nightCountMap.get(inspName) || 0;
          dawnCount += dawnCountMap.get(inspName) || 0;
          weekendCount += weekendCountMap.get(inspName) || 0;
          const dArr = inspDatesMap.get(inspName);
          if (dArr) empActivityDates.push(...dArr);
        }
      }

      const loginStreak = calculateStreak(empActivityDates);
      const easterEggCount = easterEggMap.get(cleanNik) || 0;

      let p5mSpeakerCount = 0;
      for (const pStr of p5mStrings) {
        if (pStr.includes(cleanNik) || (cleanName.length > 4 && pStr.includes(cleanName))) {
          p5mSpeakerCount++;
        }
      }

      // Polymath count
      const polymathCategories = [
        ktaCount > 0,
        inspectionCount > 0,
        defectsCount > 0,
        woCreateCount > 0,
        woResolveCount > 0,
        csCount > 0,
        feedbackCount > 0,
        quotesCount > 0,
        themesCount > 0,
        bulletinCount > 0,
        p5mSpeakerCount > 0,
        quiz100Count > 0,
        loginStreak > 0
      ];
      const polymathCount = polymathCategories.filter(Boolean).length;

      let achievementBonusXp = 0;
      const allUnlockedTitles: string[] = [];

      TIERED_ACHIEVEMENTS.forEach(ach => {
        let currentVal = 0;
        switch (ach.code) {
          case 'BRANCH_KTA': currentVal = ktaCount; break;
          case 'BRANCH_INSPECTION': currentVal = inspectionCount; break;
          case 'BRANCH_DEFECTS': currentVal = defectsCount; break;
          case 'BRANCH_WO_CREATE': currentVal = woCreateCount; break;
          case 'BRANCH_WO_RESOLVE': currentVal = woResolveCount; break;
          case 'BRANCH_CS': currentVal = csCount; break;
          case 'BRANCH_FEEDBACK': currentVal = feedbackCount; break;
          case 'BRANCH_QUOTES': currentVal = quotesCount; break;
          case 'BRANCH_THEMES': currentVal = themesCount; break;
          case 'BRANCH_BULLETIN': currentVal = bulletinCount; break;
          case 'BRANCH_P5M_SPEAKER': currentVal = p5mSpeakerCount; break;
          case 'BRANCH_QUIZ': currentVal = quiz100Count; break;
          case 'BRANCH_LOGIN_STREAK': currentVal = loginStreak; break;
          case 'BRANCH_NIGHT': currentVal = nightCount; break;
          case 'BRANCH_DAWN': currentVal = dawnCount; break;
          case 'BRANCH_WEEKEND': currentVal = weekendCount; break;
          case 'BRANCH_POLYMATH': currentVal = polymathCount; break;
          case 'BRANCH_EASTER_EGG': currentVal = easterEggCount; break;
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
        (ktaCount * ACTION_XP_WEIGHTS.KTA) +
        (inspectionCount * ACTION_XP_WEIGHTS.INSPECTION) +
        (defectsCount * ACTION_XP_WEIGHTS.DEFECTS) +
        (woCreateCount * ACTION_XP_WEIGHTS.WO_CREATE) +
        (woResolveCount * ACTION_XP_WEIGHTS.WO_RESOLVE) +
        (csCount * ACTION_XP_WEIGHTS.CS) + // Cuti Site gives 0 EXP (pure hidden achievement)
        (feedbackCount * ACTION_XP_WEIGHTS.FEEDBACK) +
        (quotesCount * ACTION_XP_WEIGHTS.QUOTES) +
        (themesCount * ACTION_XP_WEIGHTS.THEMES) +
        (bulletinCount * ACTION_XP_WEIGHTS.BULLETIN) +
        (p5mSpeakerCount * ACTION_XP_WEIGHTS.P5M_SPEAKER) +
        (quiz100Count * ACTION_XP_WEIGHTS.QUIZ_100) +
        (nightCount * ACTION_XP_WEIGHTS.NIGHT_SHIFT) +
        (dawnCount * ACTION_XP_WEIGHTS.DAWN_SHIFT) +
        (weekendCount * ACTION_XP_WEIGHTS.WEEKEND_SHIFT);

      const roleStartingXp = getRoleStartingXp(emp.position, emp.department, emp.section);
      const totalXp = Math.max(0, roleStartingXp + baseActionsXp + achievementBonusXp);
      const rankInfo = getRankByXp(totalXp);
      const normSec = normalizeSection(emp.section, emp.department, emp.position);

      if (roleStartingXp >= 24501) {
        allUnlockedTitles.push('Supreme Commander', 'Division General');
      } else if (roleStartingXp >= 22601) {
        allUnlockedTitles.push('Field Superintendent', 'Brigade Commander');
      }

      const defaultTitle = allUnlockedTitles.length > 0
        ? allUnlockedTitles[allUnlockedTitles.length - 1]
        : 'Frontline Trainee';

      // Calculate Season EXP strictly from active season actions (starts at 0 on season launch)
      const sKtaCount = sKtaMap.get(cleanNik) || 0;
      const sFeedbackCount = sFbMap.get(cleanNik) || 0;
      const sQuotesCount = sQuoteMap.get(cleanNik) || 0;
      const sThemesCount = sThemeMap.get(cleanNik) || 0;
      const sBulletinCount = sCommentMap.get(cleanNik) || 0;
      const sQuiz100Count = sQuizMap.get(cleanNik) || 0;
      const sWoCreateCount = sWoCreateMap.get(cleanNik) || 0;

      let sWoResolveCount = 0;
      for (const wo of sClosedWOs) {
        const pic = (wo.technicianPic || '').toUpperCase();
        if (pic.includes(cleanName) || (cleanNik && wo.requestorNik && wo.requestorNik.toUpperCase() === cleanNik && pic.length === 0)) {
          sWoResolveCount++;
        }
      }

      let sInspectionCount = 0;
      let sNightCount = 0;
      let sDawnCount = 0;
      let sWeekendCount = 0;
      for (const [inspName, cnt] of sInspCountMap.entries()) {
        if (inspName.includes(cleanName) || cleanName.includes(inspName) || (cleanNik && inspName.includes(cleanNik))) {
          sInspectionCount += cnt;
          sNightCount += sNightCountMap.get(inspName) || 0;
          sDawnCount += sDawnCountMap.get(inspName) || 0;
          sWeekendCount += sWeekendCountMap.get(inspName) || 0;
        }
      }

      const seasonXp = 
        (sKtaCount * ACTION_XP_WEIGHTS.KTA) +
        (sInspectionCount * ACTION_XP_WEIGHTS.INSPECTION) +
        (sDefectsCount * ACTION_XP_WEIGHTS.DEFECTS) +
        (sWoCreateCount * ACTION_XP_WEIGHTS.WO_CREATE) +
        (sWoResolveCount * ACTION_XP_WEIGHTS.WO_RESOLVE) +
        (sFeedbackCount * ACTION_XP_WEIGHTS.FEEDBACK) +
        (sQuotesCount * ACTION_XP_WEIGHTS.QUOTES) +
        (sThemesCount * ACTION_XP_WEIGHTS.THEMES) +
        (sBulletinCount * ACTION_XP_WEIGHTS.BULLETIN) +
        (sQuiz100Count * ACTION_XP_WEIGHTS.QUIZ_100) +
        (sNightCount * ACTION_XP_WEIGHTS.NIGHT_SHIFT) +
        (sDawnCount * ACTION_XP_WEIGHTS.DAWN_SHIFT) +
        (sWeekendCount * ACTION_XP_WEIGHTS.WEEKEND_SHIFT);

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
        roleStartingXp,
        achievementBonusXp,
        baseActionsXp,
        inspectionCount,
        defectsCount,
        sDefectsCount,
        ktaCount,
        woCreateCount,
        woResolveCount,
        csCount,
        feedbackCount,
        quotesCount,
        themesCount,
        bulletinCount,
        p5mSpeakerCount,
        quiz100Count,
        loginStreak,
        nightCount,
        dawnCount,
        weekendCount,
        polymathCount,
        // Monthly / season activity counts
        sKtaCount,
        sInspectionCount,
        sWoCreateCount,
        sWoResolveCount,
        sFeedbackCount,
        sQuotesCount,
        sThemesCount,
        sBulletinCount,
        sQuiz100Count,
        sNightCount,
        sDawnCount,
        sWeekendCount,
        seasonXp: Math.max(0, seasonXp)
      };
    });

    // Leaderboard sorted by Monthly / Season XP (perolehan EXP bulan ini)
    leaderboard.sort((a, b) => {
      if (b.seasonXp !== a.seasonXp) {
        return b.seasonXp - a.seasonXp;
      }
      return b.totalXp - a.totalXp;
    });
    
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
      { name: 'Inventory Control', color: 'text-cyan-500' },
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
