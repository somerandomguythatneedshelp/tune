'use client';

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Howl } from 'howler';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaStar, FaEllipsisH, FaMusic, FaList } from 'react-icons/fa';
import { IoVolumeMedium } from 'react-icons/io5';
import { MdOutlineLyrics } from 'react-icons/md';
import { Track, getAllTracks, LyricLine, parseLRC } from '@/utils/audioUtils';
import Marquee from 'react-fast-marquee';
import FullScreenPlayer from './FullScreenPlayer';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicPlayerProps {
  tracks: Track[];
  currentTrackIndex: number;
  onTrackChange: (index: number) => void;
  isPlaying: boolean;
  onPlaybackChange: (isPlaying: boolean) => void;
}

// Marquee text component for long titles
const MarqueeText = ({ text, className }: { text: string; className?: string }) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const checkOverflow = () => {
      if (!textRef.current || !containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      
      // Only trigger animation if text is significantly longer
      setIsOverflowing(textWidth > containerWidth * 1.1);
    };

    // Initial check
    checkOverflow();

    // Re-check after a short delay to ensure DOM has updated
    const timeoutId = setTimeout(checkOverflow, 100);

    return () => clearTimeout(timeoutId);
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden relative flex items-center ${className}`}>
      <div 
        ref={textRef} 
        className={`whitespace-nowrap ${isOverflowing ? 'opacity-0' : ''}`}
      >
        {text}
      </div>
      {isOverflowing && (
        <div className="absolute inset-0 flex items-center">
          <Marquee
            gradient={false}
            speed={40}
            delay={1}
            pauseOnHover={true}
          >
            <span className="px-2">{text}</span>
          </Marquee>
        </div>
      )}
    </div>
  );
};

export default function MusicPlayer({ tracks, currentTrackIndex, onTrackChange, isPlaying: parentIsPlaying, onPlaybackChange }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const soundRef = useRef<Howl | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [gradientColors, setGradientColors] = useState<string[]>(['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']);

  useEffect(() => {
    // Check if device is iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream);
  }, []);

  useEffect(() => {
    const loadTracks = async () => {
      try {
        await getAllTracks();
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading tracks:', error);
        setIsLoading(false);
      }
    };

    loadTracks();
  }, []);

  useEffect(() => {
    if (currentTrackIndex !== -1 && tracks.length > 0) {
      setCurrentTrack(tracks[currentTrackIndex]);
    }
  }, [currentTrackIndex, tracks]);

  // Extract dominant color from track artwork for gradient
  useEffect(() => {
    if (!currentTrack?.coverArt) return;

    const loadImage = async () => {
      try {
        const img = document.createElement('img');
        img.crossOrigin = 'Anonymous';
        
        img.onload = async () => {
          try {
            const FastAverageColor = (await import('fast-average-color')).FastAverageColor;
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

        img.src = currentTrack.coverArt;
      } catch (error) {
        console.error('Error in loadImage:', error);
        setGradientColors(['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']);
      }
    };

    loadImage();
  }, [currentTrack?.coverArt]);

  const playNextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    onTrackChange((currentTrackIndex + 1) % tracks.length);
  }, [tracks.length, currentTrackIndex, onTrackChange]);

  const playPreviousTrack = useCallback(() => {
    if (tracks.length === 0) return;
    onTrackChange((currentTrackIndex - 1 + tracks.length) % tracks.length);
  }, [tracks.length, currentTrackIndex, onTrackChange]);

  useEffect(() => {
    if (!currentTrack) return;

    // Cleanup previous instance
    if (soundRef.current) {
      soundRef.current.unload();
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Initialize the Howl instance
    soundRef.current = new Howl({
      src: [currentTrack.audioUrl],
      html5: true,
      format: ['m4a'],
      loop: false,
      volume: volume,
      onload: () => {
        if (soundRef.current) {
          setDuration(soundRef.current.duration());
        }
      },
      onplay: () => {
        setIsPlaying(true);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
        // Start progress updates
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        progressIntervalRef.current = setInterval(() => {
          if (soundRef.current) {
            const time = soundRef.current.seek() as number;
            setCurrentTime(time);
          }
        }, 50);
      },
      onpause: () => {
        setIsPlaying(false);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
        // Clear progress interval on pause
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      },
      onend: () => {
        setIsPlaying(false);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'none';
        }
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        playNextTrack();
      },
      onseek: () => {
        if (soundRef.current) {
          const time = soundRef.current.seek() as number;
          setCurrentTime(time);
        }
      }
    });

    // Set up media session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'Unknown Artist',
        artwork: [
          {
            src: currentTrack.coverArt,
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (soundRef.current && !soundRef.current.playing()) {
          soundRef.current.play();
        }
      });
      
      navigator.mediaSession.setActionHandler('pause', () => {
        if (soundRef.current && soundRef.current.playing()) {
          soundRef.current.pause();
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', playPreviousTrack);
      navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);
    }

    return () => {
      if (soundRef.current) {
        soundRef.current.unload();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentTrack, playNextTrack, playPreviousTrack, volume]);

  // Separate effect for volume changes
  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.volume(volume);
    }
  }, [volume]);

  useEffect(() => {
    // Initialize AudioContext for iOS
    if (isIOS && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, [isIOS]);

  // Add effect to sync with parent's isPlaying state
  useEffect(() => {
    if (parentIsPlaying !== undefined && soundRef.current) {
      if (parentIsPlaying && !soundRef.current.playing()) {
        soundRef.current.play();
      } else if (!parentIsPlaying && soundRef.current.playing()) {
        soundRef.current.pause();
      }
    }
  }, [parentIsPlaying]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!soundRef.current) return;

    if (isPlaying) {
      soundRef.current.pause();
    } else {
      soundRef.current.play();
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const loadLyrics = async (lyricsUrl: string | undefined) => {
    if (!lyricsUrl) {
      setLyrics([]);
      return;
    }
    
    try {
      const response = await fetch(lyricsUrl);
      if (!response.ok) {
        console.error('Failed to fetch lyrics:', response.status, response.statusText);
        setLyrics([]);
        return;
      }
      
      const text = await response.text();
      const parsedLyrics = parseLRC(text);
      setLyrics(parsedLyrics);
    } catch (error) {
      console.error('Error loading lyrics:', error);
      setLyrics([]);
    }
  };

  useEffect(() => {
    if (currentTrack?.lyricsUrl) {
      loadLyrics(currentTrack.lyricsUrl);
    } else {
      setLyrics([]);
    }
  }, [currentTrack]);

  // Update current lyric based on playback time
  useEffect(() => {
    if (!soundRef.current || !isPlaying || lyrics.length === 0) return;

    const updateCurrentLyric = () => {
      const currentTime = soundRef.current?.seek() as number;
      if (currentTime === undefined) return;

      // Find the current lyric
      let newIndex = -1;
      for (let i = 0; i < lyrics.length; i++) {
        if (lyrics[i].time <= currentTime) {
          newIndex = i;
        } else {
          break;
        }
      }

      if (newIndex !== currentLyricIndex) {
        setCurrentLyricIndex(newIndex);
      }
    };

    const interval = setInterval(updateCurrentLyric, 100);
    return () => clearInterval(interval);
  }, [isPlaying, lyrics, currentLyricIndex]);

  // Use a more compact player on mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add this handler for progress bar clicks
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!progressRef.current || !soundRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    
    if (isNaN(percent)) return;
    
    const newTime = percent * duration;
    soundRef.current.seek(newTime);
    setCurrentTime(newTime);
  };

  // Handle mouse hover on progress bar
  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!progressRef.current || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    
    if (isNaN(percent)) return;
    
    const hoverTimeValue = percent * duration;
    setHoverTime(hoverTimeValue);
    setHoverPosition(e.clientX - rect.left);
  };

  // Clear hover values when mouse leaves
  const handleProgressLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setHoverTime(null);
    setHoverPosition(null);
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setShowFullScreen(true);
  };

  // Button click handlers with stopPropagation
  const handleNextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playNextTrack();
  };

  const handlePrevClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playPreviousTrack();
  };

  if (isLoading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-gray-800/50 p-3">
        <div className="max-w-7xl mx-auto text-center text-gray-400 text-sm">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-green-500/50 animate-pulse"></div>
            <span>Loading tracks...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTrack) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-gray-800/50 p-3">
        <div className="max-w-7xl mx-auto text-center text-gray-400 text-sm">
          No tracks available
        </div>
      </div>
    );
  }

  return (
    <>
      {showFullScreen && (
        <FullScreenPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onClose={() => setShowFullScreen(false)}
          onPlayPause={togglePlay}
          onNext={playNextTrack}
          onPrevious={playPreviousTrack}
          volume={volume}
          onVolumeChange={(v) => setVolume(v)}
          lyrics={lyrics}
          currentLyricIndex={currentLyricIndex}
        />
      )}

      {/* Compact Player for Mobile */}
      {isMobile ? (
        <motion.div 
          className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t border-white/10 text-white select-none"
          onClick={toggleFullscreen}
          ref={containerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          style={{
            background: `linear-gradient(180deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
            backdropFilter: 'blur(20px)'
          }}
        >
          {/* Progress Bar - Styled like fullscreen player */}
          <div className="relative h-[3px] bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="absolute h-full bg-white rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
              transition={{ type: "tween", ease: "linear", duration: 0.1 }}
              onClick={handleProgressClick}
              onMouseMove={handleProgressHover}
              onMouseLeave={handleProgressLeave}
            />
          </div>

          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center flex-1 min-w-0">
              <motion.div 
                className="w-10 h-10 mr-3 rounded-lg overflow-hidden flex-shrink-0 shadow-lg"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                {currentTrack?.coverArt && (
                  <Image
                    src={currentTrack.coverArt}
                    alt={currentTrack.title}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/Cover.jpg';
                    }}
                    priority
                  />
                )}
              </motion.div>
              <div className="min-w-0">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <MarqueeText 
                    text={currentTrack?.title?.slice(3) || 'No track selected'} 
                    className="font-bold text-sm"
                  />
                </motion.div>
                <motion.p 
                  className="text-white/70 text-xs truncate"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  {currentTrack?.artist || 'Unknown Artist'}
                </motion.p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={handlePrevClick}
                className="text-white/80 hover:text-white transition-colors p-2"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaStepBackward size={12} />
              </motion.button>
              <motion.button
                onClick={togglePlay}
                className="text-white w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                whileTap={{ scale: 0.95 }}
              >
                {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} className="ml-1" />}
              </motion.button>
              <motion.button
                onClick={handleNextClick}
                className="text-white/80 hover:text-white transition-colors p-2"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaStepForward size={12} />
              </motion.button>
            </div>
          </div>
          
          {/* Time indicators */}
          <div className="flex justify-between text-xs text-white/60 px-4 pb-1">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(duration - currentTime)}</span>
          </div>
        </motion.div>
      ) : (
        // Regular Player for Desktop - Styled like fullscreen player
        <motion.div 
          className="fixed bottom-0 left-0 right-0 border-t border-white/10 text-white select-none"
          onClick={toggleFullscreen}
          ref={containerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          style={{
            background: `linear-gradient(180deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
            backdropFilter: 'blur(20px)'
          }}
        >
          <div className="max-w-7xl mx-auto">
            {/* Progress bar for desktop - styled like fullscreen player */}
            <div className="relative h-[3px] bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                className="absolute h-full bg-white rounded-full"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                transition={{ type: "tween", ease: "linear", duration: 0.1 }}
              />
              
              <div 
                className="absolute inset-0 w-full cursor-pointer"
                ref={progressRef}
                onClick={handleProgressClick}
                onMouseMove={handleProgressHover}
                onMouseLeave={handleProgressLeave}
              ></div>
              
              {/* Desktop tooltip */}
              {hoverTime !== null && hoverPosition !== null && (
                <div 
                  className="absolute top-0 transform -translate-y-full -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-xs text-white pointer-events-none shadow-lg"
                  style={{ left: hoverPosition }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>
            
            <div className="flex justify-between text-xs text-white/60 px-6 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="flex items-center justify-between p-3">
              {/* Track Info */}
              <motion.div 
                className="flex items-center flex-1 min-w-0"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <motion.div 
                  className="w-12 h-12 mr-4 rounded overflow-hidden flex-shrink-0 shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  {currentTrack?.coverArt && (
                    <Image
                      src={currentTrack.coverArt}
                      alt={currentTrack.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/Cover.jpg';
                      }}
                      priority
                    />
                  )}
                </motion.div>
                <div className="min-w-0">
                  <motion.h2 
                    className="text-white text-lg font-bold truncate"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    {currentTrack?.title?.slice(3) || 'No track selected'}
                  </motion.h2>
                  <motion.p 
                    className="text-white/70 text-sm truncate"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                  >
                    {currentTrack?.artist || 'Unknown Artist'}
                  </motion.p>
                </div>
              </motion.div>

              {/* Player Controls - centered */}
              <div className="flex items-center justify-center space-x-8">
                <motion.button 
                  onClick={handlePrevClick} 
                  className="text-white/80 hover:text-white transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FaStepBackward size={20} />
                </motion.button>
                <motion.button
                  onClick={togglePlay}
                  className="text-white w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} className="ml-1" />}
                </motion.button>
                <motion.button 
                  onClick={handleNextClick} 
                  className="text-white/80 hover:text-white transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FaStepForward size={20} />
                </motion.button>
              </div>
              
              {/* Right side controls */}
              <div className="flex items-center space-x-2">
                <motion.button 
                  className="text-white/60 p-2"
                  whileHover={{ scale: 1.1, color: "#ffffff" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MdOutlineLyrics size={18} />
                </motion.button>
                <motion.button 
                  className="text-white/60 p-2"
                  whileHover={{ scale: 1.1, color: "#ffffff" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IoVolumeMedium size={18} />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
