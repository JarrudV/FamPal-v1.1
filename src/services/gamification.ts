import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
} from '../../lib/firebase';

export type ContributionType =
  | 'community_report'
  | 'accessibility_report'
  | 'family_facilities_report'
  | 'pet_friendly_report'
  | 'mark_visited'
  | 'save_memory'
  | 'add_notes'
  | 'helpful_vote_received';

export const POINTS_MAP: Record<ContributionType, number> = {
  community_report: 15,
  accessibility_report: 10,
  family_facilities_report: 10,
  pet_friendly_report: 10,
  mark_visited: 5,
  save_memory: 5,
  add_notes: 3,
  helpful_vote_received: 2,
};

export interface ExplorerLevel {
  level: number;
  title: string;
  icon: string;
  minPoints: number;
  color: string;
}

export const EXPLORER_LEVELS: ExplorerLevel[] = [
  { level: 1, title: 'Newcomer', icon: '🌱', minPoints: 0, color: '#94a3b8' },
  { level: 2, title: 'Explorer', icon: '🗺️', minPoints: 25, color: '#60a5fa' },
  { level: 3, title: 'Trailblazer', icon: '🥾', minPoints: 75, color: '#34d399' },
  { level: 4, title: 'Pathfinder', icon: '🧭', minPoints: 200, color: '#a78bfa' },
  { level: 5, title: 'Guide', icon: '⭐', minPoints: 500, color: '#fbbf24' },
  { level: 6, title: 'Champion', icon: '🏆', minPoints: 1500, color: '#f97316' },
  { level: 7, title: 'Legend', icon: '👑', minPoints: 5000, color: '#ef4444' },
];

export type BadgeId =
  | 'first_report'
  | 'ten_reports'
  | 'accessibility_advocate'
  | 'family_champion'
  | 'popular_contributor'
  | 'adventurer'
  | 'memory_maker';

export interface Badge {
  id: BadgeId;
  title: string;
  description: string;
  icon: string;
  requirement: string;
}

export const ALL_BADGES: Badge[] = [
  { id: 'first_report', title: 'First Report', description: 'Submitted your first community report', icon: '📝', requirement: '1 community report' },
  { id: 'ten_reports', title: 'Seasoned Reporter', description: 'Submitted 10 community reports', icon: '🎯', requirement: '10 community reports' },
  { id: 'accessibility_advocate', title: 'Accessibility Advocate', description: 'Submitted 5 accessibility reports', icon: '♿', requirement: '5 accessibility reports' },
  { id: 'family_champion', title: 'Family Champion', description: 'Submitted 5 family facilities reports', icon: '👨‍👩‍👧‍👦', requirement: '5 facility reports' },
  { id: 'popular_contributor', title: 'Popular Contributor', description: 'Received 10 helpful votes', icon: '👍', requirement: '10 helpful votes received' },
  { id: 'adventurer', title: 'Adventurer', description: 'Visited 20 places', icon: '🏔️', requirement: '20 places visited' },
  { id: 'memory_maker', title: 'Memory Maker', description: 'Saved 10 memories', icon: '📸', requirement: '10 memories saved' },
];

export interface GamificationProfile {
  totalPoints: number;
  level: number;
  contributions: Record<ContributionType, number>;
  badges: BadgeId[];
  currentStreakWeeks: number;
  bestStreakWeeks: number;
  lastContributionAt?: string;
  lastUpdated?: unknown;
}

const DEFAULT_CONTRIBUTIONS: Record<ContributionType, number> = {
  community_report: 0,
  accessibility_report: 0,
  family_facilities_report: 0,
  pet_friendly_report: 0,
  mark_visited: 0,
  save_memory: 0,
  add_notes: 0,
  helpful_vote_received: 0,
};

export function getLevelForPoints(points: number): ExplorerLevel {
  let current = EXPLORER_LEVELS[0];
  for (const level of EXPLORER_LEVELS) {
    if (points >= level.minPoints) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

export function getNextLevel(currentLevel: number): ExplorerLevel | null {
  const idx = EXPLORER_LEVELS.findIndex(l => l.level === currentLevel);
  if (idx < 0 || idx >= EXPLORER_LEVELS.length - 1) return null;
  return EXPLORER_LEVELS[idx + 1];
}

export function getProgressToNextLevel(points: number): { current: ExplorerLevel; next: ExplorerLevel | null; progress: number } {
  const current = getLevelForPoints(points);
  const next = getNextLevel(current.level);
  if (!next) return { current, next: null, progress: 1 };
  const rangeStart = current.minPoints;
  const rangeEnd = next.minPoints;
  const progress = Math.min(1, (points - rangeStart) / (rangeEnd - rangeStart));
  return { current, next, progress };
}

function checkBadges(contributions: Record<ContributionType, number>): BadgeId[] {
  const earned: BadgeId[] = [];
  if (contributions.community_report >= 1) earned.push('first_report');
  if (contributions.community_report >= 10) earned.push('ten_reports');
  if (contributions.accessibility_report >= 5) earned.push('accessibility_advocate');
  if (contributions.family_facilities_report >= 5) earned.push('family_champion');
  if (contributions.helpful_vote_received >= 10) earned.push('popular_contributor');
  if (contributions.mark_visited >= 20) earned.push('adventurer');
  if (contributions.save_memory >= 10) earned.push('memory_maker');
  return earned;
}

export async function getGamificationProfile(uid?: string): Promise<GamificationProfile | null> {
  if (!db) return null;
  const userId = uid || auth?.currentUser?.uid;
  if (!userId) return null;
  try {
    const ref = doc(db, 'users', userId, 'gamification', 'profile');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as GamificationProfile;
  } catch (err) {
    console.warn('[Gamification] Failed to load profile:', err);
    return null;
  }
}

function getISOWeekAndYear(date: Date): { week: number; year: number } {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const isoYear = d.getFullYear();
  const yearStart = new Date(isoYear, 0, 4);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  return { week, year: isoYear };
}

function getWeekKey(date: Date): string {
  const { week, year } = getISOWeekAndYear(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function computeStreak(lastContributionAt: string | undefined, existingStreak: number): { currentStreakWeeks: number; isNewWeek: boolean } {
  const now = new Date();
  const currentWeek = getWeekKey(now);

  if (!lastContributionAt) {
    return { currentStreakWeeks: 1, isNewWeek: true };
  }

  const lastDate = new Date(lastContributionAt);
  const lastWeek = getWeekKey(lastDate);

  if (currentWeek === lastWeek) {
    return { currentStreakWeeks: existingStreak || 1, isNewWeek: false };
  }

  const lastMonday = new Date(Date.UTC(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()));
  lastMonday.setUTCDate(lastMonday.getUTCDate() - ((lastMonday.getUTCDay() + 6) % 7));

  const thisMonday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  thisMonday.setUTCDate(thisMonday.getUTCDate() - ((thisMonday.getUTCDay() + 6) % 7));

  const diffMs = thisMonday.getTime() - lastMonday.getTime();
  const weeksDiff = Math.round(diffMs / (7 * 86400000));

  if (weeksDiff === 1) {
    return { currentStreakWeeks: (existingStreak || 0) + 1, isNewWeek: true };
  }

  return { currentStreakWeeks: 1, isNewWeek: true };
}

export async function awardPoints(type: ContributionType): Promise<GamificationProfile | null> {
  if (!db) return null;
  const user = auth?.currentUser;
  if (!user) return null;

  try {
    const profileRef = doc(db, 'users', user.uid, 'gamification', 'profile');
    const userRef = doc(db, 'users', user.uid);

    const updated = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(profileRef);
      const existing: GamificationProfile = snap.exists()
        ? (snap.data() as GamificationProfile)
        : { totalPoints: 0, level: 1, contributions: { ...DEFAULT_CONTRIBUTIONS }, badges: [], currentStreakWeeks: 0, bestStreakWeeks: 0 };

      const contributions = { ...DEFAULT_CONTRIBUTIONS, ...existing.contributions };
      contributions[type] = (contributions[type] || 0) + 1;

      const totalPoints = Object.entries(contributions).reduce(
        (sum, [key, count]) => sum + count * POINTS_MAP[key as ContributionType],
        0
      );

      const levelInfo = getLevelForPoints(totalPoints);
      const badges = checkBadges(contributions);

      const nowISO = new Date().toISOString();
      const { currentStreakWeeks } = computeStreak(existing.lastContributionAt, existing.currentStreakWeeks || 0);
      const bestStreakWeeks = Math.max(currentStreakWeeks, existing.bestStreakWeeks || 0);

      const profile: GamificationProfile = {
        totalPoints,
        level: levelInfo.level,
        contributions,
        badges,
        currentStreakWeeks,
        bestStreakWeeks,
        lastContributionAt: nowISO,
        lastUpdated: serverTimestamp(),
      };

      transaction.set(profileRef, profile, { merge: true });

      if (levelInfo.level !== existing.level || badges.length !== existing.badges.length) {
        transaction.set(userRef, { explorerLevel: levelInfo.level, explorerTitle: levelInfo.title }, { merge: true });
      }

      return profile;
    });

    return updated;
  } catch (err) {
    console.warn('[Gamification] Failed to award points:', err);
    return null;
  }
}

const profileCache = new Map<string, { profile: GamificationProfile | null; timestamp: number }>();
const CACHE_TTL = 60_000;

export async function getCachedGamificationProfile(uid?: string): Promise<GamificationProfile | null> {
  const userId = uid || auth?.currentUser?.uid;
  if (!userId) return null;
  const now = Date.now();
  const cached = profileCache.get(userId);
  if (cached && now - cached.timestamp < CACHE_TTL) return cached.profile;
  const profile = await getGamificationProfile(userId);
  profileCache.set(userId, { profile, timestamp: now });
  return profile;
}

export function invalidateGamificationCache(): void {
  profileCache.clear();
}
