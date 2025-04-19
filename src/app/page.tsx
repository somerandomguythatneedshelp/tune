'use client';

import { useState, useEffect } from 'react';
import MusicPlayer from '@/components/MusicPlayer';
import { Track, getAllTracks, getTracksByArtist, getTracksByAlbum } from '@/utils/audioUtils';
import Image from 'next/image';

export default function Home() {
  const [selectedTrack, setSelectedTrack] = useState<Track | undefined>();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'artist' | 'album'>('all');
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [artists, setArtists] = useState<string[]>([]);
  const [albums, setAlbums] = useState<string[]>([]);

  useEffect(() => {
    const loadTracks = async () => {
      try {
        const allTracks = await getAllTracks();
        setTracks(allTracks);
        
        // Extract unique artists and albums
        const uniqueArtists = Array.from(new Set(allTracks.map(track => track.artist)));
        const uniqueAlbums = Array.from(new Set(allTracks.map(track => track.album).filter(Boolean)));
        
        setArtists(uniqueArtists);
        setAlbums(uniqueAlbums as string[]);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading tracks:', error);
        setIsLoading(false);
      }
    };

    loadTracks();
  }, []);

  useEffect(() => {
    const filterTracks = async () => {
      try {
        let filteredTracks: Track[];
        if (filter === 'artist' && selectedArtist) {
          filteredTracks = await getTracksByArtist(selectedArtist);
        } else if (filter === 'album' && selectedAlbum) {
          filteredTracks = await getTracksByAlbum(selectedAlbum);
        } else {
          filteredTracks = await getAllTracks();
        }
        setTracks(filteredTracks);
      } catch (error) {
        console.error('Error filtering tracks:', error);
      }
    };

    filterTracks();
  }, [filter, selectedArtist, selectedAlbum]);

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
  };

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative h-[30vh] sm:h-[40vh] bg-gradient-to-b from-green-900/20 to-black">
        <div className="absolute inset-0 bg-[url('/placeholder-cover.jpg')] bg-cover bg-center opacity-20" />
        <div className="relative h-full flex items-end p-4 sm:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <h1 className="text-4xl sm:text-6xl font-bold mb-2 sm:mb-4">Music Library</h1>
            <p className="text-gray-300 text-base sm:text-xl max-w-2xl">
              Browse and play your favorite tracks with our modern music player.
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Tracks Grid */}
      <div className="max-w-7xl mx-auto p-4 sm:p-8 pb-32">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-full ${
              filter === 'all' ? 'bg-green-500 text-black' : 'bg-gray-800 text-white'
            }`}
          >
            All Tracks
          </button>
          <button
            onClick={() => setFilter('artist')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-full ${
              filter === 'artist' ? 'bg-green-500 text-black' : 'bg-gray-800 text-white'
            }`}
          >
            By Artist
          </button>
          <button
            onClick={() => setFilter('album')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-full ${
              filter === 'album' ? 'bg-green-500 text-black' : 'bg-gray-800 text-white'
            }`}
          >
            By Album
          </button>
        </div>

        {filter === 'artist' && (
          <select
            value={selectedArtist}
            onChange={(e) => setSelectedArtist(e.target.value)}
            className="mb-4 sm:mb-6 w-full sm:w-auto bg-gray-800 text-white p-2 rounded-md text-sm sm:text-base"
          >
            <option value="">Select Artist</option>
            {artists.map(artist => (
              <option key={artist} value={artist}>{artist}</option>
            ))}
          </select>
        )}

        {filter === 'album' && (
          <select
            value={selectedAlbum}
            onChange={(e) => setSelectedAlbum(e.target.value)}
            className="mb-4 sm:mb-6 w-full sm:w-auto bg-gray-800 text-white p-2 rounded-md text-sm sm:text-base"
          >
            <option value="">Select Album</option>
            {albums.map(album => (
              <option key={album} value={album}>{album}</option>
            ))}
          </select>
        )}

        {/* Tracks Grid */}
        {isLoading ? (
          <div className="text-center text-gray-400">Loading tracks...</div>
        ) : tracks.length === 0 ? (
          <div className="text-center text-gray-400">No tracks available</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {tracks.map((track) => (
              <div 
                key={track.id}
                onClick={() => handleTrackClick(track)}
                className="bg-gray-900/50 hover:bg-gray-800/50 transition-colors rounded-lg p-3 sm:p-4 group cursor-pointer"
              >
                <div className="relative aspect-square mb-3 sm:mb-4 rounded-md overflow-hidden bg-gray-800">
                  <Image 
                    src={track.coverArt} 
                    alt="Album cover" 
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/default-cover.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="bg-white text-black p-2 sm:p-3 rounded-full hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <h3 className="font-medium text-base sm:text-lg line-clamp-1">{track.title}</h3>
                <p className="text-gray-400 text-xs sm:text-sm line-clamp-1">
                  {track.artist}
                  {track.album && ` • ${track.album}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Music Player */}
      <MusicPlayer 
        tracks={tracks}
        currentTrackIndex={tracks.findIndex(track => track.id === selectedTrack?.id) || 0}
        onTrackChange={(index) => setSelectedTrack(tracks[index])}
      />
    </main>
  );
}
