
import React, { useState, useEffect } from 'react';
import { Place, FavoriteData, ACTIVITY_OPTIONS, Memory, Entitlement, PartnerLink, GroupPlace } from '../types';
import { askAboutPlace, generateFamilySummary } from '../geminiService';
import { getPlaceDetails, PlaceDetails, PlaceReview } from '../placesService';
import { canUseAI } from '../lib/entitlements';
import MemoryCreate from './MemoryCreate';
import { CircleDoc } from '../lib/circles';

function getNavigationUrls(place: Place, placeDetails?: PlaceDetails | null) {
  const lat = (place as any).lat || placeDetails?.lat;
  const lng = (place as any).lng || placeDetails?.lng;

  if (lat && lng) {
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      apple: `https://maps.apple.com/?daddr=${lat},${lng}`,
      waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    };
  }

  const address = encodeURIComponent(place.address || place.name);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${address}`,
    apple: `https://maps.apple.com/?daddr=${address}`,
    waze: `https://waze.com/ul?q=${address}&navigate=yes`,
  };
}

interface CombinedPreferences {
  allergies: string[];
  accessibility: string[];
  foodPreferences: string[];
  activityPreferences: string[];
  includesPartner: boolean;
  includesChildren: boolean;
}

interface VenueProfileProps {
  place: Place;
  isFavorite: boolean;
  isVisited: boolean;
  memories?: Memory[];
  memoryCount?: number;
  favoriteData?: FavoriteData;
  childrenAges?: number[];
  isGuest?: boolean;
  entitlement?: Entitlement;
  familyPool?: { ai_requests_this_month?: number; ai_requests_reset_date?: string };
  circles?: CircleDoc[];
  partnerLink?: PartnerLink;
  userName?: string;
  userId?: string;
  tripContext?: CombinedPreferences;
  onClose: () => void;
  onToggleFavorite: () => void;
  onMarkVisited: () => void;
  onUpdateDetails: (data: Partial<FavoriteData>) => void;
  onIncrementAiRequests?: () => void;
  onAddToCircle?: (circleId: string, place: GroupPlace) => void;
  onAddMemory?: (memory: Omit<Memory, 'id'>) => void;
  onTagMemoryToCircle?: (circleId: string, memory: Omit<Memory, 'id'>) => void;
}

const VenueProfile: React.FC<VenueProfileProps> = ({ 
  place, 
  isFavorite, 
  isVisited,
  memories = [],
  memoryCount = 0,
  favoriteData, 
  childrenAges = [],
  isGuest = false,
  entitlement,
  familyPool,
  circles = [],
  partnerLink,
  userName = 'You',
  userId = '',
  tripContext,
  onClose, 
  onToggleFavorite,
  onMarkVisited,
  onUpdateDetails,
  onIncrementAiRequests,
  onAddToCircle,
  onAddMemory,
  onTagMemoryToCircle
}) => {
  const aiInfo = canUseAI(entitlement, familyPool);
  const venueMemories = memories.filter(m => m.placeId === place.id);
  const [activeTab, setActiveTab] = useState<'info' | 'parent'>('info');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [lastAiQuestion, setLastAiQuestion] = useState('');
  const [aiCached, setAiCached] = useState(false);
  const [showNavModal, setShowNavModal] = useState(false);
  
  // Swipe gesture handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 100;
  
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchEnd - touchStart;
    const isRightSwipe = distance > minSwipeDistance;
    if (isRightSwipe) {
      onClose();
    }
  };
  
  // Fetch place details from Google Places for reviews and extra info
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  useEffect(() => {
    if (place.id) {
      setLoadingDetails(true);
      getPlaceDetails(place.id)
        .then(details => setPlaceDetails(details))
        .finally(() => setLoadingDetails(false));
    }
  }, [place]);

  const quickQuestions = [
    "Is this good for toddlers?",
    "What should we bring?",
    "Is it stroller friendly?",
    "Best time to visit?"
  ];

  const aiLimitReached = !aiInfo.allowed;
  
  const handleAskAI = async (question: string, forceRefresh: boolean = false) => {
    if (!question.trim()) return;
    if (isGuest) return;
    if (aiLimitReached) return;
    
    setAiLoading(true);
    setAiAnswer('');
    setAiCached(false);
    setLastAiQuestion(question);
    try {
      const answer = await askAboutPlace(place, question, { 
        childrenAges,
        tripContext: tripContext ? {
          allergies: tripContext.allergies,
          accessibility: tripContext.accessibility,
          foodPreferences: tripContext.foodPreferences,
          activityPreferences: tripContext.activityPreferences,
          includesPartner: tripContext.includesPartner,
          includesChildren: tripContext.includesChildren,
        } : undefined
      }, {
        userId,
        featureName: 'place_ai_qna',
        forceRefresh,
        onUsage: ({ cached }) => {
          setAiCached(cached);
          if (!cached && onIncrementAiRequests) {
            onIncrementAiRequests();
          }
        },
      });
      setAiAnswer(answer);
    } catch (error: any) {
      setAiAnswer(error.message || 'Failed to get response. Please try again.');
    }
    setAiLoading(false);
  };
  
  const [summarySaved, setSummarySaved] = useState(false);
  
  const handleSaveSummary = () => {
    if (!aiAnswer) return;
    const currentNotes = favoriteData?.notes || '';
    const timestamp = new Date().toLocaleDateString();
    const newNote = `\n\n--- AI Summary (${timestamp}) ---\n${aiAnswer}`;
    const updatedNotes = currentNotes + newNote;
    onUpdateDetails({ notes: updatedNotes.trim() });
    setSummarySaved(true);
    setTimeout(() => setSummarySaved(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-30 bg-[#F8FAFC] overflow-y-auto overflow-x-hidden animate-slide-up container-safe"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative h-56 sm:h-64">
        <img src={place.imageUrl} className="w-full h-full object-cover" alt={place.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-black/20"></div>
        <button onClick={onClose} className="absolute top-4 left-4 w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl text-white flex items-center justify-center border border-white/20 safe-area-top">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={onToggleFavorite} className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/20 safe-area-top">
          <span className="text-lg">{isFavorite ? '💙' : '🤍'}</span>
        </button>
        <div className="absolute bottom-6 left-5 right-5">
           <div className="flex gap-1.5 mb-2 flex-wrap">
             {place.tags.slice(0, 3).map(t => <span key={t} className="px-2 py-0.5 bg-white/80 backdrop-blur rounded-lg text-[8px] font-bold text-sky-900 uppercase tracking-wide">{t}</span>)}
           </div>
           <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight leading-tight break-words drop-shadow-[0_2px_4px_rgba(255,255,255,0.9)]" style={{ textShadow: '0 1px 3px rgba(255,255,255,0.9), 0 2px 8px rgba(255,255,255,0.7)' }}>{place.name}</h1>
           <p className="text-xs font-bold text-slate-600 mt-1 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.9), 0 1px 4px rgba(255,255,255,0.7)' }}>{place.address}</p>
        </div>
      </div>

      <div className="flex px-5 gap-4">
        <TabBtn active={activeTab === 'info'} onClick={() => setActiveTab('info')} label="Information" />
        <TabBtn active={activeTab === 'parent'} onClick={() => setActiveTab('parent')} label="Notebook" />
      </div>

      {/* Status bar - Save/Visited toggle */}
      {!isGuest && (
        <div className="px-5 pt-4">
          <div className="flex gap-3">
            <button 
              onClick={onToggleFavorite}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm shadow-sm transition-all ${
                isFavorite 
                  ? 'bg-sky-500 text-white shadow-sky-200' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{isFavorite ? '💙' : '🤍'}</span>
              <span>{isFavorite ? 'Saved' : 'Save Place'}</span>
            </button>
            <button 
              onClick={onMarkVisited}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm shadow-sm transition-all ${
                isVisited 
                  ? 'bg-green-500 text-white shadow-green-200' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{isVisited ? '✅' : '📍'}</span>
              <span>{isVisited ? 'Visited' : 'Mark Visited'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick action buttons */}
      {!isGuest && (
        <div className="px-5 pt-3 space-y-2">
          {partnerLink?.status === 'accepted' && (
            <button
              onClick={() => {
                if (onAddToCircle) {
                  const note = window.prompt('Why are we saving this?') || '';
                  const partnerPlace: GroupPlace = {
                    placeId: place.id,
                    placeName: place.name,
                    imageUrl: place.imageUrl,
                    placeType: place.type,
                    addedBy: userId,
                    addedByName: userName,
                    addedAt: new Date().toISOString(),
                    note: note.trim(),
                  };
                  onAddToCircle('partner', partnerPlace);
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-2xl font-bold text-sm shadow-lg"
            >
              <span>💕</span>
              <span>Add to Partner Plans</span>
            </button>
          )}
          
          {circles.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {circles.map(circle => (
                <button
                  key={circle.id}
                  onClick={() => {
                    if (onAddToCircle) {
                      const groupPlace: GroupPlace = {
                        placeId: place.id,
                        placeName: place.name,
                        addedBy: userId,
                        addedByName: userName,
                        addedAt: new Date().toISOString(),
                      };
                      onAddToCircle(circle.id, groupPlace);
                    }
                  }}
                  className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap hover:bg-purple-100"
                >
                  <span>👥</span>
                  <span>Add to {circle.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-6 space-y-8 pb-40">
        {activeTab === 'info' ? (
          <>
            <section className="space-y-4">
              <h3 className="text-xl font-extrabold text-[#1E293B]">Expert Review</h3>
              <p className="text-slate-500 leading-relaxed text-sm font-medium">
                {place.fullSummary || place.description}
                Our local parents verified this spot for high cleanliness standards, quiet areas for naps, and stroller accessibility.
              </p>
            </section>

            <section className="grid grid-cols-2 gap-4">
              <InfoTile label="Pricing" value={place.priceLevel || '—'} icon="💰" />
              <InfoTile label="Age Group" value={place.ageAppropriate || 'All ages'} icon="👶" />
              <InfoTile label="Distance" value={place.distance || '—'} icon="📍" />
              <InfoTile label="Rating" value={`⭐ ${place.rating ?? '—'}`} icon="📈" />
            </section>

            <section className="space-y-4">
              {isGuest ? (
                <div className="relative">
                  <button 
                    disabled
                    className="w-full h-16 bg-gradient-to-r from-slate-300 to-slate-400 text-white rounded-3xl font-extrabold shadow-lg flex items-center justify-center gap-3 opacity-60 cursor-not-allowed"
                  >
                    <span className="text-xl">✨</span>
                    Ask AI About This Place
                  </button>
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                    <p className="text-sm font-bold text-amber-700">Sign in to unlock AI summaries</p>
                    <p className="text-xs text-amber-600 mt-1">Get personalized insights for your family</p>
                  </div>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setShowAiPanel(!showAiPanel)}
                    className="w-full h-16 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-3xl font-extrabold shadow-xl shadow-purple-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
                  >
                    <span className="text-xl">✨</span>
                    Ask AI About This Place
                    {aiInfo.limit !== -1 && (
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">
                        {aiInfo.remaining} left
                      </span>
                    )}
                  </button>
                  
                  {showAiPanel && (
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-6 space-y-4 border border-purple-100 animate-slide-up">
                      {aiLimitReached ? (
                        <div className="text-center py-4">
                          <p className="text-lg font-bold text-purple-700">AI Limit Reached</p>
                          <p className="text-sm text-purple-500 mt-2">You've used all {aiInfo.limit} AI requests this month</p>
                          <button className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg">
                            Upgrade to Pro for Unlimited
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {quickQuestions.map(q => (
                              <button 
                                key={q}
                                onClick={() => { setAiQuestion(q); handleAskAI(q); }}
                                className="px-4 py-2 bg-white rounded-xl text-xs font-bold text-purple-600 hover:bg-purple-100 transition-colors shadow-sm"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                          
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={aiQuestion}
                              onChange={(e) => setAiQuestion(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAskAI(aiQuestion)}
                              placeholder="Ask anything about this place..."
                              className="flex-1 px-4 py-3 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <button 
                              onClick={() => handleAskAI(aiQuestion)}
                              disabled={aiLoading || !aiQuestion.trim()}
                              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
                            >
                              {aiLoading ? '...' : 'Ask'}
                            </button>
                          </div>
                        </>
                      )}
                      
                      {aiAnswer && (
                        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                          <p className="text-sm text-slate-600 leading-relaxed">{aiAnswer}</p>
                          {aiCached && (
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cached response</p>
                          )}
                          <button 
                            onClick={handleSaveSummary}
                            disabled={summarySaved}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                              summarySaved 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                            }`}
                          >
                            {summarySaved ? 'Saved!' : 'Save Summary to Notes'}
                          </button>
                          <button
                            onClick={() => handleAskAI(lastAiQuestion || aiQuestion, true)}
                            disabled={aiLoading || !(lastAiQuestion || aiQuestion)}
                            className="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-60"
                          >
                            Refresh AI Response
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-extrabold text-[#1E293B]">Contact Details</h3>
              <div className="grid grid-cols-1 gap-3">
                {(place.phone || placeDetails?.phone) && (
                  <a href={`tel:${place.phone || placeDetails?.phone}`} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:bg-sky-50 transition-colors">
                    <span className="text-2xl">📞</span>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                      <p className="text-sm font-bold text-sky-600">{place.phone || placeDetails?.phone}</p>
                    </div>
                  </a>
                )}
                {(place.website || placeDetails?.website) && (() => {
                  const siteUrl = place.website || placeDetails?.website || '';
                  return (
                    <a href={siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:bg-sky-50 transition-colors">
                      <span className="text-2xl">🌐</span>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Website</p>
                        <p className="text-sm font-bold text-sky-600 truncate max-w-[200px]">{siteUrl.replace(/^https?:\/\//, '')}</p>
                      </div>
                    </a>
                  );
                })()}
                {!place.phone && !placeDetails?.phone && !place.website && !placeDetails?.website && !loadingDetails && (
                  <p className="text-sm text-slate-400 italic">Contact details not available</p>
                )}
                {loadingDetails && !place.phone && !place.website && (
                  <p className="text-sm text-slate-400 italic">Loading contact details...</p>
                )}
                <button 
                  onClick={() => setShowNavModal(true)} 
                  className="w-full h-16 bg-[#0EA5E9] text-white rounded-3xl font-extrabold mt-4 shadow-xl shadow-sky-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  Navigate 🚀
                </button>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button 
                    onClick={() => {
                      const text = `Check out ${place.name}! 📍 ${place.address}\n⭐ ${place.rating} rating\n${place.description}\n\n${place.mapsUrl}`;
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                    className="h-14 bg-[#25D366] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Share
                  </button>
                  <button 
                    onClick={() => {
                      const title = `Visit: ${place.name}`;
                      const details = `${place.description}\n\nAddress: ${place.address}\nRating: ⭐ ${place.rating}\nPrice: ${place.priceLevel}\n\n${place.mapsUrl}`;
                      const now = new Date();
                      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                      startDate.setHours(10, 0, 0, 0);
                      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
                      
                      const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, 15) + 'Z';
                      const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(place.address)}&dates=${formatDate(startDate)}/${formatDate(endDate)}`;
                      window.open(calUrl, '_blank');
                    }}
                    className="h-14 bg-white text-sky-600 border-2 border-sky-200 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-sky-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Plan This
                  </button>
                </div>
              </div>
            </section>

            {/* Google Reviews Section */}
            {placeDetails?.reviews && placeDetails.reviews.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-extrabold text-[#1E293B] flex items-center gap-2">
                    <span>⭐</span> Reviews
                    <span className="text-sm font-bold text-slate-400">
                      ({placeDetails.userRatingsTotal || placeDetails.reviews.length} on Google)
                    </span>
                  </h3>
                  <a 
                    href={placeDetails.mapsUrl || place.mapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-sky-500 hover:underline"
                  >
                    See all on Google
                  </a>
                </div>
                <div className="space-y-3">
                  {placeDetails.reviews.slice(0, 3).map((review, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                      <div className="flex items-start gap-3">
                        {review.profilePhotoUrl ? (
                          <img src={review.profilePhotoUrl} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm">
                            {review.authorName.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-slate-700">{review.authorName}</span>
                            <span className="text-xs text-slate-400">{review.relativeTimeDescription}</span>
                          </div>
                          <div className="flex gap-0.5 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`text-sm ${i < review.rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                            ))}
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-3">{review.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <a 
                  href={placeDetails.mapsUrl || place.mapsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-center text-sm font-bold text-sky-500 hover:underline py-2"
                >
                  Read more reviews on Google →
                </a>
              </section>
            )}

            {venueMemories.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-xl font-extrabold text-[#1E293B] flex items-center gap-2">
                  <span>📸</span> Your Memories
                </h3>
                <div className="space-y-3">
                  {venueMemories.map(memory => {
                    const photos = memory.photoThumbUrls || memory.photoUrls || (memory.photoThumbUrl ? [memory.photoThumbUrl] : (memory.photoUrl ? [memory.photoUrl] : []));
                    return (
                      <div key={memory.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                        <div className="flex gap-3 p-4">
                          {photos.length > 0 && (
                            <div className="flex gap-2 shrink-0">
                              {photos.slice(0, 3).map((url, idx) => (
                                <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden">
                                  <img src={url} className="w-full h-full object-cover" alt="" />
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700">{memory.caption}</p>
                            <p className="text-xs text-slate-400 mt-2">
                              {new Date(memory.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="animate-slide-up space-y-8">
            {!isFavorite && !isVisited ? (
              <div className="py-16 text-center space-y-4 bg-sky-50 rounded-[40px] p-8 border border-sky-100">
                <div className="w-16 h-16 bg-white rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-sm">📘</div>
                <h3 className="font-black text-sky-900 text-xl">Unlock the Notebook</h3>
                <p className="text-xs text-sky-700/70 font-bold leading-relaxed">Save or mark this place as visited to keep notes, photos, and memories.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={onToggleFavorite} className="px-6 h-12 bg-sky-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-sky-200">Save Place</button>
                  <button onClick={onMarkVisited} className="px-6 h-12 bg-green-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-green-200">Mark Visited</button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h3 className="text-xl font-extrabold text-sky-900 flex items-center gap-2">
                    <span className="opacity-50 text-base">✏️</span> Private Notes
                  </h3>
                  <textarea 
                    className="w-full p-6 bg-white rounded-3xl border-none text-sm font-bold text-slate-600 shadow-sm focus:ring-2 focus:ring-sky-500 outline-none placeholder:text-slate-300"
                    rows={4}
                    placeholder="Leo loved the blueberry pancakes. Ask for Table 4 near the play area next time..."
                    value={favoriteData?.notes || ''}
                    onChange={(e) => onUpdateDetails({ notes: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-extrabold text-sky-900 flex items-center gap-2">
                    <span className="opacity-50 text-base">🏷️</span> Activities & Features
                  </h3>
                  <p className="text-xs text-slate-500">Tag what's available at this spot for quick reference</p>
                  
                  {Object.entries(ACTIVITY_OPTIONS).map(([category, activities]) => (
                    <div key={category} className="bg-white rounded-2xl p-4 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">{category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {activities.map((activity) => {
                          const isSelected = favoriteData?.activities?.includes(activity);
                          return (
                            <button
                              key={activity}
                              onClick={() => {
                                const currentActivities = favoriteData?.activities || [];
                                const newActivities = isSelected
                                  ? currentActivities.filter(a => a !== activity)
                                  : [...currentActivities, activity];
                                onUpdateDetails({ activities: newActivities });
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-sky-500 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {activity}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-extrabold text-sky-900">Actual Cost Paid</h3>
                  <div className="flex gap-2 bg-white p-2 rounded-3xl shadow-sm">
                    {['$', '$$', '$$$', '$$$$'].map(price => (
                      <button 
                        key={price}
                        onClick={() => onUpdateDetails({ costEstimate: price })}
                        className={`flex-1 h-12 rounded-2xl font-black text-xs transition-all ${favoriteData?.costEstimate === price ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-50'}`}
                      >
                        {price}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Memory Section */}
                <div className="space-y-4">
                  <MemoryCreate
                    entitlement={entitlement}
                    currentCount={memoryCount}
                    fixedPlace={place}
                    onCreate={(memory) => {
                      if (onAddMemory) {
                        onAddMemory(memory);
                      }
                    }}
                    onUpgradePrompt={() => {
                      alert('Memory limit reached. Upgrade to Pro for unlimited memories!');
                    }}
                    enablePartnerShare={partnerLink?.status === 'accepted'}
                    circleOptions={circles.map(circle => ({ id: circle.id, name: circle.name }))}
                    onTagCircle={onTagMemoryToCircle}
                    title="Add Memory"
                    toggleLabels={{ closed: 'New +', open: 'Cancel' }}
                    showToggle={true}
                  />
                  {/* Show venue memories */}
                  {venueMemories.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Memories Here</p>
                      <div className="grid grid-cols-2 gap-3">
                        {venueMemories.map(memory => {
                          const photos = memory.photoThumbUrls || memory.photoUrls || (memory.photoThumbUrl ? [memory.photoThumbUrl] : (memory.photoUrl ? [memory.photoUrl] : []));
                          const mainPhoto = photos[0] || memory.photoThumbUrl || memory.photoUrl;
                          return (
                            <div key={memory.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                              <div className="relative">
                                {mainPhoto ? (
                                  <img src={mainPhoto} className="w-full aspect-square object-cover" alt="" />
                                ) : (
                                  <div className="w-full aspect-square bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                                    Text Memory
                                  </div>
                                )}
                                {photos.length > 1 && (
                                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                    +{photos.length - 1}
                                  </div>
                                )}
                              </div>
                              <div className="p-3">
                                <p className="text-xs font-semibold text-slate-700 line-clamp-2">{memory.caption}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{new Date(memory.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Floating Home Button removed from here — rendered globally in App.tsx */}

      {showNavModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowNavModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-lg bg-white rounded-t-[32px] p-6 pb-10 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-black text-[#1E293B] text-center mb-5">Open with</h3>
            <div className="flex flex-col gap-3">
              {(() => {
                const urls = getNavigationUrls(place, placeDetails);
                return (
                  <>
                    <button
                      onClick={() => { window.open(urls.google, '_blank'); setShowNavModal(false); }}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl active:scale-95 transition-all"
                    >
                      <span className="text-2xl">🗺️</span>
                      <span className="font-bold text-[#1E293B]">Google Maps</span>
                    </button>
                    <button
                      onClick={() => { window.open(urls.apple, '_blank'); setShowNavModal(false); }}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl active:scale-95 transition-all"
                    >
                      <span className="text-2xl">🍎</span>
                      <span className="font-bold text-[#1E293B]">Apple Maps</span>
                    </button>
                    <button
                      onClick={() => { window.open(urls.waze, '_blank'); setShowNavModal(false); }}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl active:scale-95 transition-all"
                    >
                      <span className="text-2xl">🚗</span>
                      <span className="font-bold text-[#1E293B]">Waze</span>
                    </button>
                  </>
                );
              })()}
            </div>
            <button
              onClick={() => setShowNavModal(false)}
              className="w-full mt-4 p-4 text-slate-400 font-bold text-sm rounded-2xl active:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ active, onClick, label }: any) => (
  <button 
    onClick={onClick}
    className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-sky-500 text-white shadow-lg shadow-sky-100' : 'text-slate-400 bg-white shadow-sm'
    }`}
  >
    {label}
  </button>
);

const InfoTile = ({ label, value, icon }: any) => (
  <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-50">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs opacity-60">{icon}</span>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
    <p className="text-sm font-black text-[#1E293B]">{value}</p>
  </div>
);

const ContactLink = ({ icon, label, value, link }: any) => (
  <div onClick={() => link && window.open(link, '_blank')} className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-3xl cursor-pointer hover:bg-sky-50/50 transition-colors group">
    <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-xl group-hover:bg-white transition-colors">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-sm font-black text-[#1E293B] leading-none">{value}</p>
    </div>
    <span className="text-slate-200 group-hover:text-sky-500 transition-colors">→</span>
  </div>
);

export default VenueProfile;

