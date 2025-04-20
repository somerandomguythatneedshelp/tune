'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Track, getAllTracks } from '@/utils/audioUtils';

interface AudioPlayerContextType {
    tracks: Track[];
    currentTrack: Track | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    isLoading: boolean;
    playTrack: (track: Track) => void;
    togglePlay: () => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    seek: (time: number) => void;
    playNext: () => void;
    playPrevious: () => void;
    setOnTimeUpdate: (onTimeUpdate: (currentTime: number) => void) => void;
    setOnEnded: (onEnded: () => void) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);


    const [onTimeUpdate, setOnTimeUpdate] = useState<(currentTime: number) => void>(() => { });
    const [onEnded, setOnEnded] = useState<() => void>(() => { });

    useEffect(() => {
        const loadTracks = async () => {
            try {
                const allTracks = await getAllTracks();
                setTracks(allTracks);
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading tracks:', error);
                setIsLoading(false);
            }
        };
        loadTracks();
    }, []);

    useEffect(() => {
        if (!currentTrack) return;

        if (!audioRef.current) {
            audioRef.current = new Audio(currentTrack.audioUrl);
            audioRef.current.volume = volume;
        } else {
            audioRef.current.src = currentTrack.audioUrl;
        }

        audioRef.current.addEventListener('ended', onEnded);
        audioRef.current.addEventListener('timeupdate', () => {
            onTimeUpdate(audioRef.current ? audioRef.current.currentTime : 0);
            setCurrentTime(audioRef.current ? audioRef.current.currentTime : 0);
        });

        if (isPlaying) {
            audioRef.current.play().catch((e) => console.error("Error playing audio:", e));
        } else {
            audioRef.current.pause();
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeEventListener('ended', onEnded);
                audioRef.current.removeEventListener('timeupdate', () => { });
            }
        };

    }, [currentTrack, isPlaying, volume, onTimeUpdate, onEnded]);


    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);


    const playTrack = (track: Track) => {
        if (currentTrack?.id === track.id) {
            togglePlay();
            return;
        }
        setCurrentTrack(track);
        setIsPlaying(true);

        if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
        }
    };

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch((e) => console.error("Error playing audio:", e));
            setIsPlaying(true);
        }
    };


    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
        }
    };

    const seek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const playNext = () => {
        if (!currentTrack || tracks.length === 0) return;
        const currentIndex = tracks.findIndex(track => track.id === currentTrack.id);
        const nextIndex = (currentIndex + 1) % tracks.length;
        playTrack(tracks[nextIndex]);
    };

    const playPrevious = () => {
        if (!currentTrack || tracks.length === 0) return;
        const currentIndex = tracks.findIndex(track => track.id === currentTrack.id);
        const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
        playTrack(tracks[prevIndex]);
    };

    return (
        <AudioPlayerContext.Provider
            value={{
                tracks,
                currentTrack,
                isPlaying,
                currentTime,
                duration,
                volume,
                isMuted,
                isLoading,
                playTrack,
                togglePlay,
                setVolume,
                toggleMute,
                seek,
                playNext,
                playPrevious,
                setOnTimeUpdate,
                setOnEnded
            }}
        >
            {children}
        </AudioPlayerContext.Provider>
    );
}

export function useAudioPlayer() {
    const context = useContext(AudioPlayerContext);
    if (context === undefined) {
        throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
    }
    return context;
}
