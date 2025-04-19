export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverArt: string;
  audioUrl: string;
  lyricsUrl?: string;
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

// Function to get all tracks from the API
export const getAllTracks = async (): Promise<Track[]> => {
  try {
    const response = await fetch('/api/tracks');
    if (!response.ok) {
      throw new Error('Failed to fetch tracks');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return [];
  }
};

// Function to get a track by ID
export const getTrackById = async (id: string): Promise<Track | undefined> => {
  const tracks = await getAllTracks();
  return tracks.find(track => track.id === id);
};

// Function to get random tracks (for featured section)
export const getRandomTracks = async (count: number): Promise<Track[]> => {
  const tracks = await getAllTracks();
  const shuffled = [...tracks].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Function to get tracks by artist
export const getTracksByArtist = async (artist: string): Promise<Track[]> => {
  const tracks = await getAllTracks();
  return tracks.filter(track => track.artist === artist);
};

// Function to get tracks by album
export const getTracksByAlbum = async (album: string): Promise<Track[]> => {
  const tracks = await getAllTracks();
  return tracks.filter(track => track.album === album);
};

export function parseLRC(lrcContent: string): LyricLine[] {
  const lines = lrcContent.split('\n');
  const lyrics: LyricLine[] = [];

  lines.forEach(line => {
    // Match [mm:ss.xx] format
    const timeMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\]/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      const milliseconds = parseInt(timeMatch[3]);
      const timeInSeconds = minutes * 60 + seconds + milliseconds / 100;
      
      // Extract the text after the timestamp
      const text = line.replace(/\[\d{2}:\d{2}\.\d{2}\]/, '').trim();
      
      if (text) {
        lyrics.push({
          time: timeInSeconds,
          text
        });
      }
    }
  });

  // Sort lyrics by time
  return lyrics.sort((a, b) => a.time - b.time);
} 