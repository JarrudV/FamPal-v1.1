import React, { useState, useEffect } from 'react';
import {
  getCachedGamificationProfile,
  getProgressToNextLevel,
  getLevelForPoints,
  ALL_BADGES,
  EXPLORER_LEVELS,
  POINTS_MAP,
  type GamificationProfile,
  type ContributionType,
} from '../src/services/gamification';

interface ExplorerLevelProps {
  uid?: string;
  compact?: boolean;
}

const CONTRIBUTION_LABELS: Record<ContributionType, string> = {
  community_report: 'Community reports',
  accessibility_report: 'Accessibility reports',
  family_facilities_report: 'Family facility reports',
  mark_visited: 'Places visited',
  save_memory: 'Memories saved',
  add_notes: 'Notes added',
  helpful_vote_received: 'Helpful votes received',
};

const ExplorerLevel: React.FC<ExplorerLevelProps> = ({ uid, compact = false }) => {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCachedGamificationProfile().then(p => {
      if (!cancelled) { setProfile(p); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [uid]);

  if (loading) {
    return (
      <div className="animate-pulse bg-slate-100 rounded-2xl p-4 h-20" />
    );
  }

  const totalPoints = profile?.totalPoints || 0;
  const { current, next, progress } = getProgressToNextLevel(totalPoints);
  const badges = profile?.badges || [];
  const contributions = profile?.contributions || {} as Record<ContributionType, number>;

  if (compact) {
    return (
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 bg-gradient-to-r from-sky-50 to-violet-50 rounded-xl px-3 py-2 w-full text-left"
      >
        <span className="text-xl">{current.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-800">Level {current.level}</span>
            <span className="text-xs text-slate-500">{current.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%`, backgroundColor: current.color }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">{totalPoints} pts</span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-sky-50 via-violet-50 to-amber-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{current.icon}</span>
            <div>
              <h3 className="font-black text-base text-slate-800">FamPals Explorer</h3>
              <p className="text-xs text-slate-500">Level {current.level} · {current.title}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-lg" style={{ color: current.color }}>{totalPoints}</p>
            <p className="text-[10px] text-slate-400 font-semibold">POINTS</p>
          </div>
        </div>

        {next && (
          <div>
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>{current.title}</span>
              <span>{next.title} · {next.minPoints} pts</span>
            </div>
            <div className="h-2.5 bg-white/60 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.max(4, progress * 100)}%`,
                  background: `linear-gradient(90deg, ${current.color}, ${next.color})`,
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 text-right">
              {next.minPoints - totalPoints} pts to next level
            </p>
          </div>
        )}

        {!next && (
          <div className="text-center mt-1">
            <p className="text-xs text-amber-600 font-bold">Max level reached!</p>
          </div>
        )}
      </div>

      {badges.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Badges Earned</p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map(badgeId => {
              const badge = ALL_BADGES.find(b => b.id === badgeId);
              if (!badge) return null;
              return (
                <span
                  key={badgeId}
                  className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full"
                  title={badge.description}
                >
                  {badge.icon} {badge.title}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full px-4 py-2.5 text-xs text-slate-500 font-semibold border-t border-slate-50 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
      >
        {showDetails ? 'Hide' : 'Show'} how to earn points
        <svg className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {showDetails && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Points per Action</p>
            <div className="space-y-1.5">
              {(Object.entries(POINTS_MAP) as [ContributionType, number][]).map(([type, pts]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">{CONTRIBUTION_LABELS[type]}</span>
                  <div className="flex items-center gap-2">
                    {(contributions[type] || 0) > 0 && (
                      <span className="text-[10px] text-slate-400">{contributions[type]}x</span>
                    )}
                    <span className="text-xs font-bold text-sky-600">+{pts}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">All Levels</p>
            <div className="space-y-1">
              {EXPLORER_LEVELS.map(level => (
                <div
                  key={level.level}
                  className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1 ${current.level === level.level ? 'bg-sky-50 font-bold' : 'text-slate-500'}`}
                >
                  <span>{level.icon}</span>
                  <span className="flex-1">L{level.level} · {level.title}</span>
                  <span className="text-[10px]">{level.minPoints} pts</span>
                </div>
              ))}
            </div>
          </div>

          {ALL_BADGES.filter(b => !badges.includes(b.id)).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Badges to Earn</p>
              <div className="space-y-1.5">
                {ALL_BADGES.filter(b => !badges.includes(b.id)).map(badge => (
                  <div key={badge.id} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="opacity-40">{badge.icon}</span>
                    <span className="flex-1">{badge.title}</span>
                    <span className="text-[10px]">{badge.requirement}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export function ExplorerBadgeInline({ level }: { level?: number }) {
  if (!level || level < 1) return null;
  const info = EXPLORER_LEVELS.find(l => l.level === level) || EXPLORER_LEVELS[0];
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: `${info.color}20`, color: info.color }}
      title={`Level ${info.level} · ${info.title}`}
    >
      {info.icon} L{info.level}
    </span>
  );
}

export default ExplorerLevel;
