'use client';

import { FaPlay, FaPause, FaHeart, FaEllipsisH } from 'react-icons/fa';
import Image from 'next/image';
import { Track } from '@/utils/audioUtils';
import { useState } from 'react';

interface TrackItemProps {
  track: Track;
  isSelected?: boolean;
  isPlaying?: boolean;
  onClick?: (track: Track) => void;
}

export default function TrackItem({ track, isSelected = false, isPlaying = false, onClick }: TrackItemProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(track);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`grid grid-cols-[16px_1fr_1fr_auto] md:grid-cols-[16px_4fr_3fr_2fr_1fr] gap-4 px-4 py-3 items-center hover:bg-white/10 group cursor-pointer ${
        isSelected ? 'bg-white/10' : ''
      }`}
    >
      <div className="text-gray-400 text-sm flex items-center justify-center">
        <span className="group-hover:hidden">•</span>
        <span className="hidden group-hover:block">
          {isSelected && isPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
        </span>
      </div>
      <div className="flex items-center min-w-0">
        <div className="w-10 h-10 bg-gray-800 rounded overflow-hidden mr-3 flex-shrink-0">
          <Image 
            src={track.coverArt || '/Cover.jpg'} 
            alt={`${track.title.slice(3)} cover`} 
            width={40}
            height={40}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/Cover.jpg';
            }}
          />
        </div>
        <div className="min-w-0">
          <div className={`font-medium text-sm line-clamp-1 ${isSelected ? 'text-green-500' : 'text-white'}`}>
            {track.title.slice(3)}
          </div>
          {track.lyricsUrl && (
            <span className="bg-green-500 text-black text-xs font-medium rounded-sm px-1 inline-block mt-1">
              LYRICS
            </span>
          )}
        </div>
      </div>
      <div className="text-gray-300 text-sm truncate">{track.artist}</div>
      <div className="hidden md:block text-gray-400 text-sm truncate">{track.album || '-'}</div>
      <div className="text-gray-400 text-sm flex justify-end items-center space-x-4">
        <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-colors">
          <FaHeart size={14} />
        </button>
        <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-colors">
          <FaEllipsisH size={14} />
        </button>
      </div>
    </div>
  );
} 