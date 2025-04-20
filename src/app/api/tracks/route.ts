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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const artist = searchParams.get('artist');
    const album = searchParams.get('album');

    // Path to tracks.json file
    const tracksFilePath = path.join(process.cwd(), 'src', 'data', 'tracks.json');
    
    // Check if tracks.json exists
    if (!fs.existsSync(tracksFilePath)) {
      return NextResponse.json({ error: 'Tracks data not found' }, { status: 404 });
    }

    // Read and parse tracks.json file
    const tracksData = fs.readFileSync(tracksFilePath, 'utf-8');
    let tracks: Track[] = JSON.parse(tracksData);
    
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