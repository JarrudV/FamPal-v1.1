import React, { useState, useEffect, useMemo } from 'react';
import { VisitedPlace, Memory, SavedPlace } from '../types';
import ExplorerLevel from './ExplorerLevel';
import {
  getCachedGamificationProfile,
  POINTS_MAP,
  ALL_BADGES,
  type GamificationProfile,
  type ContributionType,
} from '../src/services/gamification';

interface ActivityDashboardProps {
  isGuest: boolean;
  visitedPlaces: VisitedPlace[];
  memories: Memory[];
  savedPlaces: SavedPlace[];
  userId?: string;
  onOpenPlace: (visit: VisitedPlace) => void;
  onGoToExplore?: () => void;
}

const CONTRIBUTION_LABELS: Record<ContributionType, { label: string; icon: string; verb: string }> = {
  community_report: { label: 'Community Reports', icon: '📝', verb: 'reviews shared' },
  accessibility_report: { label: 'Accessibility Reports', icon: '♿', verb: 'accessibility insights' },
  family_facilities_report: { label: 'Facility Reports', icon: '👶', verb: 'facility reports' },
  mark_visited: { label: 'Places Visited', icon: '📍', verb: 'places explored' },
  save_memory: { label: 'Memories Saved', icon: '📸', verb: 'memories captured' },
  add_notes: { label: 'Notes Added', icon: '✏️', verb: 'notes left' },
  helpful_vote_received: { label: 'Helpful Votes', icon: '👍', verb: 'times you helped others' },
};

const NUDGE_DISMISS_KEY = 'fampals_nudge_dismissed_at';
const NUDGE_COOLDOWN_DAYS = 7;
const INACTIVE_THRESHOLD_DAYS = 30;

function shouldShowNudge(lastContributionAt?: string): boolean {
  if (!lastContributionAt) return true;
  const lastContrib = new Date(lastContributionAt).getTime();
  const daysSinceContrib = (Date.now() - lastContrib) / (1000 * 60 * 60 * 24);
  if (daysSinceContrib < INACTIVE_THRESHOLD_DAYS) return false;
  try {
    const dismissed = localStorage.getItem(NUDGE_DISMISS_KEY);
    if (dismissed) {
      const daysSinceDismiss = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < NUDGE_COOLDOWN_DAYS) return false;
    }
  } catch {}
  return true;
}

function getDaysSinceContribution(lastContributionAt?: string): number | null {
  if (!lastContributionAt) return null;
  return Math.floor((Date.now() - new Date(lastContributionAt).getTime()) / (1000 * 60 * 60 * 24));
}

const ActivityDashboard: React.FC<ActivityDashboardProps> = ({
  isGuest,
  visitedPlaces,
  memories,
  savedPlaces,
  userId,
  onOpenPlace,
  onGoToExplore,
}) => {
  const [gamProfile, setGamProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'visited' | 'points'>('overview');
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  useEffect(() => {
    if (isGuest) { setLoading(false); return; }
    let cancelled = false;
    getCachedGamificationProfile(userId).then(p => {
      if (!cancelled) { setGamProfile(p); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, isGuest]);

  const contributions = gamProfile?.contributions || {} as Record<ContributionType, number>;
  const totalReports = (contributions.community_report || 0)
    + (contributions.accessibility_report || 0)
    + (contributions.family_facilities_report || 0);
  const totalContributions = (Object.values(contributions) as number[]).reduce((a, b) => a + b, 0);
  const badges = gamProfile?.badges || [];
  const currentStreak = gamProfile?.currentStreakWeeks || 0;
  const bestStreak = gamProfile?.bestStreakWeeks || 0;
  const daysSince = getDaysSinceContribution(gamProfile?.lastContributionAt);
  const showNudge = !nudgeDismissed && shouldShowNudge(gamProfile?.lastContributionAt);

  const handleDismissNudge = () => {
    setNudgeDismissed(true);
    try { localStorage.setItem(NUDGE_DISMISS_KEY, String(Date.now())); } catch {}
  };

  const recentActivity = useMemo(() => {
    const items: { type: string; label: string; date: Date; icon: string; detail?: string }[] = [];
    visitedPlaces.forEach(v => {
      items.push({ type: 'visited', label: v.placeName, date: new Date(v.visitedAt), icon: '📍', detail: v.notes || undefined });
    });
    memories.forEach(m => {
      if (m.date) {
        items.push({ type: 'memory', label: m.placeName || 'Memory', date: new Date(m.date), icon: '📸', detail: m.caption || undefined });
      }
    });
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items.slice(0, 10);
  }, [visitedPlaces, memories]);

  if (isGuest) {
    return (
      <div className="space-y-4 mt-4">
        <div className="bg-gradient-to-br from-sky-50 via-violet-50 to-amber-50 rounded-3xl p-6 text-center border border-sky-100">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 mx-auto shadow-sm">
            <span className="text-4xl">🌟</span>
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Join the Explorer Community</h3>
          <p className="text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">
            Sign in to track your family adventures, earn explorer points, and help other parents discover the best local spots.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <div className="text-center">
              <p className="text-lg font-black text-sky-600">📍</p>
              <p className="text-[10px] font-semibold text-slate-500">Track Visits</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-sky-600">🔥</p>
              <p className="text-[10px] font-semibold text-slate-500">Build Streaks</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-sky-600">🏅</p>
              <p className="text-[10px] font-semibold text-slate-500">Earn Badges</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 mt-4">
        <div className="animate-pulse bg-slate-100 rounded-3xl h-32" />
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map(i => <div key={i} className="animate-pulse bg-slate-100 rounded-2xl h-20" />)}
        </div>
        <div className="animate-pulse bg-slate-100 rounded-2xl h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {showNudge && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200 relative">
          <button onClick={handleDismissNudge} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
          <div className="flex items-start gap-3 pr-6">
            <span className="text-2xl mt-0.5">👋</span>
            <div>
              <h4 className="text-sm font-bold text-amber-800">Been on any adventures lately?</h4>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                {daysSince !== null && daysSince > 0
                  ? `It's been ${daysSince} days since your last contribution. `
                  : ''}
                Your family knows great spots — share them so other parents can discover them too!
              </p>
              {onGoToExplore && (
                <button
                  onClick={onGoToExplore}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-full active:scale-95 transition-all"
                >
                  Find & Review a Place
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ExplorerLevel uid={userId} />

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-3 border border-orange-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🔥</span>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Streak</span>
          </div>
          <p className="text-2xl font-black text-amber-800">{currentStreak} <span className="text-sm font-bold">week{currentStreak !== 1 ? 's' : ''}</span></p>
          {bestStreak > currentStreak && (
            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Best: {bestStreak} weeks</p>
          )}
          {currentStreak === 0 && (
            <p className="text-[10px] text-amber-600 mt-0.5">Contribute this week to start!</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard value={visitedPlaces.length} label="Visited" icon="📍" color="bg-sky-50 text-sky-700" />
          <StatCard value={totalReports} label="Reports" icon="📝" color="bg-violet-50 text-violet-700" />
          <StatCard value={memories.length} label="Memories" icon="📸" color="bg-emerald-50 text-emerald-700" />
          <StatCard value={badges.length} label="Badges" icon="🏅" color="bg-amber-50 text-amber-700" />
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {[
          { key: 'overview' as const, label: 'Overview' },
          { key: 'visited' as const, label: `Visited (${visitedPlaces.length})` },
          { key: 'points' as const, label: 'How Points Work' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all min-h-[40px] ${
              activeSection === s.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <div className="space-y-3">
          {totalContributions > 0 && (
            <div className="bg-gradient-to-r from-sky-50 to-emerald-50 rounded-2xl p-4 border border-sky-100">
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="font-black text-sky-700">{totalContributions} contributions</span> and counting!
                You've helped families discover {contributions.mark_visited || 0} places, shared {contributions.community_report || 0} reviews,
                and captured {contributions.save_memory || 0} memories. Keep it up — every contribution makes FamPals better for everyone.
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Your Impact</h4>
            <div className="space-y-2.5">
              {(Object.entries(CONTRIBUTION_LABELS) as [ContributionType, { label: string; icon: string; verb: string }][]).map(([type, meta]) => {
                const count = contributions[type] || 0;
                const pts = POINTS_MAP[type];
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">{meta.icon}</span>
                      <span className="text-sm text-slate-700">{count > 0 ? `${count} ${meta.verb}` : meta.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {count > 0 && <span className="text-xs font-black text-sky-600">{count * pts} pts</span>}
                      {count === 0 && <span className="text-[10px] text-slate-400">+{pts} pts each</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalContributions > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Impact Score</span>
                <span className="text-sm font-black text-sky-600">{gamProfile?.totalPoints || 0} pts</span>
              </div>
            )}
          </div>

          {badges.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Badges Earned</h4>
              <div className="flex flex-wrap gap-2">
                {badges.map(badgeId => {
                  const badge = ALL_BADGES.find(b => b.id === badgeId);
                  if (!badge) return null;
                  return (
                    <div key={badgeId} className="flex items-center gap-1.5 bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                      <span>{badge.icon}</span>
                      <span>{badge.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {ALL_BADGES.filter(b => !(badges as string[]).includes(b.id)).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Next Badges to Unlock</h4>
              <div className="space-y-2">
                {ALL_BADGES.filter(b => !badges.includes(b.id)).map(badge => (
                  <div key={badge.id} className="flex items-center gap-2 text-sm">
                    <span className="opacity-30 text-base">{badge.icon}</span>
                    <div className="flex-1">
                      <span className="text-slate-600">{badge.title}</span>
                      <span className="text-slate-400 text-xs ml-2">({badge.requirement})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentActivity.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Activity</h4>
              <div className="space-y-3">
                {recentActivity.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-sm">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.label}</p>
                      {item.detail && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.detail}</p>}
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentActivity.length === 0 && totalContributions === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
              <div className="w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🌟</span>
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">Your Explorer Journey Starts Here</h4>
              <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                Every family outing is a chance to help others. Visit a place, share your experience,
                and watch your impact grow. Your first contribution earns you 5+ points!
              </p>
              {onGoToExplore && (
                <button
                  onClick={onGoToExplore}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 rounded-full shadow-lg shadow-sky-200 active:scale-95 transition-all"
                >
                  Explore Places Nearby
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeSection === 'visited' && (
        <div className="space-y-3">
          {visitedPlaces.length > 0 ? (
            visitedPlaces
              .slice()
              .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
              .map(visit => (
                <div key={visit.placeId} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <button
                    onClick={() => onOpenPlace(visit)}
                    className="w-full flex gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      {visit.imageUrl ? (
                        <img src={visit.imageUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-slate-800 truncate">{visit.placeName}</h3>
                        {visit.isFavorite && (
                          <svg className="w-4 h-4 text-pink-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(visit.visitedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {visit.notes && (
                        <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{visit.notes}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-slate-300 self-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              ))
          ) : (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-100">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mb-3 mx-auto">
                <span className="text-2xl">📍</span>
              </div>
              <h4 className="text-base font-semibold text-slate-700 mb-1">No places visited yet</h4>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Open any place and tap "Mark as visited" to start building your adventure map.
              </p>
              {onGoToExplore && (
                <button
                  onClick={onGoToExplore}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sky-600 active:text-sky-800"
                >
                  Browse places nearby
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeSection === 'points' && (
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-sky-50 to-violet-50 rounded-2xl p-5 border border-sky-100">
            <h4 className="text-base font-bold text-slate-800 mb-2">FamPals Explorer Program</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every contribution makes FamPals better for families everywhere. Share your experiences,
              report on facilities, and help other parents make informed decisions. The more you contribute,
              the higher you climb!
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">How to Earn Points</h4>
            <div className="space-y-3">
              {(Object.entries(CONTRIBUTION_LABELS) as [ContributionType, { label: string; icon: string; verb: string }][]).map(([type, meta]) => (
                <div key={type} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0 text-base">
                    {meta.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{meta.label}</span>
                      <span className="text-sm font-black text-sky-600">+{POINTS_MAP[type]}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{getPointDescription(type)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔥</span>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Streaks</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Contribute at least once per week to build your streak. Whether it's marking a place as visited,
              leaving a review, or reporting facilities — any contribution counts toward your weekly streak.
            </p>
            <div className="flex gap-3">
              <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-amber-800">{currentStreak}</p>
                <p className="text-[10px] font-semibold text-amber-600">Current</p>
              </div>
              <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-amber-800">{bestStreak}</p>
                <p className="text-[10px] font-semibold text-amber-600">Best Ever</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">All Badges</h4>
            <div className="space-y-2.5">
              {ALL_BADGES.map(badge => {
                const earned = badges.includes(badge.id);
                return (
                  <div key={badge.id} className={`flex items-center gap-3 p-2 rounded-xl ${earned ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <span className={`text-lg ${earned ? '' : 'opacity-30'}`}>{badge.icon}</span>
                    <div className="flex-1">
                      <span className={`text-sm font-semibold ${earned ? 'text-amber-800' : 'text-slate-500'}`}>{badge.title}</span>
                      <p className="text-xs text-slate-400">{badge.requirement}</p>
                    </div>
                    {earned && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Earned</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function StatCard({ value, label, icon, color }: { value: number; label: string; icon: string; color: string }) {
  return (
    <div className={`rounded-2xl p-2.5 text-center ${color}`}>
      <span className="text-sm">{icon}</span>
      <p className="text-lg font-black">{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
    </div>
  );
}

function getPointDescription(type: ContributionType): string {
  switch (type) {
    case 'community_report': return 'Share your family\'s experience to help others decide';
    case 'accessibility_report': return 'Report wheelchair access, step-free entry & more';
    case 'family_facilities_report': return 'Kids\' menu? Play area? Let families know';
    case 'mark_visited': return 'Been there! Mark your family adventures';
    case 'save_memory': return 'Capture the moment with a photo memory';
    case 'add_notes': return 'Leave tips and notes for other families';
    case 'helpful_vote_received': return 'Earned when other parents find your info useful';
  }
}

export default ActivityDashboard;
