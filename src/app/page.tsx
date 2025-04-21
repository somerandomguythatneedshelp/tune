'use client';

import { useState, useEffect } from 'react';
import MusicPlayer from '@/components/MusicPlayer';
import Onboarding from '@/components/Onboarding';
import { Track, getAllTracks, getTracksByArtist, getTracksByAlbum } from '@/utils/audioUtils';
import Image from 'next/image';
import { FaPlay, FaPause, FaHeart, FaEllipsisH, FaClock } from 'react-icons/fa';
import Cookies from 'js-cookie';

export default function Home() {
  const [selectedTrack, setSelectedTrack] = useState<Track | undefined>();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'artist' | 'album'>('all');
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [artists, setArtists] = useState<string[]>([]);
  const [albums, setAlbums] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding before
    const hasOnboarded = Cookies.get('hasCompletedOnboarding');
    
    if (hasOnboarded) {
      setHasCompletedOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
  };

  useEffect(() => {
    const loadTracks = async () => {
      try {
        const allTracks = await getAllTracks();
        setTracks(allTracks);
        
        // Create featured tracks (random selection)
        const shuffled = [...allTracks].sort(() => 0.5 - Math.random());
        setFeaturedTracks(shuffled.slice(0, 5));
        
        // Create recently played (just using different tracks for demo)
        setRecentlyPlayed(shuffled.slice(5, 10));
        
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

    // Only load tracks if onboarding is complete
    if (hasCompletedOnboarding) {
      loadTracks();
    }
  }, [hasCompletedOnboarding]);

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

    // Only apply filtering if onboarding is complete
    if (hasCompletedOnboarding) {
      filterTracks();
    }
  }, [filter, selectedArtist, selectedAlbum, hasCompletedOnboarding]);

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
    setIsPlaying(true);
  };

  const handlePlayAllClick = (trackList: Track[]) => {
    if (trackList.length > 0) {
      setSelectedTrack(trackList[0]);
      setIsPlaying(true);
    }
  };

  // If onboarding is not complete, show the onboarding component
  if (!hasCompletedOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white overflow-x-hidden">
      {/* Sidebar visible on larger screens */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-black/90 z-20 border-r border-gray-800">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-green-500 mb-8">tune</h1>
          <nav className="space-y-6">
            <div>
              <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-4">Menu</h3>
              <ul className="space-y-3">
                <li className="text-white font-medium cursor-pointer hover:text-green-500 transition-colors">Home</li>
                <li className="text-gray-400 cursor-pointer hover:text-white transition-colors">Browse</li>
                <li className="text-gray-400 cursor-pointer hover:text-white transition-colors">Radio</li>
              </ul>
            </div>
            <div>
              <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-4">Library</h3>
              <ul className="space-y-3">
                <li className="text-gray-400 cursor-pointer hover:text-white transition-colors">Recent</li>
                <li className="text-gray-400 cursor-pointer hover:text-white transition-colors">Albums</li>
                <li className="text-gray-400 cursor-pointer hover:text-white transition-colors">Artists</li>
                <li className="text-gray-400 cursor-pointer hover:text-white transition-colors">Playlists</li>
              </ul>
            </div>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header with hero section */}
        <header className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-green-900/30 via-purple-900/20 to-black z-0"></div>
          <div className="relative z-10 pt-8 pb-20 px-6 md:px-10">
            <div className="flex justify-between items-center mb-10">
              <h1 className="text-3xl font-bold lg:hidden">tune</h1>
              <div className="flex items-center space-x-4">
                <button className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    // Reset onboarding to show sign in page again
                    Cookies.remove('hasCompletedOnboarding');
                    setHasCompletedOnboarding(false);
                  }}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors flex items-center space-x-2"
                >
                  <span className="hidden sm:inline text-sm font-medium">Sign In</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-6 md:space-y-0 md:space-x-8">
              {featuredTracks.length > 0 && (
                <div className="w-48 h-48 md:w-56 md:h-56 bg-gradient-to-br from-purple-600 to-green-400 shadow-xl rounded-md overflow-hidden flex-shrink-0">
                  <Image 
                    src={featuredTracks[0].coverArt || '/Cover.jpg'} 
                    alt="Featured" 
                    width={300} 
                    height={300} 
                    className="w-full h-full object-cover mix-blend-overlay"
                  />
                </div>
              )}
              <div>
                <div className="text-sm font-semibold uppercase tracking-wider">Featured Playlist</div>
                <h2 className="text-5xl md:text-6xl font-bold mt-2">Today's Hits</h2>
                <p className="text-gray-300 mt-2 md:mt-4">The most popular tracks right now</p>
                <div className="flex items-center mt-6 space-x-4">
                  <button 
                    onClick={() => handlePlayAllClick(featuredTracks)}
                    className="bg-green-500 hover:bg-green-400 text-black font-semibold py-3 px-8 rounded-full flex items-center transition-all transform hover:scale-105"
                  >
                    <FaPlay className="mr-2" /> Play All
                  </button>
                  <button className="text-white border border-white/30 py-3 px-6 rounded-full hover:bg-white/10 transition-colors">
                    Save to Library
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main sections with content */}
        <div className="px-6 md:px-10 pb-32">
          {/* Featured tracks section */}
          <section className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Featured Tracks</h2>
              <button className="text-gray-400 hover:text-white text-sm font-medium transition-colors">See All</button>
            </div>
            {isLoading ? (
              <div className="text-center py-10">
                <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading tracks...</p>
              </div>
            ) : featuredTracks.length === 0 ? (
              <div className="text-center text-gray-400 py-10">No tracks available</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {featuredTracks.map((track) => (
                  <div 
                    key={track.id}
                    onClick={() => handleTrackClick(track)}
                    className="bg-white/5 hover:bg-white/10 rounded-md p-3 group cursor-pointer transition-all"
                  >
                    <div className="relative aspect-square mb-3 rounded-md overflow-hidden bg-gray-800 shadow-lg">
                      <Image 
                        src={track.coverArt || '/Cover.jpg'} 
                        alt={`${track.title.slice(3)} cover`} 
                        width={300}
                        height={300}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/Cover.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                        <button className="bg-green-500 text-black p-3 rounded-full transform translate-y-4 group-hover:translate-y-0 shadow-lg transition-all duration-300">
                          <FaPlay size={18} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-medium text-sm text-white line-clamp-1">{track.title.slice(3)}</h3>
                    <p className="text-gray-400 text-xs mt-1 line-clamp-1">
                      {track.artist}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recently played section */}
          <section className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Recently Played</h2>
              <button className="text-gray-400 hover:text-white text-sm font-medium transition-colors">See All</button>
            </div>
            {isLoading ? (
              <div className="text-center py-10">
                <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading tracks...</p>
              </div>
            ) : recentlyPlayed.length === 0 ? (
              <div className="text-center text-gray-400 py-10">No recent tracks</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentlyPlayed.slice(0, 6).map((track) => (
                  <div 
                    key={track.id}
                    onClick={() => handleTrackClick(track)}
                    className="flex items-center bg-white/5 hover:bg-white/10 p-3 rounded-md group cursor-pointer transition-all"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-gray-800 mr-4">
                      <Image 
                        src={track.coverArt || '/Cover.jpg'} 
                        alt={`${track.title.slice(3)} cover`} 
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/Cover.jpg';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm text-white line-clamp-1">{track.title.slice(3)}</h3>
                      <p className="text-gray-400 text-xs mt-1 line-clamp-1">
                        {track.artist}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-white hover:text-green-500 p-2 transition-colors">
                        <FaPlay size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Artists section */}
          <section className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Popular Artists</h2>
              <button className="text-gray-400 hover:text-white text-sm font-medium transition-colors">See All</button>
            </div>
            {isLoading ? (
              <div className="text-center py-10">
                <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading artists...</p>
              </div>
            ) : artists.length === 0 ? (
              <div className="text-center text-gray-400 py-10">No artists available</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
                {artists.slice(0, 7).map((artist) => {
                  // Find first track by this artist to get cover art
                  const artistTrack = tracks.find(track => track.artist === artist);
                  
                  return (
                    <div 
                      key={artist}
                      onClick={() => {
                        setFilter('artist');
                        setSelectedArtist(artist);
                      }}
                      className="text-center group cursor-pointer"
                    >
                      <div className="relative mx-auto w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-800 mb-3 shadow-lg">
                        <Image 
                          src={artistTrack?.coverArt || '/Cover.jpg'} 
                          alt={artist} 
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/Cover.jpg';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                      <h3 className="font-medium text-sm line-clamp-1">{artist}</h3>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          
          {/* All Tracks section with filtering */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">All Tracks</h2>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    filter === 'all' ? 'bg-green-500 text-black' : 'bg-white/10 text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('artist')}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    filter === 'artist' ? 'bg-green-500 text-black' : 'bg-white/10 text-white'
                  }`}
                >
                  Artists
                </button>
                <button
                  onClick={() => setFilter('album')}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    filter === 'album' ? 'bg-green-500 text-black' : 'bg-white/10 text-white'
                  }`}
                >
                  Albums
                </button>
              </div>
            </div>

            {filter === 'artist' && (
              <select
                value={selectedArtist}
                onChange={(e) => setSelectedArtist(e.target.value)}
                className="mb-4 w-full sm:w-auto bg-white/10 text-white p-2 rounded-md text-sm"
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
                className="mb-4 w-full sm:w-auto bg-white/10 text-white p-2 rounded-md text-sm"
              >
                <option value="">Select Album</option>
                {albums.map(album => (
                  <option key={album} value={album}>{album}</option>
                ))}
              </select>
            )}

            {/* Track list */}
            {isLoading ? (
              <div className="text-center py-10">
                <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading tracks...</p>
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center text-gray-400 py-10">No tracks available</div>
            ) : (
              <div className="bg-white/5 rounded-lg overflow-hidden mt-4">
                {/* Table header */}
                <div className="grid grid-cols-[16px_1fr_1fr_auto] md:grid-cols-[16px_4fr_3fr_2fr_1fr] gap-4 px-4 py-3 border-b border-white/10 text-xs text-gray-400 font-medium">
                  <div>#</div>
                  <div>TITLE</div>
                  <div>ARTIST</div>
                  <div className="hidden md:block">ALBUM</div>
                  <div className="flex justify-end">
                    <FaClock />
                  </div>
                </div>

                {/* Table rows */}
                <div className="divide-y divide-white/5">
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      onClick={() => handleTrackClick(track)}
                      className={`grid grid-cols-[16px_1fr_1fr_auto] md:grid-cols-[16px_4fr_3fr_2fr_1fr] gap-4 px-4 py-3 items-center hover:bg-white/10 group cursor-pointer ${
                        selectedTrack?.id === track.id ? 'bg-white/10' : ''
                      }`}
                    >
                      <div className="text-gray-400 text-sm flex items-center justify-center">
                        <span className="group-hover:hidden">{index + 1}</span>
                        <span className="hidden group-hover:block">
                          {selectedTrack?.id === track.id && isPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
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
                          <div className={`font-medium text-sm line-clamp-1 ${selectedTrack?.id === track.id ? 'text-green-500' : 'text-white'}`}>
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
                        <span>3:42</span>
                        <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-colors">
                          <FaHeart size={14} />
                        </button>
                        <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-colors">
                          <FaEllipsisH size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Music Player */}
      <MusicPlayer 
        tracks={tracks}
        currentTrackIndex={selectedTrack ? tracks.findIndex(track => track.id === selectedTrack.id) : 0}
        onTrackChange={(index) => setSelectedTrack(tracks[index])}
      />
    </main>
  );
}
