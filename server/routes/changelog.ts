import { Router } from "express";
import fs from "fs";
import path from "path";

export const router = Router();

export interface ChangelogItem {
  title: string;
  description: string;
  subItems: string[];
}

export interface ChangelogSection {
  title: string;
  emoji: string;
  cleanTitle: string;
  category: 'feature' | 'security' | 'fix' | 'sync' | 'docs' | 'maintenance' | 'other';
  items: ChangelogItem[];
}

export interface ChangelogRelease {
  version: string;
  date: string;
  isLatest: boolean;
  sections: ChangelogSection[];
  rawMarkdown: string;
}

let cachedReleases: ChangelogRelease[] | null = null;
let lastMtime: number = 0;

function parseMarkdownChangelog(content: string): ChangelogRelease[] {
  const lines = content.split(/\r?\n/);
  const releases: ChangelogRelease[] = [];
  let currentRelease: ChangelogRelease | null = null;
  let currentSection: ChangelogSection | null = null;
  let currentItem: ChangelogItem | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Match Version Header: ## [2.8.28] - 2026-09-15
    const versionMatch = trimmed.match(/^##\s+\[(.*?)\](?:\s+-\s+(.*?))?$/);
    if (versionMatch) {
      currentRelease = {
        version: versionMatch[1],
        date: versionMatch[2] || '',
        isLatest: releases.length === 0,
        sections: [],
        rawMarkdown: rawLine + '\n'
      };
      releases.push(currentRelease);
      currentSection = null;
      currentItem = null;
      continue;
    }

    if (!currentRelease) continue;

    currentRelease.rawMarkdown += rawLine + '\n';

    // Match Section Header: ### 🔐 Title
    const sectionMatch = trimmed.match(/^###\s+(.*)$/);
    if (sectionMatch) {
      const fullTitle = sectionMatch[1].trim();
      let emoji = '';
      let cleanTitle = fullTitle;

      const emojiMatch = fullTitle.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|[✨🛡️🔐📝🏷️📄🚫🔄⚡🐛🎨🚀])\s*(.*)$/u);
      if (emojiMatch) {
        emoji = emojiMatch[1];
        cleanTitle = emojiMatch[2];
      }

      let category: ChangelogSection['category'] = 'feature';
      const lower = cleanTitle.toLowerCase();
      if (emoji.match(/[🔐🛡️]/) || lower.includes('keamanan') || lower.includes('security') || lower.includes('password') || lower.includes('guard')) {
        category = 'security';
      } else if (emoji.match(/[🐛🔧]/) || lower.includes('fix') || lower.includes('perbaikan') || lower.includes('bug') || lower.includes('penanganan')) {
        category = 'fix';
      } else if (emoji.match(/[🔄⚡]/) || lower.includes('sinkronisasi') || lower.includes('sync') || lower.includes('transisi') || lower.includes('optimasi') || lower.includes('performa')) {
        category = 'sync';
      } else if (emoji.match(/[📝📄🏷️]/) || lower.includes('materi') || lower.includes('dokumen') || lower.includes('sop') || lower.includes('ik') || lower.includes('prosedur')) {
        category = 'docs';
      } else if (emoji.match(/[🚫]/) || lower.includes('larangan') || lower.includes('pembersihan') || lower.includes('cleanup')) {
        category = 'maintenance';
      }

      currentSection = {
        title: fullTitle,
        emoji,
        cleanTitle,
        category,
        items: []
      };
      currentRelease.sections.push(currentSection);
      currentItem = null;
      continue;
    }

    // Match Root Bullet: - **Title**: Description or - Description
    const rootBulletMatch = rawLine.match(/^[-*]\s+(.*)$/);
    if (rootBulletMatch) {
      const bulletText = rootBulletMatch[1];
      let itemTitle = '';
      let itemDesc = bulletText;

      const titleMatch = bulletText.match(/^\*\*(.*?)\*\*(?::\s*|\s+-\s*|\s*)(.*)$/);
      if (titleMatch) {
        itemTitle = titleMatch[1];
        itemDesc = titleMatch[2];
      }

      currentItem = {
        title: itemTitle,
        description: itemDesc,
        subItems: []
      };

      if (!currentSection) {
        currentSection = {
          title: 'Pembaruan Sistem',
          emoji: '✨',
          cleanTitle: 'Pembaruan Sistem',
          category: 'feature',
          items: []
        };
        currentRelease.sections.push(currentSection);
      }
      currentSection.items.push(currentItem);
      continue;
    }

    // Match Sub-Bullet: 2 or more leading spaces with bullet or numbered list
    const subBulletMatch = rawLine.match(/^\s{2,}(?:[-*]|\d+\.)\s+(.*)$/);
    if (subBulletMatch && currentItem) {
      currentItem.subItems.push(subBulletMatch[1]);
      continue;
    }

    // Continuation text lines
    if (trimmed && currentItem) {
      if (currentItem.subItems.length > 0) {
        currentItem.subItems[currentItem.subItems.length - 1] += ' ' + trimmed;
      } else {
        currentItem.description += ' ' + trimmed;
      }
    }
  }

  return releases;
}

function getChangelogReleases(): { releases: ChangelogRelease[]; latestVersion: string; totalReleases: number } {
  const possiblePaths = [
    path.resolve(process.cwd(), "CHANGELOG.md"),
    path.resolve(process.cwd(), "dist", "CHANGELOG.md"),
    path.resolve(__dirname, "../../CHANGELOG.md"),
    path.resolve(__dirname, "../CHANGELOG.md"),
    path.resolve(__dirname, "CHANGELOG.md"),
    "/app/CHANGELOG.md"
  ];
  
  const changelogPath = possiblePaths.find(p => fs.existsSync(p));
  
  if (!changelogPath) {
    return { releases: [], latestVersion: "0.0.0", totalReleases: 0 };
  }

  const stat = fs.statSync(changelogPath);
  if (!cachedReleases || stat.mtimeMs !== lastMtime) {
    const rawContent = fs.readFileSync(changelogPath, "utf8");
    cachedReleases = parseMarkdownChangelog(rawContent);
    lastMtime = stat.mtimeMs;
  }

  const latestVersion = cachedReleases.length > 0 ? cachedReleases[0].version : "0.0.0";
  return {
    releases: cachedReleases,
    latestVersion,
    totalReleases: cachedReleases.length
  };
}

// GET /api/changelog
router.get("/api/changelog", (_req, res) => {
  try {
    const data = getChangelogReleases();
    res.json({
      status: "success",
      data
    });
  } catch (error: any) {
    console.error("Error loading changelog:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// GET /api/changelog/latest
router.get("/api/changelog/latest", (_req, res) => {
  try {
    const { releases, latestVersion } = getChangelogReleases();
    const latestRelease = releases.length > 0 ? releases[0] : null;
    res.json({
      status: "success",
      data: {
        latestVersion,
        release: latestRelease
      }
    });
  } catch (error: any) {
    console.error("Error loading latest changelog:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});
