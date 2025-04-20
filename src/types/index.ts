export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  audioUrl: string;
  coverArt: string;
  lyricsUrl?: string;
  duration?: number;
}

export interface LyricLine {
  time: number;
  text: string;
} 