import { useState, useEffect, useRef } from 'react';
import { Track, LyricLine } from '@/utils/audioUtils';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaStar, FaEllipsisH, FaMusic, FaList } from 'react-icons/fa';
import { IoVolumeMedium } from 'react-icons/io5';
import { MdOutlineLyrics } from 'react-icons/md';
import { FastAverageColor } from 'fast-average-color';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

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
  lyrics: LyricLine[];
  currentLyricIndex: number;
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
  onVolumeChange,
  lyrics,
  currentLyricIndex
}: FullScreenPlayerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [gradientColors, setGradientColors] = useState<string[]>(['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLyricRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger entrance animation after mount
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    
    // Re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
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
    if (isDragging) {
      const currentY = e.touches[0].clientY;
      const offset = currentY - dragStartY;
      if (offset < 0) return; // Prevent dragging up
      setDragOffset(offset);
    }
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

  // Calculate dynamic spacing based on lyric line count and length
  const calculateLyricSpacing = (text: string): number => {
    // Count the number of lines by counting newlines
    const lines = text.split('\n');
    const lineCount = lines.length;
    
    // Check for long lines that might wrap
    const hasLongLines = lines.some(line => line.length > 35);
    
    // Base spacing is 120px
    const baseSpacing = 120;
    
    // Adjust spacing: 
    // - For single-line lyrics: keep base spacing
    // - For multi-line lyrics: add extra space (25px per additional line)
    // - For lines that might wrap, add extra space
    let extraSpacing = (lineCount - 1) * 25; // 25px per additional line
    
    // Add extra for potentially wrapping long lines
    if (hasLongLines) {
      extraSpacing += 20;
    }
    
    // Cap at a reasonable maximum
    return baseSpacing + Math.min(extraSpacing, 100);
  };
  
  // Get current lyric height
  const getCurrentLyricHeight = (text: string): number => {
    const lines = text.split('\n');
    const lineCount = lines.length;
    
    // Check if any line is long and might wrap
    const longLineCount = lines.filter(line => line.length > 35).length;
    
    // Base height for single line is 80px
    // Add 35px per normal line and 60px per long line (might wrap)
    return Math.max(80, (lineCount - longLineCount) * 35 + longLineCount * 60);
  };

  // Get current lyric text
  const currentLyricText = currentLyricIndex >= 0 && lyrics.length > 0 
    ? lyrics[currentLyricIndex].text 
    : "♪ ♪ ♪";

  // Calculate spacing for the upcoming lyrics
  const upcomingLyricsTopPosition = calculateLyricSpacing(currentLyricText);
  
  // Calculate height for the current lyric container
  const currentLyricHeight = getCurrentLyricHeight(currentLyricText);

  return (
    <motion.div 
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col touch-none overscroll-none"
      initial={{ opacity: 0, y: "100%" }}
      animate={{ 
        opacity: 1, 
        y: dragOffset > 0 ? `${dragOffset}px` : 0,
        transition: { duration: 0.4, ease: "easeOut" }
      }}
      exit={{ opacity: 0, y: "100%", transition: { duration: 0.3 } }}
      style={{
        background: `linear-gradient(180deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
        backdropFilter: 'blur(30px)',
        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 pt-8">
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

      {/* Main Content - Apple Music Style Layout */}
      <div className="flex-1 flex flex-col px-4 sm:px-8">
        {/* Album Art and Info */}
        <motion.div 
          className="flex items-center mb-6 mt-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <motion.div 
            className="w-12 h-12 rounded overflow-hidden mr-4 flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <Image
              src={track.coverArt}
              alt={track.title}
              width={48}
              height={48}
              className="w-full h-full object-cover"
              priority
            />
          </motion.div>
          <div className="flex-1 min-w-0">
            <motion.h2 
              className="text-white text-lg font-bold truncate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {track.title}
            </motion.h2>
            <motion.p 
              className="text-white/70 text-sm truncate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              {track.artist}
            </motion.p>
          </div>
          <div className="flex items-center space-x-2">
            <motion.button 
              className="text-white/60 p-2"
              whileHover={{ scale: 1.1, color: "#ffffff" }}
              whileTap={{ scale: 0.95 }}
            >
              <FaMusic size={18} />
            </motion.button>
            <motion.button 
              className="text-white/60 p-2"
              whileHover={{ scale: 1.1, color: "#ffffff" }}
              whileTap={{ scale: 0.95 }}
            >
              <FaEllipsisH size={18} />
            </motion.button>
          </div>
        </motion.div>

        {/* Lyrics Section with Continuous Motion */}
        <div className="flex-1 flex flex-col pt-12 my-8">
          {/* Lyrics Display Area with Absolute Positioning */}
          <div className="relative w-full overflow-hidden" style={{ height: '70vh' }}>
            {/* Current Lyric Container - Fixed Position */}
            <div 
              ref={currentLyricRef}
              className="absolute top-0 left-0 right-0"
              style={{ 
                minHeight: `${currentLyricHeight}px`,
                zIndex: 10,
                perspective: '1000px',
                paddingTop: '10px', // Add padding at the top to prevent cutoff
                paddingBottom: '10px'
              }}
            >
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={`current-lyric-container-${currentLyricIndex}`}
                  className="w-full flex items-center justify-center px-6"
                >
                  <motion.h1 
                    key={`current-lyric-${currentLyricIndex}`}
                    initial={{ y: 70, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -70, opacity: 0 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 350, 
                      damping: 25,
                      mass: 0.7
                    }}
                    className="text-3xl font-bold text-center text-white break-words whitespace-pre-wrap w-full"
                    style={{
                      lineHeight: '1.3',
                      maxWidth: '100%',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                      hyphens: 'auto'
                    }}
                  >
                    {currentLyricText}
                  </motion.h1>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Upcoming Lyrics Section */}
            <div 
              className="absolute left-0 right-0 px-6" 
              style={{ 
                top: `${upcomingLyricsTopPosition}px`
              }}
            >
              {lyrics.length > 0 && currentLyricIndex < lyrics.length - 1 
                ? lyrics.slice(currentLyricIndex + 1, currentLyricIndex + 4).map((line, index) => {
                    // Calculate dynamic spacing between upcoming lyrics
                    const prevLineText = index > 0 
                      ? lyrics[currentLyricIndex + index].text 
                      : currentLyricText;
                    
                    // Additional spacing based on previous lyric complexity
                    const lineSpacing = index === 0 ? 0 : Math.min(prevLineText.split('\n').length * 15, 40);
                    
                    return (
                      <motion.div 
                        key={`upcoming-${currentLyricIndex}-${index}`}
                        className="mb-10"
                        style={{
                          marginTop: index === 0 ? 0 : lineSpacing
                        }}
                        initial={{ y: 70, opacity: 0 }}
                        animate={{ 
                          y: 0, 
                          opacity: Math.max(0.4, 1 - (index * 0.2))
                        }}
                        transition={{ 
                          delay: index * 0.08,
                          type: "spring",
                          stiffness: 300,
                          damping: 30
                        }}
                      >
                        <p 
                          className="text-xl font-bold text-center text-white/60 break-words whitespace-pre-wrap w-full"
                          style={{
                            lineHeight: '1.3',
                            maxWidth: '100%',
                            overflowWrap: 'break-word',
                            wordBreak: 'break-word',
                            hyphens: 'auto'
                          }}
                        >
                          {line.text}
                        </p>
                      </motion.div>
                    );
                  })
                : null
              }
            </div>

            {/* Previous lyric that's fading out and moving up */}
            {currentLyricIndex > 0 && lyrics.length > 0 && (
              <motion.div
                key={`prev-lyric-${currentLyricIndex-1}`}
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: -70, opacity: 0 }}
                className="absolute top-0 left-0 right-0 flex items-center justify-center px-6"
                style={{
                  zIndex: 9,
                  height: `${currentLyricHeight}px`
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 350, 
                  damping: 25,
                  mass: 0.7
                }}
              >
                <span 
                  className="text-3xl font-bold text-center text-white break-words whitespace-pre-wrap w-full"
                  style={{
                    lineHeight: '1.3',
                    maxWidth: '100%',
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                    hyphens: 'auto'
                  }}
                >
                  {lyrics[currentLyricIndex - 1].text}
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Controls - Bottom */}
        <motion.div 
          className="fixed bottom-0 left-0 right-0 bg-black/10 backdrop-blur-sm pb-8 pt-4 px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Progress Bar */}
          <div className="max-w-xl mx-auto mb-4">
            <div className="relative h-[3px] bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                className="absolute h-full bg-white rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
                transition={{ type: "tween", ease: "linear", duration: 0.1 }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/60 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>-{formatTime(duration - currentTime)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center space-x-12 max-w-md mx-auto">
            <motion.button 
              onClick={onPrevious}
              className="text-white/80 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaStepBackward size={24} />
            </motion.button>
            <motion.button 
              onClick={onPlayPause}
              className="text-white w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
              whileTap={{ scale: 0.95 }}
            >
              {isPlaying ? <FaPause size={32} /> : <FaPlay size={32} className="ml-1" />}
            </motion.button>
            <motion.button 
              onClick={onNext}
              className="text-white/80 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaStepForward size={24} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}