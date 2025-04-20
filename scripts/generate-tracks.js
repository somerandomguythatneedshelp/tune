require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function getResources(folder = '') {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'video',
      prefix: folder,
      max_results: 500
    });
    return result.resources;
  } catch (error) {
    console.error('Error fetching resources:', error);
    return [];
  }
}

async function getImageUrl(publicId) {
  try {
    return cloudinary.url(publicId, {
      secure: true
    });
  } catch (error) {
    console.error(`Error getting image URL for ${publicId}:`, error);
    return null;
  }
}

async function getLyricsUrl(publicId) {
  try {
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      secure: true
    });
  } catch (error) {
    console.error(`Error getting lyrics URL for ${publicId}:`, error);
    return null;
  }
}

function formatTitle(str) {
  if (!str) return '';
  return str
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\d+_/g, '') // Remove track numbers
    .trim();
}

async function generateTracks() {
  console.log('Fetching tracks from Cloudinary...');
  
  // Get all audio files
  const audioFiles = await getResources();
  
  const tracks = [];
  const processedFiles = new Set(); // To track processed files
  
  for (const audioFile of audioFiles) {
    try {
      // Extract path parts
      const pathParts = audioFile.public_id.split('/');
      
      // Skip if not in the correct structure (music/artist/album/song)
      if (pathParts.length < 3) {
        console.warn(`Skipping file with unexpected path structure: ${audioFile.public_id}`);
        continue;
      }
      
      // Remove 'music' prefix if present
      const relevantParts = pathParts[0] === 'music' ? pathParts.slice(1) : pathParts;
      
      // Extract artist, album, and song
      const [artist, album, ...songParts] = relevantParts;
      const songName = songParts.join('/').replace('.m4a', '');
      
      // Skip if we've already processed this song
      const trackKey = `${artist}/${album}/${songName}`;
      if (processedFiles.has(trackKey)) {
        continue;
      }
      processedFiles.add(trackKey);
      
      // Get the corresponding image and lyrics files
      const imagePublicId = relevantParts.join('/');
      const lyricsPublicId = relevantParts.join('/') + '.lrc';
      
      const track = {
        id: `${artist}-${album}-${songName}`.toLowerCase().replace(/\s+/g, '-'),
        title: formatTitle(songName),
        artist: formatTitle(artist),
        album: formatTitle(album),
        audioUrl: audioFile.secure_url,
        coverArt: await getImageUrl(imagePublicId),
        lyricsUrl: await getLyricsUrl(lyricsPublicId)
      };
      
      tracks.push(track);
      console.log(`Processed: ${track.title} by ${track.artist} (${track.album})`);
    } catch (error) {
      console.error(`Error processing ${audioFile.public_id}:`, error);
    }
  }
  
  // Save to tracks.json
  const outputPath = path.join(process.cwd(), 'src', 'data', 'tracks.json');
  fs.writeFileSync(outputPath, JSON.stringify(tracks, null, 2));
  
  console.log(`\nGenerated ${tracks.length} tracks`);
  console.log(`Saved to ${outputPath}`);
}

generateTracks().catch(console.error); 