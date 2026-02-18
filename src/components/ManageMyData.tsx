import React, { useState } from 'react';
import { auth } from '../../lib/firebase';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const DATA_CATEGORIES = [
  { id: 'saved_places', label: 'Saved places / favourites', description: 'All places you have saved or marked as favourite' },
  { id: 'search_history', label: 'Search history', description: 'Your recent searches and browsing history' },
  { id: 'reviews_notes', label: 'Reviews and notes', description: 'Reviews, notes, and comments you have left on places' },
  { id: 'profile_preferences', label: 'Profile preferences (dietary/accessibility)', description: 'Dietary restrictions, allergies, accessibility needs, and activity preferences' },
  { id: 'partner_circles', label: 'Partner links / Circle memberships', description: 'Partner connections and any Friend Circle memberships' },
] as const;

type CategoryId = typeof DATA_CATEGORIES[number]['id'];

interface ManageMyDataProps {
  onBack: () => void;
}

export default function ManageMyData({ onBack }: ManageMyDataProps) {
  const [selected, setSelected] = useState<Set<CategoryId>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const toggle = (id: CategoryId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResult(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setResult(null);
    try {
      const user = auth?.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();

      const res = await fetch(`${API_BASE}/api/user/data-deletion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ categories: Array.from(selected) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }

      setResult({ type: 'success', message: 'Your selected data has been queued for deletion. This may take a few minutes to complete.' });
      setSelected(new Set());
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 safe-area-inset-top">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100">
          <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-bold text-slate-800">Manage My Data</h1>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <h2 className="text-sm font-bold text-slate-800">Data & Privacy</h2>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            You can permanently delete specific categories of your data without deleting your entire account.
            Select the data you would like to remove below. This action cannot be undone.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select data to delete</h3>
          </div>
          {DATA_CATEGORIES.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-colors min-h-[56px] ${
                i < DATA_CATEGORIES.length - 1 ? 'border-b border-slate-50' : ''
              } ${selected.has(cat.id) ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                selected.has(cat.id)
                  ? 'bg-red-500 border-red-500'
                  : 'border-slate-300 bg-white'
              }`}>
                {selected.has(cat.id) && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{cat.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
              </div>
            </button>
          ))}
        </div>

        {result && (
          <div className={`rounded-2xl p-4 text-sm ${
            result.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {result.message}
          </div>
        )}

        <button
          onClick={() => setShowConfirm(true)}
          disabled={selected.size === 0}
          className="w-full py-4 rounded-2xl text-sm font-bold bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all min-h-[52px]"
        >
          Delete Selected Data ({selected.size} {selected.size === 1 ? 'category' : 'categories'})
        </button>

        <p className="text-center text-[10px] text-slate-400">
          This does not delete your account. To delete your entire account, use the Delete Account option in your profile settings.
        </p>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-800">Confirm Data Deletion</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                You are about to permanently delete the following data:
              </p>
              <ul className="space-y-1.5">
                {Array.from(selected).map(id => {
                  const cat = DATA_CATEGORIES.find(c => c.id === id);
                  return cat ? (
                    <li key={id} className="flex items-center gap-2 text-sm text-red-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      {cat.label}
                    </li>
                  ) : null;
                })}
              </ul>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-medium">
                  This action is irreversible. Once deleted, this data cannot be recovered.
                </p>
              </div>
            </div>
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors min-h-[52px]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-4 text-sm font-bold text-red-600 hover:bg-red-50 border-l border-slate-100 transition-colors disabled:opacity-50 min-h-[52px]"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
