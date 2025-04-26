import { useState, useEffect, useRef, useCallback } from 'react';
import { Track, LyricLine } from '@/utils/audioUtils';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaStar, FaEllipsisH, FaMusic, FaList, FaTimes } from 'react-icons/fa'; // Import FaTimes for the close icon
import { IoVolumeMedium } from 'react-icons/io5';
import { MdOutlineLyrics } from 'react-icons/md';
import { FastAverageColor } from 'fast-average-color';
import Image from 'next/image';
import { motion, AnimatePresence, useAnimation } from 'framer-motion'; // Import useAnimation


interface FullScreenPlayerProps {
  track: Track & { explicit?: boolean };
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onClose: () => void; // Ensure onClose is typed
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
  onClose, // Destructure onClose
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
  const lyricsScrollAreaRef = useRef<HTMLDivElement>(null); // Ref for the container holding all lyrics
  const currentLyricRef = useRef<HTMLDivElement>(null); // Ref for the currently active lyric's container
  const albumArtContainerRef = useRef<HTMLDivElement>(null); // Ref for album art container

  // Framer Motion animation controls for the lyrics container
  const lyricsControls = useAnimation();

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

  // Effect to extract color using FastAverageColor
  useEffect(() => {
    const loadImage = async () => {
      // Ensure track.coverArt exists before attempting to load
      if (!track.coverArt) {
        console.warn('track.coverArt is not available for color extraction.');
        setGradientColors(['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']);
        return;
      }

      const img = new window.Image(); // Use window.Image for broader compatibility
      img.crossOrigin = 'Anonymous'; // Needed for cross-origin images

      img.onload = () => {
        try {
          const fac = new FastAverageColor();
          const color = fac.getColor(img); // Use getColor directly

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
          // Fallback to default colors on error
          setGradientColors(['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']);
        }
      };

      img.onerror = () => {
        console.error('Error loading image for FastAverageColor color extraction.');
        // Fallback to default colors on image load error for color extraction
        setGradientColors(['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']);
      };

      // Set the image source
      img.src = track.coverArt;
    };

    loadImage();
  }, [track.coverArt]); // Re-run effect when coverArt changes

  // Effect to animate the lyrics position when the current lyric changes
  useEffect(() => {
    if (lyricsScrollAreaRef.current && currentLyricRef.current) {
      const lyricsContainer = lyricsScrollAreaRef.current;
      const currentLyric = currentLyricRef.current;

      // Calculate the vertical position needed to center the current lyric
      const containerHeight = lyricsContainer.offsetHeight;
      const currentLyricTop = currentLyric.offsetTop;
      const currentLyricHeight = currentLyric.offsetHeight;

      // Target scroll position to center the current lyric
      const targetScrollTop = currentLyricTop - (containerHeight / 2) + (currentLyricHeight / 2);

      // Animate the translateY of the lyrics container's content
      // The translateY value should be negative to move the content up.
      const targetTranslateY = -targetScrollTop;

      // Animate the translateY of the lyrics container's content
      lyricsControls.start({
        y: targetTranslateY,
        transition: {
          type: "spring",
          stiffness: 100, // Adjust stiffness for animation speed
          damping: 20,   // Adjust damping for bounce effect
        },
      });
    }
  }, [currentLyricIndex, lyricsControls]); // Re-run when currentLyricIndex or controls change


  const handleTouchStart = (e: React.TouchEvent) => {
    // Check if the touch started within the lyrics scroll area
    if (lyricsScrollAreaRef.current && lyricsScrollAreaRef.current.contains(e.target as Node)) {
        // If inside the lyrics area, don't start dragging the main container
        return;
    }
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

   // Get lyric height (simplified for list rendering) - Kept this as it's a utility
   const getLyricHeight = (text: string): number => {
     const lines = text.split('\n');
     const longLineCount = lines.filter(line => line.length > 35).length;
     const normalLineCount = lines.length - longLineCount;
     // Estimate height: base height + height per line (more for wrapping lines)
     return 30 + normalLineCount * 20 + longLineCount * 40; // Adjusted base/line heights for typical list view
   };


  return (
    <motion.div
      ref={containerRef}
      // Added select-none class to make text non-selectable
      className="fixed inset-0 z-50 flex flex-col touch-none overscroll-none select-none"
      initial={{ opacity: 0, y: "100%" }}
      animate={{
        opacity: 1,
        y: dragOffset > 0 ? `${dragOffset}px` : 0,
        transition: { duration: 0.4, ease: "easeOut" }
      }}
      exit={{ opacity: 0, y: "100%", transition: { duration: 0.3 } }} // Exit animation
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
        {/* Close Button - Added here */}
        <motion.button
          onClick={() => {
            console.log('Close button clicked'); // Added console log
            onClose(); // Call onClose when clicked
          }}
          className="text-white/80 hover:text-white transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Close Fullscreen Player" // Accessibility label
        >
          <FaTimes size={24} /> {/* Using FaTimes for the X icon */}
        </motion.button>

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

      {/* Main Content Area - Horizontal flex with album art and lyrics */}
      {/* Use flex to align items and position them */}
      {/* Added -mt-8 class to move content slightly up */}
      <div className="flex-1 flex flex-row px-4 sm:px-8 justify-center items-center -mt-8"> {/* flex-row, justify-center, items-center for vertical centering, added negative top margin */}

        {/* Album Art and Info - Positioned on the left */}
        <motion.div
          ref={albumArtContainerRef} // Attach ref
          className="flex flex-col items-center mr-8 flex-shrink-0 w-64" // Layout for column, right margin, fixed width, prevent shrinking
          initial={{ opacity: 0, x: -20 }} // Animate from the left
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {/* Increased size of the image container */}
          <motion.div
            className="w-64 h-64 rounded-lg overflow-hidden mb-4 shadow-lg" // Increased size and added shadow
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <Image
              src={track.coverArt || 'https://placehold.co/256x256/000000/FFFFFF?text=No+Art'} // Fallback for Image, updated size
              alt={track.title}
              width={256} // Updated width
              height={256} // Updated height
              className="w-full h-full object-cover"
              priority
            />
          </motion.div>
           {/* Track Info below the album art */}
           <div className="text-center">
             <motion.h2
               className="text-white text-xl font-bold" // Adjusted text size
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.3, duration: 0.4 }}
             >
               {track.title.slice(3)}
             </motion.h2>
             <motion.p
               className="text-white/70 text-base" // Adjusted text size
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.4, duration: 0.4 }}
             >
               {track.artist}
             </motion.p>
           </div>
        </motion.div>

        {/* Lyrics Section - Scrollable Container - Takes up remaining space */}
        {/* This div is the main scrollable area for all lyrics */}
        {/* Added overflow-hidden to hide default scrollbar */}
        <div
          ref={lyricsScrollAreaRef} // Attach ref for the container
          className="flex-1 overflow-hidden text-left relative" // Changed to text-left, removed h-full, added overflow-hidden
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            maxWidth: '500px',
            marginLeft: '0', // Ensure no extra left margin
            marginRight: '0', // Ensure no extra right margin
            height: '300px', // Set a fixed height for the visible area (adjust as needed)
          }}
          // Removed onScroll handler
          // Stop touch events from bubbling up to the main container's drag handlers
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* This motion.div will contain all lyrics and be animated vertically */}
          <motion.div
            animate={lyricsControls} // Attach animation controls
            className="w-full" // Ensure it takes full width
          >
            {lyrics.length > 0 ? (
              lyrics.map((line, index) => {
                // Determine if this is the current lyric - Moved to the top
                const isCurrent = index === currentLyricIndex;

                // Determine the appropriate text size class based on index
                let textSizeClass = 'text-white/60 text-xl font-semibold'; // Default for inactive

                if (isCurrent) { // Use isCurrent here
                  textSizeClass = 'text-white text-3xl font-bold'; // Current lyric size
                } else if (index < currentLyricIndex) {
                  textSizeClass = 'text-white/60 text-2xl font-semibold'; // Previous lyric size (bigger than upcoming, less than current)
                } else { // index > currentLyricIndex
                   textSizeClass = 'text-white/60 text-xl font-semibold'; // Upcoming lyric size (slightly increased from previous inactive)
                }


                return (
                  // This outer div contains each lyric line and its styling
                  <div
                    key={`lyric-${index}`}
                    // Assign ref only to the current lyric's container for scrolling calculation
                    ref={isCurrent ? currentLyricRef : null}
                    // Removed AnimatePresence and motion.div for individual lyric fading
                    className={`mb-6 transition-all duration-300 ease-in-out pr-6 ${textSizeClass}`} // Apply dynamic text size class
                    style={{
                      lineHeight: '1.3',
                      textShadow: isCurrent ? '0 0 8px rgba(255, 255, 255, 0.5)' : 'none', // Simple text shadow "glow"
                    }}
                  >
                    {line.text}
                  </div>
                );
              })
            ) : (
              <div className="text-white/60 text-xl font-semibold text-left px-6"> {/* Adjusted text alignment and padding */}
                No lyrics available for this track.
              </div>
            )}
          </motion.div> {/* End of motion.div for animating lyrics */}
        </div> {/* End of lyrics scroll area container */}

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
    </motion.div>
  );
}
