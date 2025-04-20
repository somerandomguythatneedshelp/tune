import { NextResponse } from 'next/server';

interface UploadResult {
  info: {
    secure_url: string;
    public_id: string;
    original_filename: string;
  };
}

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  audioUrl: string;
  coverArt: string;
  lyricsUrl?: string;
}

function formatTitle(str: string): string {
  if (!str) return '';
  return str
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\d+_/g, '')
    .trim();
}

export async function POST(request: Request) {
  try {
    const { files } = await request.json();
    const tracks: Track[] = [];

    for (const file of files) {
      const fileName = file.info.original_filename.replace('.m4a', '');
      const parts = fileName.split(' - ');
      const artist = parts.length > 1 ? parts[0] : 'Unknown';
      const album = 'Unknown';
      const folderPath = `${artist}/${album}`;

      const track: Track = {
        id: `${artist}-${album}-${fileName}`.toLowerCase().replace(/\s+/g, '-'),
        title: formatTitle(fileName),
        artist: formatTitle(artist),
        album: formatTitle(album),
        audioUrl: file.info.secure_url,
        coverArt: `/music/${folderPath}/${fileName}.jpg`,
        lyricsUrl: `/music/${folderPath}/${fileName}.lrc`
      };

      tracks.push(track);
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalTracks: tracks.length,
        tracks
      }
    });
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Processing failed' 
    }, { status: 500 });
  }
} 