import React, { useState } from 'react';
import { FriendCircle, AppState } from '../types';

interface GroupsListProps {
  friendCircles: FriendCircle[];
  onCreateGroup: (name: string) => void;
  onSelectGroup: (group: FriendCircle) => void;
  isGuest: boolean;
}

const GroupsList: React.FC<GroupsListProps> = ({ friendCircles, onCreateGroup, onSelectGroup, isGuest }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreate = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName('');
      setShowCreate(false);
    }
  };

  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Sign in to create groups</h3>
        <p className="text-sm text-slate-500 max-w-xs">
          Create private groups with your partner, family, or friends to share and plan activities together.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-slate-800">Your Groups</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-purple-500 text-white text-sm font-semibold rounded-xl hover:bg-purple-600 transition-colors"
        >
          + New Group
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Create a new group</h3>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="e.g., Our Family, Date Nights, Weekend Crew"
            className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300 mb-3"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newGroupName.trim()}
              className="flex-1 py-2 bg-purple-500 text-white text-sm font-semibold rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Group
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewGroupName(''); }}
              className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {friendCircles.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-2">No groups yet</h3>
          <p className="text-sm text-slate-500 max-w-xs mb-4">
            Create your first group to share places and plan activities with your loved ones.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-2 bg-purple-500 text-white text-sm font-semibold rounded-xl hover:bg-purple-600 transition-colors"
          >
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {friendCircles.map((group) => (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{group.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {group.members.length} member{group.members.length !== 1 ? 's' : ''} • {group.sharedPlaces.length} place{group.sharedPlaces.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupsList;
