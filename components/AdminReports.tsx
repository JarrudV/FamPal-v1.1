import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, doc, updateDoc, query, orderBy, limit as firestoreLimit } from '../lib/firebase';
import type { CommunityReportDoc } from '../src/services/communityReports';

const ADMIN_UIDS = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').filter(Boolean);

interface AdminReportsProps {
  userId: string;
  onBack: () => void;
}

const AdminReports: React.FC<AdminReportsProps> = ({ userId, onBack }) => {
  const [reports, setReports] = useState<(CommunityReportDoc & { _placeId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'unverified' | 'all'>('unverified');
  const [verifying, setVerifying] = useState<string | null>(null);

  const isAdmin = ADMIN_UIDS.includes(userId);

  useEffect(() => {
    if (!isAdmin || !db) return;
    loadReports();
  }, [isAdmin, filter]);

  const loadReports = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const placesSnap = await getDocs(query(collection(db, 'places'), firestoreLimit(200)));
      const allReports: (CommunityReportDoc & { _placeId: string })[] = [];

      await Promise.all(
        placesSnap.docs.map(async (placeDoc) => {
          const reportsSnap = await getDocs(
            query(collection(db, 'places', placeDoc.id, 'reports'), orderBy('createdAt', 'desc'), firestoreLimit(50))
          );
          reportsSnap.docs.forEach((reportDoc) => {
            const data = reportDoc.data() as Omit<CommunityReportDoc, 'id'>;
            if (filter === 'unverified' && data.moderatorVerified) return;
            allReports.push({
              id: reportDoc.id,
              ...data,
              _placeId: placeDoc.id,
            });
          });
        })
      );

      allReports.sort((a, b) => {
        const aMs = (a.createdAt as any)?.toMillis?.() || 0;
        const bMs = (b.createdAt as any)?.toMillis?.() || 0;
        return bMs - aMs;
      });

      setReports(allReports);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (placeId: string, reportId: string) => {
    if (!db) return;
    setVerifying(reportId);
    try {
      await updateDoc(doc(db, 'places', placeId, 'reports', reportId), {
        moderatorVerified: true,
      });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, moderatorVerified: true } : r))
      );
    } catch (err) {
      console.error('Failed to verify report:', err);
      alert('Failed to verify. Check permissions.');
    } finally {
      setVerifying(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-700">Access Denied</p>
          <p className="text-sm text-slate-500 mt-2">You don't have admin permissions.</p>
          <button onClick={onBack} className="mt-4 px-6 py-3 bg-slate-200 rounded-xl font-bold text-sm text-slate-700">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const formatSignals = (record: Partial<Record<string, boolean>> | undefined) => {
    if (!record) return [];
    return Object.entries(record).filter(([, v]) => typeof v === 'boolean').map(([k, v]) => ({ key: k, value: v as boolean }));
  };

  return (
    <div className="min-h-screen bg-slate-50 safe-area-inset-top">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100">
          <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-bold text-slate-800">Community Reports</h1>
        <span className="text-xs font-semibold bg-violet-100 text-violet-600 px-2 py-1 rounded-full ml-auto">
          {reports.length} reports
        </span>
      </div>

      <div className="px-4 py-3 flex gap-2">
        <button
          onClick={() => setFilter('unverified')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold min-h-[44px] ${filter === 'unverified' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          Pending Review
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold min-h-[44px] ${filter === 'all' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          All Reports
        </button>
        <button
          onClick={loadReports}
          className="ml-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 min-h-[44px]"
        >
          Refresh
        </button>
      </div>

      <div className="px-4 pb-24 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            {filter === 'unverified' ? 'No pending reports to review.' : 'No reports found.'}
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Place: <span className="text-slate-700">{report.placeId || report._placeId}</span></p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    By: {report.userDisplayName || 'Anonymous'} &middot; {(report.createdAt as any)?.toDate?.()?.toLocaleDateString?.() || 'Unknown date'}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${report.moderatorVerified ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                  {report.moderatorVerified ? 'Verified' : 'Pending'}
                </span>
              </div>

              {formatSignals(report.kidPrefs).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Family Facilities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {formatSignals(report.kidPrefs).map(({ key, value }) => (
                      <span key={key} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold min-h-[32px] flex items-center ${value ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {value ? '+' : '-'} {key.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formatSignals(report.accessibility).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Accessibility</p>
                  <div className="flex flex-wrap gap-1.5">
                    {formatSignals(report.accessibility).map(({ key, value }) => (
                      <span key={key} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold min-h-[32px] flex items-center ${value ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {value ? '+' : '-'} {key.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {report.notes && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">{report.notes}</p>
                </div>
              )}

              {!report.moderatorVerified && (
                <button
                  onClick={() => handleVerify(report._placeId, report.id)}
                  disabled={verifying === report.id}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-green-600 text-white active:scale-95 transition-all disabled:opacity-50 min-h-[44px]"
                >
                  {verifying === report.id ? 'Verifying...' : 'Mark as Verified'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminReports;
