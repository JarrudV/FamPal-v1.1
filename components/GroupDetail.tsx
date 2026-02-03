import React, { useState } from 'react';
import { FriendCircle, GroupPlace, Place, AppState } from '../types';

interface GroupDetailProps {
  group: FriendCircle;
  userId: string;
  userFavorites: string[];
  allPlaces: Place[];
  onClose: () => void;
  onAddPlace: (placeId: string, placeName: string) => void;
  onRemovePlace: (placeId: string) => void;
  onInviteMember: (email: string) => void;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
}

const GroupDetail: React.FC<GroupDetailProps> = ({
  group,
  userId,
  userFavorites,
  allPlaces,
  onClose,
  onAddPlace,
  onRemovePlace,
  onInviteMember,
  onLeaveGroup,
  onDeleteGroup,
}) => {
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const isOwner = group.ownerId === userId;
  const inviteLink = `${window.location.origin}/join/${group.inviteCode}`;

  const availablePlaces = allPlaces.filter(
    p => userFavorites.includes(p.id) && !group.sharedPlaces.some(sp => sp.placeId === p.id)
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      onInviteMember(inviteEmail.trim());
      setInviteEmail('');
      setShowInvite(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-slate-800">{group.name}</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Members ({group.members.length})</h2>
            <button
              onClick={() => setShowInvite(true)}
              className="text-sm text-purple-600 font-medium hover:text-purple-700"
            >
              + Invite
            </button>
          </div>
          
          {showInvite && (
            <div className="bg-purple-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-600 mb-2">Share this link to invite members:</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white rounded-lg text-xs text-slate-600 border border-purple-200"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    copiedLink ? 'bg-green-500 text-white' : 'bg-purple-500 text-white hover:bg-purple-600'
                  }`}
                >
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="border-t border-purple-200 pt-3">
                <p className="text-xs text-slate-600 mb-2">Or invite by email:</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@email.com"
                    className="flex-1 px-3 py-2 bg-white rounded-lg text-sm placeholder-slate-400 border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim()}
                    className="px-4 py-2 bg-purple-500 text-white text-sm font-semibold rounded-lg hover:bg-purple-600 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowInvite(false)}
                className="mt-3 text-xs text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
          )}

          <div className="space-y-2">
            {group.members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-purple-600">
                      {member.displayName?.charAt(0) || member.email?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{member.displayName || member.email}</p>
                    <p className="text-xs text-slate-400">{member.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Shared Places ({group.sharedPlaces.length})</h2>
            {userFavorites.length > 0 && (
              <button
                onClick={() => setShowAddPlace(true)}
                className="text-sm text-purple-600 font-medium hover:text-purple-700"
              >
                + Add Place
              </button>
            )}
          </div>

          {showAddPlace && (
            <div className="bg-purple-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-600 mb-3">Add from your saved places:</p>
              {availablePlaces.length === 0 ? (
                <p className="text-sm text-slate-500">All your saved places are already shared here.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availablePlaces.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => { onAddPlace(place.id, place.name); setShowAddPlace(false); }}
                      className="w-full flex items-center justify-between p-3 bg-white rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm text-slate-700">{place.name}</span>
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowAddPlace(false)}
                className="mt-3 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          )}

          {group.sharedPlaces.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500">No places shared yet.</p>
              <p className="text-xs text-slate-400 mt-1">Save some places first, then add them here!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {group.sharedPlaces.map((sp) => (
                <div key={sp.placeId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{sp.placeName}</p>
                    <p className="text-xs text-slate-400">Added by {sp.addedByName}</p>
                  </div>
                  {(sp.addedBy === userId || isOwner) && (
                    <button
                      onClick={() => onRemovePlace(sp.placeId)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200">
          {isOwner ? (
            <button
              onClick={onDeleteGroup}
              className="w-full py-3 text-red-500 text-sm font-medium hover:bg-red-50 rounded-xl transition-colors"
            >
              Delete Group
            </button>
          ) : (
            <button
              onClick={onLeaveGroup}
              className="w-full py-3 text-slate-500 text-sm font-medium hover:bg-slate-100 rounded-xl transition-colors"
            >
              Leave Group
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;
