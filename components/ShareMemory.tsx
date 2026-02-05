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
  
  text += `📍 ${memory.placeName}\n`;
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
            <span className="text-xl">📤</span>
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
              <span>{copied ? '✓' : '📋'}</span>
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
            
            <button
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-3 rounded-xl font-semibold text-sm hover:bg-slate-200"
            >
              <span>🔗</span>
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
                <span>💕</span>
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
                    <span>👥</span>
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
      📤
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
      {status === 'success' ? '✓' : status === 'error' ? '✗' : '📤'}
    </button>
  );
}
