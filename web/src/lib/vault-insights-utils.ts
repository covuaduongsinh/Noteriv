/**
 * Vault Insights data computation — ported from
 * desktop/src/lib/vault-insights-utils.ts. All the pure aggregation helpers
 * (heatmap/link-graph/tag-distribution/streak/growth/health) are unchanged;
 * only `computeVaultInsights` itself is rewritten against `webApi` (vault
 * index + per-note N+1 fetch, the same tradeoff Phase 2/6 already accepted
 * for GraphView/tag-utils/CalendarView — there's still no bulk "read every
 * note's content" endpoint). `filePath`/`fileName` field names are kept on
 * HubNote/OrphanNote for minimal component churn, but `filePath` now holds
 * the note's id (so `onFileSelect(id)` can call `openNote` directly) rather
 * than a filesystem path.
 */

import { webApi, type VaultIndex } from "./webApi";
import { parseTags } from "@noteriv/core/tag-utils";
import { hasFrontmatter } from "@noteriv/core/frontmatter-utils";

export interface HeatmapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface HubNote {
  filePath: string; // noteId
  fileName: string;
  incomingCount: number;
  outgoingCount: number;
  totalConnections: number;
}

export interface OrphanNote {
  filePath: string; // noteId
  fileName: string;
}

export interface TagStat {
  tag: string;
  count: number;
}

export interface GrowthPoint {
  month: string;
  label: string;
  cumulative: number;
}

export interface DailyStreak {
  current: number;
  longest: number;
  lastDate: string | null;
}

export interface VaultHealthScore {
  overall: number;
  withBacklinks: number;
  withTags: number;
  withFrontmatter: number;
  totalNotes: number;
}

export interface VaultInsightsData {
  totalNotes: number;
  totalWords: number;
  totalTags: number;
  totalLinks: number;
  avgNoteLength: number;
  heatmap: HeatmapDay[];
  hubNotes: HubNote[];
  orphanNotes: OrphanNote[];
  tagDistribution: TagStat[];
  dailyStreak: DailyStreak;
  growthOverTime: GrowthPoint[];
  vaultHealth: VaultHealthScore;
}

interface Entry {
  id: string;
  name: string;
  createdMs: number;
  updatedMs: number;
}

const LINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const DAILY_NOTE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CONCURRENCY = 10;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toDateStr(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toMonthStr(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  return `${MONTH_LABELS[parseInt(month, 10) - 1]} ${year}`;
}

function daysBetween(a: string, b: string): number {
  const msA = new Date(a + "T00:00:00").getTime();
  const msB = new Date(b + "T00:00:00").getTime();
  return Math.round(Math.abs(msB - msA) / 86400000);
}

async function batchReadNotes(vaultId: string, ids: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const contents = await Promise.all(
      batch.map((id) => webApi.notes.get(vaultId, id).then((n) => n.content).catch(() => null))
    );
    batch.forEach((id, idx) => {
      if (contents[idx] != null) results.set(id, contents[idx]!);
    });
  }
  return results;
}

function buildHeatmap(files: Entry[]): HeatmapDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const countByDate = new Map<string, number>();
  for (const f of files) {
    const ds = toDateStr(f.updatedMs);
    countByDate.set(ds, (countByDate.get(ds) || 0) + 1);
  }

  const days: HeatmapDay[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = toDateStr(d.getTime());
    days.push({ date: ds, count: countByDate.get(ds) || 0, level: 0 });
  }

  const nonZero = days.filter((d) => d.count > 0).map((d) => d.count);
  if (nonZero.length > 0) {
    nonZero.sort((a, b) => a - b);
    const p25 = nonZero[Math.floor(nonZero.length * 0.25)] || 1;
    const p50 = nonZero[Math.floor(nonZero.length * 0.5)] || 2;
    const p75 = nonZero[Math.floor(nonZero.length * 0.75)] || 3;
    for (const day of days) {
      if (day.count === 0) day.level = 0;
      else if (day.count <= p25) day.level = 1;
      else if (day.count <= p50) day.level = 2;
      else if (day.count <= p75) day.level = 3;
      else day.level = 4;
    }
  }

  return days;
}

interface LinkGraphResult {
  totalLinks: number;
  hubNotes: HubNote[];
  orphanNotes: OrphanNote[];
  incomingMap: Map<string, Set<string>>;
}

function buildLinkGraph(files: Entry[], contentMap: Map<string, string>): LinkGraphResult {
  const labelToId = new Map<string, string>();
  for (const f of files) {
    labelToId.set(f.name.replace(/\.(md|markdown)$/i, "").toLowerCase(), f.id);
  }

  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  let totalLinks = 0;

  for (const f of files) {
    outgoing.set(f.id, new Set());
    if (!incoming.has(f.id)) incoming.set(f.id, new Set());
  }

  for (const f of files) {
    const content = contentMap.get(f.id);
    if (!content) continue;

    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    LINK_REGEX.lastIndex = 0;
    while ((match = LINK_REGEX.exec(content)) !== null) {
      const target = match[1].split("#")[0].trim().toLowerCase();
      if (!target || seen.has(target)) continue;
      seen.add(target);

      const targetId = labelToId.get(target);
      if (targetId && targetId !== f.id) {
        outgoing.get(f.id)!.add(targetId);
        if (!incoming.has(targetId)) incoming.set(targetId, new Set());
        incoming.get(targetId)!.add(f.id);
        totalLinks++;
      }
    }
  }

  const connectionList: HubNote[] = files.map((f) => ({
    filePath: f.id,
    fileName: f.name,
    incomingCount: incoming.get(f.id)?.size || 0,
    outgoingCount: outgoing.get(f.id)?.size || 0,
    totalConnections: (incoming.get(f.id)?.size || 0) + (outgoing.get(f.id)?.size || 0),
  }));
  connectionList.sort((a, b) => b.totalConnections - a.totalConnections);
  const hubNotes = connectionList.slice(0, 10).filter((n) => n.totalConnections > 0);

  const orphanNotes: OrphanNote[] = connectionList
    .filter((n) => n.totalConnections === 0)
    .map((n) => ({ filePath: n.filePath, fileName: n.fileName }));

  return { totalLinks, hubNotes, orphanNotes, incomingMap: incoming };
}

function buildTagDistribution(contentMap: Map<string, string>): { tags: TagStat[]; totalUnique: number } {
  const tagCounts = new Map<string, number>();
  for (const content of contentMap.values()) {
    const fileTags = new Set(parseTags(content));
    for (const tag of fileTags) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  }
  const sorted = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
  return { tags: sorted.slice(0, 20), totalUnique: tagCounts.size };
}

function computeDailyStreak(files: Entry[]): DailyStreak {
  const dailyDates = files
    .map((f) => f.name.replace(/\.(md|markdown)$/i, ""))
    .filter((name) => DAILY_NOTE_REGEX.test(name))
    .sort();

  if (dailyDates.length === 0) return { current: 0, longest: 0, lastDate: null };

  const unique = [...new Set(dailyDates)].sort();
  const todayStr = toDateStr(Date.now());

  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    if (daysBetween(unique[i - 1], unique[i]) === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  let current = 0;
  const last = unique[unique.length - 1];
  const gap = daysBetween(last, todayStr);
  if (gap <= 1) {
    current = 1;
    for (let i = unique.length - 2; i >= 0; i--) {
      if (daysBetween(unique[i], unique[i + 1]) === 1) current++;
      else break;
    }
  }

  return { current, longest, lastDate: last };
}

function buildGrowthTimeline(files: Entry[]): GrowthPoint[] {
  const monthCounts = new Map<string, number>();
  for (const f of files) {
    const ms = toMonthStr(f.createdMs);
    monthCounts.set(ms, (monthCounts.get(ms) || 0) + 1);
  }
  const months = Array.from(monthCounts.keys()).sort();
  if (months.length === 0) return [];

  const points: GrowthPoint[] = [];
  let cumulative = 0;
  for (const m of months) {
    cumulative += monthCounts.get(m)!;
    points.push({ month: m, label: toMonthLabel(m), cumulative });
  }
  return points;
}

function computeVaultHealth(
  files: Entry[],
  contentMap: Map<string, string>,
  incomingMap: Map<string, Set<string>>
): VaultHealthScore {
  const total = files.length;
  if (total === 0) return { overall: 0, withBacklinks: 0, withTags: 0, withFrontmatter: 0, totalNotes: 0 };

  let bl = 0, tg = 0, fm = 0;
  for (const f of files) {
    const content = contentMap.get(f.id);
    if (!content) continue;
    if ((incomingMap.get(f.id)?.size || 0) > 0) bl++;
    if (parseTags(content).length > 0) tg++;
    if (hasFrontmatter(content)) fm++;
  }

  const withBacklinks = Math.round((bl / total) * 100);
  const withTags = Math.round((tg / total) * 100);
  const withFrontmatter = Math.round((fm / total) * 100);
  const overall = Math.round(withBacklinks * 0.4 + withTags * 0.3 + withFrontmatter * 0.3);

  return { overall, withBacklinks, withTags, withFrontmatter, totalNotes: total };
}

export async function computeVaultInsights(vaultId: string, index: VaultIndex): Promise<VaultInsightsData> {
  const files: Entry[] = index.notes.map((n) => ({
    id: n.id,
    name: n.name,
    createdMs: new Date(n.createdAt).getTime(),
    updatedMs: new Date(n.updatedAt).getTime(),
  }));

  const contentMap = await batchReadNotes(vaultId, files.map((f) => f.id));

  let totalWords = 0;
  for (const content of contentMap.values()) totalWords += content.split(/\s+/).filter(Boolean).length;
  const totalNotes = files.length;
  const avgNoteLength = totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0;

  const heatmap = buildHeatmap(files);
  const { totalLinks, hubNotes, orphanNotes, incomingMap } = buildLinkGraph(files, contentMap);
  const { tags: tagDistribution, totalUnique: totalTags } = buildTagDistribution(contentMap);
  const dailyStreak = computeDailyStreak(files);
  const growthOverTime = buildGrowthTimeline(files);
  const vaultHealth = computeVaultHealth(files, contentMap, incomingMap);

  return {
    totalNotes, totalWords, totalTags, totalLinks, avgNoteLength,
    heatmap, hubNotes, orphanNotes, tagDistribution, dailyStreak, growthOverTime, vaultHealth,
  };
}
