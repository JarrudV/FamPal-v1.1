import React, { useState } from 'react';
import { Memory } from '../types';
import { CircleDoc } from '../lib/circles';

interface ShareMemoryProps {
  memory: Memory;
  circles?: CircleDoc[];
  onShareToCircle?: (memory: Memory, circleId: string) => void;
  onShareToPartner?: (memory: Memory) => void;
  hasLinkedPartner?: boolean;
  partnerName?: string;
  onClose: () => void;
}

function getMapsUrl(placeName: string, placeId?: string): string {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const encodedName = encodeURIComponent(placeName);
  
  if (isIOS) {
    return `https://maps.apple.com/?q=${encodedName}`;
  }
  
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodedName}&query_place_id=${placeId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodedName}`;
}

function getShareText(memory: Memory): string {
  const mapsUrl = getMapsUrl(memory.placeName, memory.placeId);
  let text = '';
  
  if (memory.caption) {
    text += memory.caption + '\n\n';
  }
  
  text += `${memory.placeName}\n`;
  text += mapsUrl;
  
  return text;
}

export async function shareMemory(memory: Memory): Promise<{ success: boolean; method: 'native' | 'clipboard' | 'failed' }> {
  const shareText = getShareText(memory);
  const mapsUrl = getMapsUrl(memory.placeName, memory.placeId);
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Memory at ${memory.placeName}`,
        text: memory.caption || `Check out ${memory.placeName}!`,
        url: mapsUrl,
      });
      return { success: true, method: 'native' };
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
      return { success: false, method: 'failed' };
    }
  }
  
  try {
    await navigator.clipboard.writeText(shareText);
    return { success: true, method: 'clipboard' };
  } catch (error) {
    console.error('Clipboard failed:', error);
    return { success: false, method: 'failed' };
  }
}

export function ShareMemoryModal({ memory, circles = [], onShareToCircle, onShareToPartner, hasLinkedPartner, partnerName, onClose }: ShareMemoryProps) {
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const mapsUrl = getMapsUrl(memory.placeName, memory.placeId);
  const shareText = getShareText(memory);
  
  const handleSocialShare = async () => {
    const result = await shareMemory(memory);
    
    if (result.success) {
      if (result.method === 'clipboard') {
        setShareStatus('Copied to clipboard!');
        setTimeout(() => setShareStatus(null), 2000);
      } else {
        onClose();
      }
    } else {
      setShareStatus('Share failed. Try copying instead.');
      setTimeout(() => setShareStatus(null), 2000);
    }
  };
  
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareStatus('Failed to copy');
      setTimeout(() => setShareStatus(null), 2000);
    }
  };
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(mapsUrl);
      setShareStatus('Link copied!');
      setTimeout(() => setShareStatus(null), 2000);
    } catch {
      setShareStatus('Failed to copy link');
      setTimeout(() => setShareStatus(null), 2000);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
        
        <h3 className="font-black text-slate-800 text-lg mb-1">Share Memory</h3>
        <p className="text-sm text-slate-500 mb-4">{memory.placeName}</p>
        
        {shareStatus && (
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-medium mb-4 text-center">
            {shareStatus}
          </div>
        )}
        
        <div className="space-y-3">
          <button
            onClick={handleSocialShare}
            className="w-full flex items-center gap-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-4 rounded-2xl font-bold shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
            <span>Share to Social</span>
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleCopyText}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                copied 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {copied ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
              )}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
            
            <button
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-3 rounded-xl font-semibold text-sm hover:bg-slate-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
              <span>Copy Link</span>
            </button>
          </div>
          
          {hasLinkedPartner && onShareToPartner && (
            <>
              <div className="border-t border-slate-100 my-4" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Share to Partner</p>
              <button
                onClick={() => {
                  onShareToPartner(memory);
                  setShareStatus(`Shared with ${partnerName || 'partner'}!`);
                  setTimeout(() => {
                    setShareStatus(null);
                    onClose();
                  }, 1500);
                }}
                className="flex items-center gap-2 bg-pink-50 text-pink-700 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-pink-100 w-full"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
                <span>Share with {partnerName || 'Partner'}</span>
              </button>
            </>
          )}
          
          {circles.length > 0 && onShareToCircle && (
            <>
              <div className="border-t border-slate-100 my-4" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Share to Circle</p>
              <div className="flex flex-wrap gap-2">
                {circles.map(circle => (
                  <button
                    key={circle.id}
                    onClick={() => {
                      onShareToCircle(memory, circle.id);
                      onClose();
                    }}
                    className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-purple-100"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                    <span>{circle.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-slate-500 font-semibold text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface ShareButtonProps {
  memory: Memory;
  size?: 'sm' | 'md';
  onClick: () => void;
}

export function ShareButton({ memory, size = 'md', onClick }: ShareButtonProps) {
  const sizeClasses = size === 'sm' 
    ? 'w-8 h-8 text-sm' 
    : 'w-10 h-10 text-base';
    
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`${sizeClasses} bg-sky-50 text-sky-600 rounded-full flex items-center justify-center hover:bg-sky-100 transition-colors`}
      title="Share memory"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
    </button>
  );
}

export function QuickShareButton({ memory }: { memory: Memory }) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const handleQuickShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await shareMemory(memory);
    
    if (result.success) {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 1500);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 1500);
    }
  };
  
  return (
    <button
      onClick={handleQuickShare}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
        status === 'success' 
          ? 'bg-emerald-100 text-emerald-600' 
          : status === 'error'
          ? 'bg-red-100 text-red-600'
          : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
      }`}
      title="Quick share"
    >
      {status === 'success' ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : status === 'error' ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
      )}
    </button>
  );
}
