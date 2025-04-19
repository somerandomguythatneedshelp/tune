import { useState, useEffect, useRef } from 'react';
import { Track } from '@/utils/audioUtils';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaStar, FaEllipsisH, FaMusic, FaList } from 'react-icons/fa';
import { IoVolumeMedium } from 'react-icons/io5';
import { FastAverageColor } from 'fast-average-color';
import Image from 'next/image';

interface FullScreenPlayerProps {
  track: Track & { explicit?: boolean };
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onClose: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  volume: number;
  onVolumeChange: (value: number) => void;
}

export default function FullScreenPlayer({
  track,
  isPlaying,
  currentTime,
  duration,
  onClose,
  onPlayPause,
  onNext,
  onPrevious,
  volume,
  onVolumeChange
}: FullScreenPlayerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [gradientColors, setGradientColors] = useState<string[]>(['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger entrance animation after mount
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const img = document.createElement('img');
        img.crossOrigin = 'Anonymous';
        
        img.onload = async () => {
          try {
            const fac = new FastAverageColor();
            const color = await fac.getColor(img);
            
            if (color.error) {
              throw new Error('Could not extract color');
            }
            
            const { value } = color;
            const colors = [
              `rgba(${value[0]}, ${value[1]}, ${value[2]}, 0.8)`,
              `rgba(${value[0]}, ${value[1]}, ${value[2]}, 0.95)`
            ];
            
            setGradientColors(colors);
          } catch (error) {
            console.error('Error in color extraction:', error);
            setGradientColors(['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']);
          }
        };

        img.onerror = () => {
          console.error('Error loading image');
          setGradientColors(['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']);
        };

        img.src = track.coverArt;
      } catch (error) {
        console.error('Error in loadImage:', error);
        setGradientColors(['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']);
      }
    };

    loadImage();
  }, [track.coverArt]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const offset = currentY - dragStartY;
    if (offset < 0) return; // Prevent dragging up
    setDragOffset(offset);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (dragOffset > window.innerHeight * 0.3) {
      // Close if dragged down more than 30% of screen height
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    } else {
      // Spring back if not dragged enough
      setDragOffset(0);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col touch-none ${
        isVisible ? 'animate-slideUp' : 'animate-slideDown'
      }`}
      style={{
        background: `linear-gradient(180deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
        backdropFilter: 'blur(30px)',
        transform: `translateY(${dragOffset}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 mt-2">
        <div className="w-8" /> {/* Spacer */}
        <div 
          className="h-1 w-8 bg-gray-600 rounded-full"
          style={{ opacity: isDragging ? 0.3 : 0.6 }}
        />
        <div className="flex space-x-4">
          <button className="text-white/80 hover:text-white transition-colors">
            <FaStar size={22} />
          </button>
          <button className="text-white/80 hover:text-white transition-colors">
            <FaEllipsisH size={22} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-12">
        {/* Album Art */}
        <div className="w-60 h-60 sm:w-72 sm:h-72 rounded-lg overflow-hidden shadow-2xl mb-8">
          <Image
            src={track.coverArt}
            alt={track.title}
            width={300}
            height={300}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        
        {/* Song Info */}
        <div className="w-full max-w-md mb-8">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-white text-xl font-semibold">{track.title}</h2>
            {track.explicit && (
              <span className="bg-gray-500/30 text-white/80 text-xs px-1 rounded">E</span>
            )}
          </div>
          <p className="text-white/60 text-base">{track.artist || 'Unknown Artist'}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mb-6">
          <div className="relative h-[3px] bg-white/20 rounded-full">
            <div 
              className="absolute h-full bg-white rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/60 mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(duration - currentTime)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-12 mb-8">
          <button 
            onClick={onPrevious}
            className="text-white/80 hover:text-white transition-colors"
          >
            <FaStepBackward size={28} />
          </button>
          <button 
            onClick={onPlayPause}
            className="text-white w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            {isPlaying ? <FaPause size={32} /> : <FaPlay size={32} className="ml-1" />}
          </button>
          <button 
            onClick={onNext}
            className="text-white/80 hover:text-white transition-colors"
          >
            <FaStepForward size={28} />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="w-full max-w-md flex items-center space-x-3 mb-4">
          <IoVolumeMedium size={20} className="text-white/60" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Bottom Controls */}
        <div className="w-full max-w-md flex justify-between items-center mb-4">
          <button className="text-white/60 hover:text-white transition-colors">
            <FaMusic size={20} />
          </button>
          <button className="text-white/60 hover:text-white transition-colors">
            <FaList size={20} />
          </button>
        </div>

        {/* Device Name */}
        <div className="text-white/40 text-sm">
          PowerLocus Universe
        </div>
      </div>
    </div>
  );
} 