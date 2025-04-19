import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverArt: string;
  audioUrl: string;
  lyricsUrl?: string;
}

function getCoverArtPath(dir: string, artist: string, album?: string): string {
  const defaultCover = '/default-cover.jpg';
  
  if (album) {
    // Check for album art in the album directory
    const albumPath = path.join(dir, artist, album);
    const albumArtFiles = ['cover.jpg', 'cover.png', 'album.jpg', 'album.png'];
    
    for (const artFile of albumArtFiles) {
      if (fs.existsSync(path.join(albumPath, artFile))) {
        return `/music/${artist}/${album}/${artFile}`;
      }
    }
  } else {
    // Check for artist art in the artist directory
    const artistPath = path.join(dir, artist);
    const artistArtFiles = ['artist.jpg', 'artist.png', 'cover.jpg', 'cover.png'];
    
    for (const artFile of artistArtFiles) {
      if (fs.existsSync(path.join(artistPath, artFile))) {
        return `/music/${artist}/${artFile}`;
      }
    }
  }
  
  return defaultCover;
}

function scanDirectory(dir: string): Track[] {
  const tracks: Track[] = [];
  let trackId = 1;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // First, find all artist directories
  const artistDirs = entries.filter(entry => entry.isDirectory());

  for (const artistDir of artistDirs) {
    const artistPath = path.join(dir, artistDir.name);
    const artistName = artistDir.name;

    // Scan artist directory for albums/songs
    const artistEntries = fs.readdirSync(artistPath, { withFileTypes: true });
    
    for (const entry of artistEntries) {
      if (entry.isDirectory()) {
        // This is an album directory
        const albumPath = path.join(artistPath, entry.name);
        const albumName = entry.name;
        
        // Scan album directory for tracks
        const albumEntries = fs.readdirSync(albumPath);
        const audioFiles = albumEntries.filter(file => file.endsWith('.m4a'));
        const lrcFiles = albumEntries.filter(file => file.endsWith('.lrc'));

        // Get cover art for the album
        const coverArt = getCoverArtPath(dir, artistName, albumName);

        // Create tracks for each audio file
        for (const audioFile of audioFiles) {
          const trackName = audioFile.replace('.m4a', '');
          // Remove first 3 characters from the track name
          const formattedTrackName = trackName.substring(3);
          const matchingLrc = lrcFiles.find(lrc => lrc.replace('.lrc', '') === trackName);

          tracks.push({
            id: (trackId++).toString(),
            title: formattedTrackName,
            artist: artistName,
            album: albumName,
            coverArt: coverArt,
            audioUrl: `/music/${artistName}/${albumName}/${audioFile}`,
            lyricsUrl: matchingLrc ? `/music/${artistName}/${albumName}/${matchingLrc}` : undefined
          });
        }
      } else if (entry.name.endsWith('.m4a')) {
        // This is a single track
        const trackName = entry.name.replace('.m4a', '');
        // Remove first 3 characters from the track name
        const formattedTrackName = trackName.substring(3);
        const matchingLrc = artistEntries.find(e => 
          e.name.endsWith('.lrc') && e.name.replace('.lrc', '') === trackName
        );

        // Get cover art for the artist
        const coverArt = getCoverArtPath(dir, artistName);

        tracks.push({
          id: (trackId++).toString(),
          title: formattedTrackName,
          artist: artistName,
          coverArt: coverArt,
          audioUrl: `/music/${artistName}/${entry.name}`,
          lyricsUrl: matchingLrc ? `/music/${artistName}/${matchingLrc.name}` : undefined
        });
      }
    }
  }

  return tracks;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const artist = searchParams.get('artist');
    const album = searchParams.get('album');

    const musicDir = path.join(process.cwd(), 'public', 'music');
    
    // Check if music directory exists
    if (!fs.existsSync(musicDir)) {
      return NextResponse.json({ error: 'Music directory not found' }, { status: 404 });
    }

    let tracks = scanDirectory(musicDir);
    
    // Filter tracks if artist or album is specified
    if (artist) {
      tracks = tracks.filter(track => track.artist === artist);
    }
    if (album) {
      tracks = tracks.filter(track => track.album === album);
    }
    
    if (tracks.length === 0) {
      return NextResponse.json({ error: 'No tracks found' }, { status: 404 });
    }

    return NextResponse.json(tracks);
  } catch (error) {
    console.error('Error in tracks API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 