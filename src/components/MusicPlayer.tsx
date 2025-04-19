'use client';

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Howl } from 'howler';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaStepForward, FaStepBackward, FaHeart, FaRegHeart, FaMusic, FaTimes } from 'react-icons/fa';
import { Track, getAllTracks, LyricLine, parseLRC } from '@/utils/audioUtils';
import Marquee from 'react-fast-marquee';
import FullScreenPlayer from './FullScreenPlayer';
import Image from 'next/image';

interface MusicPlayerProps {
  tracks: Track[];
  currentTrackIndex: number;
  onTrackChange: (index: number) => void;
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

export default function MusicPlayer({ tracks, currentTrackIndex, onTrackChange }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const soundRef = useRef<Howl | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);

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

  const togglePlay = () => {
    if (!soundRef.current) return;

    if (isPlaying) {
      soundRef.current.pause();
    } else {
      soundRef.current.play();
    }
  };

  // Update volume handler for HTML input events
  const handleInputVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    handleVolumeChange(newVolume);
  };

  // Update volume handler for direct number values
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (soundRef.current) {
      soundRef.current.volume(newVolume);
    }
  };

  const toggleMute = () => {
    if (!soundRef.current) return;
    
    if (isMuted) {
      soundRef.current.volume(volume);
    } else {
      soundRef.current.volume(0);
    }
    setIsMuted(!isMuted);
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

  if (isLoading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-gray-800 p-2 sm:p-4">
        <div className="max-w-7xl mx-auto text-center text-gray-400 text-sm sm:text-base">
          Loading tracks...
        </div>
      </div>
    );
  }

  if (!currentTrack) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-gray-800 p-2 sm:p-4">
        <div className="max-w-7xl mx-auto text-center text-gray-400 text-sm sm:text-base">
          No tracks available
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Full Screen Player */}
      {showFullScreen && (
        <FullScreenPlayer
          track={{ ...currentTrack, explicit: true }}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onClose={() => setShowFullScreen(false)}
          onPlayPause={togglePlay}
          onNext={playNextTrack}
          onPrevious={playPreviousTrack}
          volume={volume}
          onVolumeChange={handleVolumeChange}
        />
      )}

      {/* Lyrics Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-[400px] bg-black/90 backdrop-blur-md border-l border-gray-800 transform transition-transform duration-300 ease-in-out ${
          showLyrics ? 'translate-x-0' : 'translate-x-full'
        } hidden md:block`}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-medium text-lg">Lyrics</h2>
            <button 
              onClick={() => setShowLyrics(false)}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <FaTimes />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {lyrics.map((line, index) => (
                <div 
                  key={index}
                  className={`transition-colors duration-300 ${
                    index === currentLyricIndex 
                      ? 'text-green-500 font-medium' 
                      : 'text-gray-400'
                  }`}
                >
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Music Player */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-gray-800 p-2 sm:p-4">
        <div className="max-w-7xl mx-auto">
          {/* Progress Bar */}
          <div className="relative h-1 bg-gray-800 rounded-full mb-2 sm:mb-4">
            <div 
              className="absolute h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
            {isIOS ? (
              <>
                {/* iOS Layout */}
                <div 
                  className="flex items-center justify-between w-full py-2 cursor-pointer"
                  onClick={() => setShowFullScreen(true)}
                >
                  <div className="flex items-center space-x-4 pl-4 sm:pl-6">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={currentTrack.coverArt}
                        alt={currentTrack.title}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        priority
                      />
                    </div>
                    <div className="min-w-0 max-w-[180px] sm:max-w-[200px]">
                      <MarqueeText 
                        text={currentTrack.title} 
                        className="text-white font-medium text-base sm:text-lg"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                      }}
                      className="text-gray-300 hover:text-white transition-all duration-300 transform active:scale-[0.95] relative p-2 rounded-full group"
                    >
                      <div className="absolute inset-0 bg-gray-500/0 group-active:bg-gray-500/25 rounded-full transition-all duration-300 ease-out"></div>
                      {isPlaying ? (
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform transition-transform duration-300 ease-out relative z-10">
                          <rect x="7" y="6" width="6" height="20" rx="2" fill="currentColor"/>
                          <rect x="19" y="6" width="6" height="20" rx="2" fill="currentColor"/>
                        </svg>
                      ) : (
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform transition-transform duration-300 ease-out relative z-10">
                          <path d="M9 6.5C8.44772 6.5 8 6.94772 8 7.5V24.5C8 25.0523 8.44772 25.5 9 25.5C9.3 25.5 9.58414 25.3782 9.78538 25.1769L23.7854 16.6769C24.0813 16.4783 24.25 16.1457 24.25 15.8C24.25 15.4543 24.0813 15.1217 23.7854 14.9231L9.78538 6.42308C9.58414 6.22179 9.3 6.1 9 6.5Z" fill="currentColor"/>
                        </svg>
                      )}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        playNextTrack();
                      }}
                      className="text-gray-300 hover:text-white transition-all duration-300 transform active:scale-[0.95] relative p-2 rounded-full group -ml-2"
                    >
                      <div className="absolute inset-0 bg-gray-500/0 group-active:bg-gray-500/25 rounded-full transition-all duration-300 ease-out"></div>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform transition-transform duration-300 ease-out relative z-10">
                        <path d="M8 8.5C8 7.94772 8.44772 7.5 9 7.5C9.3 7.5 9.58414 7.62179 9.78538 7.82308L16.7854 14.9231C17.0813 15.1217 17.25 15.4543 17.25 15.8C17.25 16.1457 17.0813 16.4783 16.7854 16.6769L9.78538 23.7769C9.58414 23.9782 9.3 24.1 9 24.1C8.44772 24.1 8 23.6523 8 23.1V8.5Z" fill="currentColor"/>
                        <path d="M17 8.5C17 7.94772 17.4477 7.5 18 7.5C18.3 7.5 18.5841 7.62179 18.7854 7.82308L25.7854 14.9231C26.0813 15.1217 26.25 15.4543 26.25 15.8C26.25 16.1457 26.0813 16.4783 25.7854 16.6769L18.7854 23.7769C18.5841 23.9782 18.3 24.1 18 24.1C17.4477 24.1 17 23.6523 17 23.1V8.5Z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Desktop Layout */}
                <div 
                  className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto max-w-[250px] sm:max-w-[300px] pl-4 sm:pl-6 cursor-pointer"
                  onClick={() => setShowFullScreen(true)}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={currentTrack.coverArt}
                      alt={currentTrack.title}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      priority
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <MarqueeText 
                      text={currentTrack.title} 
                      className="text-white font-medium text-sm sm:text-base"
                    />
                    {currentTrack.artist && (
                      <div className="text-gray-400 text-xs truncate">
                        {currentTrack.artist}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {currentTrack.lyricsUrl && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowLyrics(!showLyrics);
                        }}
                        className={`text-gray-400 hover:text-white transition-colors flex-shrink-0 ${showLyrics ? 'text-green-500' : ''}`}
                      >
                        <FaMusic size={16} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsLiked(!isLiked);
                      }}
                      className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                    >
                      {isLiked ? <FaHeart size={16} className="text-green-500" /> : <FaRegHeart size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center w-full sm:w-auto order-first sm:order-none">
                  <div className="flex items-center space-x-4 sm:space-x-6">
                    <button 
                      onClick={playPreviousTrack}
                      className="text-gray-300 hover:text-white transition-all duration-300 transform active:scale-[0.95] relative p-2 rounded-full group"
                    >
                      <div className="absolute inset-0 bg-gray-500/0 group-active:bg-gray-500/25 rounded-full transition-all duration-300 ease-out"></div>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform transition-transform duration-300 ease-out relative z-10">
                        <path d="M24 8.5C24 7.94772 23.5523 7.5 23 7.5C22.7 7.5 22.4159 7.62179 22.2146 7.82308L15.2146 14.9231C14.9187 15.1217 14.75 15.4543 14.75 15.8C14.75 16.1457 14.9187 16.4783 15.2146 16.6769L22.2146 23.7769C22.4159 23.9782 22.7 24.1 23 24.1C23.5523 24.1 24 23.6523 24 23.1V8.5Z" fill="currentColor"/>
                        <path d="M15 8.5C15 7.94772 14.5523 7.5 14 7.5C13.7 7.5 13.4159 7.62179 13.2146 7.82308L6.21462 14.9231C5.91874 15.1217 5.75 15.4543 5.75 15.8C5.75 16.1457 5.91874 16.4783 6.21462 16.6769L13.2146 23.7769C13.4159 23.9782 13.7 24.1 14 24.1C14.5523 24.1 15 23.6523 15 23.1V8.5Z" fill="currentColor"/>
                      </svg>
                    </button>
                    <button
                      onClick={togglePlay}
                      className="text-gray-300 hover:text-white transition-all duration-300 transform active:scale-[0.95] relative p-2 rounded-full group"
                    >
                      <div className="absolute inset-0 bg-gray-500/0 group-active:bg-gray-500/25 rounded-full transition-all duration-300 ease-out"></div>
                      {isPlaying ? (
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform transition-transform duration-300 ease-out relative z-10">
                          <rect x="7" y="6" width="6" height="20" rx="2" fill="currentColor"/>
                          <rect x="19" y="6" width="6" height="20" rx="2" fill="currentColor"/>
                        </svg>
                      ) : (
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform transition-transform duration-300 ease-out relative z-10">
                          <path d="M9 6.5C8.44772 6.5 8 6.94772 8 7.5V24.5C8 25.0523 8.44772 25.5 9 25.5C9.3 25.5 9.58414 25.3782 9.78538 25.1769L23.7854 16.6769C24.0813 16.4783 24.25 16.1457 24.25 15.8C24.25 15.4543 24.0813 15.1217 23.7854 14.9231L9.78538 6.42308C9.58414 6.22179 9.3 6.1 9 6.5Z" fill="currentColor"/>
                        </svg>
                      )}
                    </button>
                    <button 
                      onClick={playNextTrack}
                      className="text-gray-300 hover:text-white transition-all duration-300 transform active:scale-[0.95] relative p-2 rounded-full group"
                    >
                      <div className="absolute inset-0 bg-gray-500/0 group-active:bg-gray-500/25 rounded-full transition-all duration-300 ease-out"></div>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform transition-transform duration-300 ease-out relative z-10">
                        <path d="M8 8.5C8 7.94772 8.44772 7.5 9 7.5C9.3 7.5 9.58414 7.62179 9.78538 7.82308L16.7854 14.9231C17.0813 15.1217 17.25 15.4543 17.25 15.8C17.25 16.1457 17.0813 16.4783 16.7854 16.6769L9.78538 23.7769C9.58414 23.9782 9.3 24.1 9 24.1C8.44772 24.1 8 23.6523 8 23.1V8.5Z" fill="currentColor"/>
                        <path d="M17 8.5C17 7.94772 17.4477 7.5 18 7.5C18.3 7.5 18.5841 7.62179 18.7854 7.82308L25.7854 14.9231C26.0813 15.1217 26.25 15.4543 26.25 15.8C26.25 16.1457 26.0813 16.4783 25.7854 16.6769L18.7854 23.7769C18.5841 23.9782 18.3 24.1 18 24.1C17.4477 24.1 17 23.6523 17 23.1V8.5Z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 mt-1 sm:mt-2">
                    <span className="text-gray-400 text-xs">{formatTime(currentTime)}</span>
                    <span className="text-gray-400 text-xs">/</span>
                    <span className="text-gray-400 text-xs">{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-end">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                      onClick={toggleMute}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {isMuted ? <FaVolumeMute size={18} className="sm:w-5 sm:h-5" /> : <FaVolumeUp size={18} className="sm:w-5 sm:h-5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleInputVolumeChange}
                      className="w-16 sm:w-24 accent-green-500"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}