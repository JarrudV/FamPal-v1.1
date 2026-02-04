import React, { useEffect, useMemo, useState } from 'react';
import { Place } from '../types';
import {
  CircleDoc,
  CircleMemberDoc,
  CirclePlaceDoc,
  CircleCommentDoc,
  CircleMemoryDoc,
  listenToCircleMembers,
  listenToCirclePlaces,
  listenToCircleComments,
  listenToCircleMemories,
  saveCirclePlace,
  removeCirclePlace,
  addCircleComment,
} from '../lib/circles';

interface GroupDetailProps {
  circle: CircleDoc;
  userId: string;
  userName: string;
  userEmail?: string | null;
  userFavorites: string[];
  allPlaces: Place[];
  onClose: () => void;
  onOpenPlace: (place: Place) => void;
}

const GroupDetail: React.FC<GroupDetailProps> = ({
  circle,
  userId,
  userName,
  userEmail,
  userFavorites,
  allPlaces,
  onClose,
  onOpenPlace,
}) => {
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [members, setMembers] = useState<CircleMemberDoc[]>([]);
  const [places, setPlaces] = useState<CirclePlaceDoc[]>([]);
  const [memories, setMemories] = useState<CircleMemoryDoc[]>([]);
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);
  const [comments, setComments] = useState<CircleCommentDoc[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteLink = `${window.location.origin}/join/${circle.joinCode}`;
  const isOwner = circle.createdBy === userId;

  const availablePlaces = useMemo(() => {
    const sharedIds = new Set(places.map(p => p.placeId));
    return allPlaces.filter(p => userFavorites.includes(p.id) && !sharedIds.has(p.id));
  }, [allPlaces, userFavorites, places]);

  useEffect(() => {
    const unsubMembers = listenToCircleMembers(circle.id, setMembers);
    const unsubPlaces = listenToCirclePlaces(circle.id, setPlaces);
    const unsubMemories = listenToCircleMemories(circle.id, setMemories);
    return () => {
      unsubMembers();
      unsubPlaces();
      unsubMemories();
    };
  }, [circle.id]);

  useEffect(() => {
    if (!expandedPlaceId) {
      setComments([]);
      return;
    }
    const unsub = listenToCircleComments(circle.id, expandedPlaceId, setComments);
    return () => unsub();
  }, [circle.id, expandedPlaceId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddPlace = async (place: Place) => {
    const note = window.prompt('Why are we saving this?') || '';
    await saveCirclePlace(circle.id, {
      placeId: place.id,
      savedByUid: userId,
      savedByName: userName || userEmail || 'Member',
      savedAt: new Date().toISOString(),
      note: note.trim(),
      placeSummary: {
        placeId: place.id,
        name: place.name,
        imageUrl: place.imageUrl,
        type: place.type,
        mapsUrl: place.mapsUrl,
      },
    });
    setShowAddPlace(false);
  };

  const handleRemovePlace = async (placeId: string) => {
    await removeCirclePlace(circle.id, placeId);
  };

  const handleAddComment = async () => {
    if (!expandedPlaceId || !commentInput.trim()) return;
    await addCircleComment(circle.id, expandedPlaceId, {
      uid: userId,
      text: commentInput.trim(),
      createdAt: new Date().toISOString(),
      displayName: userName || userEmail || 'Member',
    });
    setCommentInput('');
  };

  const resolvePlace = (placeDoc: CirclePlaceDoc): Place => {
    const found = allPlaces.find(p => p.id === placeDoc.placeId);
    if (found) return found;
    return {
      id: placeDoc.placeId,
      name: placeDoc.placeSummary.name,
      description: 'Family-friendly place',
      address: '',
      rating: undefined,
      tags: [],
      imageUrl: placeDoc.placeSummary.imageUrl,
      mapsUrl: placeDoc.placeSummary.mapsUrl || `https://www.google.com/maps/place/?q=place_id:${placeDoc.placeId}`,
      type: (placeDoc.placeSummary.type as any) || 'all',
    };
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
          <h1 className="text-lg font-bold text-slate-800">{circle.name}</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Members ({members.length})</h2>
            <button
              onClick={handleCopyLink}
              className="text-sm text-purple-600 font-medium hover:text-purple-700"
            >
              {copiedLink ? 'Copied!' : 'Copy invite code'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3">Join code: {circle.joinCode}</p>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.uid} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-purple-600">
                      {(member.displayName || member.email || '?').charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{member.displayName || member.email || 'Member'}</p>
                    <p className="text-xs text-slate-400">{member.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Circle Places ({places.length})</h2>
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
                      onClick={() => handleAddPlace(place)}
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

          {places.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500">No places shared yet.</p>
              <p className="text-xs text-slate-400 mt-1">Save some places first, then add them here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {places.map((sp) => {
                const place = resolvePlace(sp);
                return (
                  <div key={sp.placeId} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onOpenPlace(place)}
                        className="text-left"
                      >
                        <p className="text-sm font-medium text-slate-700">{sp.placeSummary.name}</p>
                        <p className="text-xs text-slate-400">Added by {sp.savedByName}</p>
                      </button>
                      {(sp.savedByUid === userId || isOwner) && (
                        <button
                          onClick={() => handleRemovePlace(sp.placeId)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {sp.note && (
                      <p className="text-xs text-slate-500 mt-2">{sp.note}</p>
                    )}
                    <div className="mt-3">
                      <button
                        onClick={() => setExpandedPlaceId(expandedPlaceId === sp.placeId ? null : sp.placeId)}
                        className="text-xs text-purple-600 font-semibold"
                      >
                        {expandedPlaceId === sp.placeId ? 'Hide comments' : 'Comments'}
                      </button>
                      {expandedPlaceId === sp.placeId && (
                        <div className="mt-2 space-y-2">
                          {comments.length === 0 ? (
                            <p className="text-xs text-slate-400">No comments yet.</p>
                          ) : (
                            comments.map(comment => (
                              <div key={comment.id} className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                                <p className="text-xs text-slate-700">{comment.text}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{comment.displayName}</p>
                              </div>
                            ))
                          )}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={commentInput}
                              onChange={(e) => setCommentInput(e.target.value)}
                              placeholder="Add a quick note"
                              className="flex-1 px-3 py-2 bg-white rounded-lg text-xs placeholder-slate-400 border border-slate-200"
                            />
                            <button
                              onClick={handleAddComment}
                              disabled={!commentInput.trim()}
                              className="px-3 py-2 bg-purple-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">Circle Memories ({memories.length})</h2>
          {memories.length === 0 ? (
            <p className="text-sm text-slate-500">No memories tagged yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {memories.map((memory) => {
                const photos = memory.memorySnapshot.photoThumbUrls || memory.memorySnapshot.photoUrls || (memory.memorySnapshot.photoThumbUrl ? [memory.memorySnapshot.photoThumbUrl] : (memory.memorySnapshot.photoUrl ? [memory.memorySnapshot.photoUrl] : []));
                const mainPhoto = photos[0];
                return (
                  <div key={memory.id} className="bg-slate-50 rounded-xl overflow-hidden">
                    {mainPhoto ? (
                      <img src={mainPhoto} className="w-full h-32 object-cover" alt="" />
                    ) : (
                      <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">Text Memory</div>
                    )}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-slate-700 line-clamp-2">{memory.memorySnapshot.caption}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{memory.createdByName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;
