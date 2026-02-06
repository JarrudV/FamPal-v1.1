import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Place, Memory, Entitlement } from '../types';
import { canAddMemory } from '../lib/entitlements';
import { storage, auth, ref, uploadBytes, getDownloadURL } from '../lib/firebase';
import { shareMemory } from './ShareMemory';

interface MemoryCreateProps {
  entitlement?: Entitlement;
  currentCount: number;
  onCreate: (memory: Omit<Memory, 'id'>) => void;
  onUpgradePrompt?: () => void;
  places?: Place[];
  favoritePlaces?: Place[];
  fixedPlace?: Place;
  enablePartnerShare?: boolean;
  circleOptions?: { id: string; name: string }[];
  onTagCircle?: (circleId: string, memory: Omit<Memory, 'id'>) => void;
  title?: string;
  toggleLabels?: { open: string; closed: string };
  showToggle?: boolean;
  startOpen?: boolean;
  enableSocialShare?: boolean;
}

const MAX_PHOTOS = 1;
const MAX_WIDTH = 1600;
const THUMB_WIDTH = 400;
const JPEG_QUALITY = 0.7;
const THUMB_QUALITY = 0.6;

async function loadImage(file: File): Promise<HTMLImageElement | ImageBitmap> {
  if ('createImageBitmap' in window) {
    return await createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function compressImage(file: File, maxWidth: number, quality: number): Promise<Blob> {
  const image = await loadImage(file);
  const width = 'width' in image ? image.width : (image as ImageBitmap).width;
  const height = 'height' in image ? image.height : (image as ImageBitmap).height;
  const scale = Math.min(1, maxWidth / width);
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.drawImage(image as CanvasImageSource, 0, 0, targetWidth, targetHeight);
  if ('close' in image) {
    (image as ImageBitmap).close();
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Compression failed'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', quality);
  });
}

async function tryExtractExifGeo(file: File): Promise<{ lat: number; lng: number } | null> {
  const exif = (window as any).EXIF;
  if (!exif?.getData) return null;
  return new Promise((resolve) => {
    try {
      exif.getData(file, function () {
        const lat = exif.getTag(this, 'GPSLatitude');
        const lng = exif.getTag(this, 'GPSLongitude');
        if (lat && lng) {
          const toDecimal = (coord: number[], ref: string) => {
            const [deg, min, sec] = coord;
            const sign = ref === 'S' || ref === 'W' ? -1 : 1;
            return sign * (deg + min / 60 + sec / 3600);
          };
          const latRef = exif.getTag(this, 'GPSLatitudeRef') || 'N';
          const lngRef = exif.getTag(this, 'GPSLongitudeRef') || 'E';
          resolve({ lat: toDecimal(lat, latRef), lng: toDecimal(lng, lngRef) });
          return;
        }
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

const MemoryCreate: React.FC<MemoryCreateProps> = ({
  entitlement,
  currentCount,
  onCreate,
  onUpgradePrompt,
  places = [],
  favoritePlaces = [],
  fixedPlace,
  enablePartnerShare = false,
  circleOptions = [],
  onTagCircle,
  enableSocialShare = true,
  title = 'Add a Memory',
  toggleLabels = { open: 'Cancel', closed: 'Add Memory' },
  showToggle = true,
  startOpen = false,
}) => {
  const memoryInfo = canAddMemory(entitlement, currentCount);
  const [isOpen, setIsOpen] = useState(startOpen);
  const [caption, setCaption] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [selectedPlaceName, setSelectedPlaceName] = useState('');
  const [shareWithPartner, setShareWithPartner] = useState(false);
  const [selectedCircleId, setSelectedCircleId] = useState('');
  const [lastCreated, setLastCreated] = useState<Omit<Memory, 'id'> | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const placeOptions = useMemo(() => {
    const favoriteIds = new Set(favoritePlaces.map(p => p.id));
    const nearby = places.filter(p => !favoriteIds.has(p.id));
    return { favorites: favoritePlaces, nearby };
  }, [favoritePlaces, places]);

  useEffect(() => {
    if (fixedPlace) {
      setSelectedPlaceId(fixedPlace.id);
      setSelectedPlaceName(fixedPlace.name);
    }
  }, [fixedPlace]);

  const handleAddPhoto = async (file: File) => {
    console.log('[FamPals] handleAddPhoto called, file:', file.name, 'size:', file.size, 'type:', file.type);
    if (photos.length >= MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos per memory.`);
      return;
    }
    if (!storage) {
      console.error('[FamPals] Photo upload: storage is null');
      setError('Photo upload is unavailable. Firebase Storage not configured.');
      return;
    }
    if (!auth?.currentUser) {
      console.error('[FamPals] Photo upload: not signed in');
      setError('Photo upload is unavailable. Please sign in again.');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const timestamp = Date.now();
      const folder = fixedPlace?.id || selectedPlaceId || 'general';
      const baseName = `memories/${auth.currentUser.uid}/${folder}/${timestamp}`;
      console.log('[FamPals] Compressing photo...');
      const fullBlob = await compressImage(file, MAX_WIDTH, JPEG_QUALITY);
      const thumbBlob = await compressImage(file, THUMB_WIDTH, THUMB_QUALITY);
      console.log('[FamPals] Compressed. Full:', fullBlob.size, 'Thumb:', thumbBlob.size);
      const fullRef = ref(storage, `${baseName}_full.jpg`);
      const thumbRef = ref(storage, `${baseName}_thumb.jpg`);
      console.log('[FamPals] Uploading to Firebase Storage...');
      await uploadBytes(fullRef, fullBlob);
      await uploadBytes(thumbRef, thumbBlob);
      console.log('[FamPals] Upload complete. Getting download URLs...');
      const [fullUrl, thumbUrl] = await Promise.all([
        getDownloadURL(fullRef),
        getDownloadURL(thumbRef),
      ]);
      console.log('[FamPals] Photo URLs obtained:', { fullUrl: fullUrl.substring(0, 80), thumbUrl: thumbUrl.substring(0, 80) });
      setPhotos(prev => [...prev, fullUrl]);
      setThumbs(prev => [...prev, thumbUrl]);
      tryExtractExifGeo(file).then((result) => {
        if (result) setGeo(result);
      });
    } catch (err: any) {
      console.error('[FamPals] Photo upload FAILED:', err?.message || err, err?.code, err);
      setError(`Photo upload failed: ${err?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!memoryInfo.allowed) {
      if (onUpgradePrompt) {
        onUpgradePrompt();
      } else {
        setError('Memory limit reached. Upgrade to add more.');
      }
      return;
    }
    if (!caption.trim()) {
      setError('Please add a caption.');
      return;
    }
    const placeId = fixedPlace?.id || selectedPlaceId || undefined;
    const placeName = fixedPlace?.name || selectedPlaceName || 'Adventure';
    const nowIso = new Date().toISOString();

    const payload: Omit<Memory, 'id'> = {
      placeId,
      placeName,
      photoUrl: photos[0] || undefined,
      photoUrls: photos.length > 0 ? photos : undefined,
      photoThumbUrl: thumbs[0] || undefined,
      photoThumbUrls: thumbs.length > 0 ? thumbs : undefined,
      caption: caption.trim(),
      taggedFriends: [],
      date: nowIso,
      sharedWithPartner: enablePartnerShare ? shareWithPartner : false,
      circleIds: selectedCircleId ? [selectedCircleId] : [],
      geo: geo || undefined,
    };

    onCreate(payload);
    if (selectedCircleId && onTagCircle) {
      onTagCircle(selectedCircleId, payload);
    }
    if (enableSocialShare) {
      setLastCreated(payload);
    }

    setCaption('');
    setPhotos([]);
    setThumbs([]);
    setError(null);
    if (!fixedPlace) {
      setSelectedPlaceId('');
      setSelectedPlaceName('');
    }
    setSelectedCircleId('');
    if (showToggle) {
      setIsOpen(false);
    }
  };

  const buildMapsUrl = (placeName: string, placeId?: string): string => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const encodedName = encodeURIComponent(placeName);
    if (isIOS) {
      return `https://maps.apple.com/?q=${encodedName}`;
    }
    if (placeId) {
      return `https://www.google.com/maps/search/?api=1&query=${encodedName}&query_place_id=${placeId}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodedName}`;
  };

  const buildShareText = (memory: Omit<Memory, 'id'>): string => {
    const mapsUrl = buildMapsUrl(memory.placeName, memory.placeId);
    let text = '';
    if (memory.caption) {
      text += `${memory.caption}\n\n`;
    }
    text += `📍 ${memory.placeName}\n`;
    text += mapsUrl;
    return text;
  };

  const handleShare = async () => {
    if (!lastCreated) return;
    const result = await shareMemory({ id: 'temp', ...lastCreated });
    if (result.success) {
      if (result.method === 'clipboard') {
        setShareStatus('Copied to clipboard!');
      } else {
        setShareStatus(null);
      }
    } else {
      setShareStatus('Share failed. Try copy.');
    }
    if (result.method !== 'native') {
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  const handleCopy = async () => {
    if (!lastCreated) return;
    try {
      await navigator.clipboard.writeText(buildShareText(lastCreated));
      setShareStatus('Copied!');
      setTimeout(() => setShareStatus(null), 2000);
    } catch {
      setShareStatus('Copy failed');
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-extrabold text-sky-900 flex items-center gap-2">
          <span className="opacity-50 text-base">📸</span> {title}
        </h3>
        {showToggle && (
          <button
            onClick={() => setIsOpen(prev => !prev)}
            className="text-sky-500 font-black text-[10px] uppercase tracking-widest bg-sky-50 px-4 py-2 rounded-xl"
          >
            {isOpen ? toggleLabels.open : toggleLabels.closed}
          </button>
        )}
      </div>

      {(!showToggle || isOpen) && (
        <div className="bg-sky-50 rounded-3xl p-5 space-y-4 border border-sky-100 animate-slide-up">
          {error && (
            <p className="text-xs text-rose-500">{error}</p>
          )}

          {!fixedPlace && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tag a Venue (optional)</label>
              <select
                value={selectedPlaceId}
                onChange={(e) => {
                  const venue = [...placeOptions.favorites, ...placeOptions.nearby].find(p => p.id === e.target.value);
                  setSelectedPlaceId(e.target.value);
                  setSelectedPlaceName(venue?.name || '');
                }}
                className="w-full h-14 bg-white border-none rounded-2xl px-5 text-sm font-bold text-slate-600 outline-none appearance-none"
              >
                <option value="">Select a place...</option>
                {placeOptions.favorites.length > 0 && (
                  <optgroup label="Your Saved Places">
                    {placeOptions.favorites.map(p => (
                      <option key={`fav-${p.id}`} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                )}
                {placeOptions.nearby.length > 0 && (
                  <optgroup label="Nearby Places">
                    {placeOptions.nearby.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleAddPhoto(file);
              }
            }}
            className="hidden"
          />

          {circleOptions.length > 0 && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tag to Circle</label>
              <select
                value={selectedCircleId}
                onChange={(e) => setSelectedCircleId(e.target.value)}
                className="w-full h-12 bg-white border-none rounded-2xl px-4 text-sm font-bold text-slate-600 outline-none appearance-none"
              >
                <option value="">No circle</option>
                {circleOptions.map(circle => (
                  <option key={circle.id} value={circle.id}>{circle.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden">
                  <img src={thumbs[idx] || photo} className="w-full h-full object-cover" alt="" />
                  <button
                    onClick={() => {
                      setPhotos(prev => prev.filter((_, i) => i !== idx));
                      setThumbs(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-20 h-20 bg-white rounded-xl border-2 border-dashed border-sky-200 flex flex-col items-center justify-center text-sky-300 hover:border-sky-400"
                >
                  {uploading ? (
                    <span className="text-xs animate-pulse">Uploading...</span>
                  ) : (
                    <>
                      <span className="text-lg">📷</span>
                      <span className="text-[9px] font-bold">Add Photo</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What happened today?"
              className="w-full p-4 bg-white rounded-2xl text-sm font-medium text-slate-600 resize-none outline-none focus:ring-2 focus:ring-sky-400"
              rows={3}
            />
          </div>

          {enablePartnerShare && (
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input
                type="checkbox"
                checked={shareWithPartner}
                onChange={(e) => setShareWithPartner(e.target.checked)}
                className="accent-sky-500"
              />
              Share with Partner
            </label>
          )}

          {enableSocialShare && lastCreated && (
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Share this memory
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition-colors"
                >
                  Share to Social
                </button>
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Copy Text
                </button>
              </div>
              {shareStatus && (
                <div className="text-[11px] font-semibold text-emerald-600">{shareStatus}</div>
              )}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!memoryInfo.allowed}
            className={`w-full py-3 rounded-2xl font-bold text-sm shadow-lg ${
              memoryInfo.allowed
                ? 'bg-sky-500 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {memoryInfo.allowed
              ? 'Save Memory'
              : `Limit Reached (${memoryInfo.limit}/${memoryInfo.limit})`}
          </button>
        </div>
      )}
    </div>
  );
};

export default MemoryCreate;
