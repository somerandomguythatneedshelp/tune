import { useState, useEffect } from 'react';
import { FaPlay, FaHeart, FaChevronRight, FaCheck, FaMusic } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { getAllTracks } from '@/utils/audioUtils';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<number>(1);
  const [artists, setArtists] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadArtists = async () => {
      try {
        setIsLoading(true);
        const allTracks = await getAllTracks();
        const uniqueArtists = Array.from(new Set(allTracks.map(track => track.artist)));
        setArtists(uniqueArtists);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading artists:', error);
        setIsLoading(false);
      }
    };

    loadArtists();
  }, []);

  const completeOnboarding = () => {
    // Set cookie with expiration in 365 days
    Cookies.set('hasCompletedOnboarding', 'true', { expires: 365 });
    // Store selected artists in local storage for potential future use
    localStorage.setItem('followedArtists', JSON.stringify(Array.from(selectedArtists)));
    onComplete();
  };

  const toggleArtistSelection = (artist: string) => {
    setSelectedArtists(prev => {
      const updated = new Set(prev);
      if (updated.has(artist)) {
        updated.delete(artist);
      } else {
        updated.add(artist);
      }
      return updated;
    });
  };

  // Onboarding screens content
  const renderContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-purple-600 flex items-center justify-center mx-auto mb-8">
              <div className="text-3xl font-bold">tune</div>
            </div>
            <h1 className="text-4xl font-bold mb-4">Welcome to tune</h1>
            <p className="text-gray-300 text-lg mb-8">
              Your new favorite music experience. Discover, stream, and save the best music for your moments.
            </p>
            <button 
              onClick={() => setStep(2)}
              className="bg-green-500 hover:bg-green-400 text-black font-semibold py-3 px-8 rounded-full flex items-center mx-auto transition-all transform hover:scale-105"
            >
              Get Started <FaChevronRight className="ml-2" />
            </button>
          </motion.div>
        );
      
      case 2:
        return (
          <motion.div 
            key="features"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg mx-auto"
          >
            <h2 className="text-3xl font-bold text-center mb-8">Discover the Experience</h2>
            
            <div className="space-y-6 mb-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaPlay className="text-green-500" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Unlimited Streaming</h3>
                  <p className="text-gray-300">Stream high-quality music without interruptions. Perfect for any mood or moment.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaHeart className="text-purple-500" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Personalized Playlists</h3>
                  <p className="text-gray-300">Create and save custom playlists to match your unique taste and style.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Offline Listening</h3>
                  <p className="text-gray-300">Download your favorite tracks to listen when you're offline or on the go.</p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4 justify-center">
              <button 
                onClick={() => setStep(1)}
                className="text-white border border-white/30 py-3 px-6 rounded-full hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button 
                onClick={() => setStep(3)}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold py-3 px-8 rounded-full transition-all transform hover:scale-105"
              >
                Continue <FaChevronRight className="ml-2 inline" />
              </button>
            </div>
          </motion.div>
        );
      
      case 3:
        return (
          <motion.div 
            key="follow-creators"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-center mb-2">Follow Your Creators</h2>
            <p className="text-gray-300 text-center mb-8">
              Choose your favorite artists to personalize your experience. We'll create playlists and recommendations based on your selections.
            </p>
            
            {isLoading ? (
              <div className="text-center py-10">
                <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading artists...</p>
              </div>
            ) : artists.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400">No artists found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8 max-h-[400px] overflow-y-auto p-2">
                {artists.map((artist) => (
                  <div 
                    key={artist}
                    onClick={() => toggleArtistSelection(artist)}
                    className={`relative bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-all ${
                      selectedArtists.has(artist) ? 'ring-2 ring-green-500' : ''
                    }`}
                  >
                    <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-800">
                      <Image 
                        src={`/music/${artist}/ArtistCover.png`}
                        alt={`${artist} cover`}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/Cover.jpg';
                        }}
                      />
                      {selectedArtists.has(artist) && (
                        <div className="absolute top-2 right-2 bg-green-500 text-black p-1 rounded-full">
                          <FaCheck size={14} />
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-center">{artist}</h3>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center">
              <button 
                onClick={() => setStep(2)}
                className="text-white border border-white/30 py-3 px-6 rounded-full hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button 
                onClick={completeOnboarding}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold py-3 px-8 rounded-full transition-all transform hover:scale-105 flex items-center justify-center"
              >
                {selectedArtists.size > 0 ? 
                  <>Continue with {selectedArtists.size} followed</>
                  : 'Continue without following'}
              </button>
            </div>
            <p className="text-gray-500 text-xs text-center mt-4">
              You can always change your followed artists later from your profile
            </p>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-black overflow-hidden">
      <div className="absolute inset-0 bg-[url('/pattern.svg')] bg-repeat opacity-5"></div>
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-green-500/10 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-purple-500/10 to-transparent"></div>
      
      <div className="relative min-h-screen flex items-center justify-center px-4 py-20">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>
    </div>
  );
} 