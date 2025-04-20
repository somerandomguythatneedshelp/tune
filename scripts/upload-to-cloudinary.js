require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Log configuration (for debugging)
console.log('Cloudinary Configuration:');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'Not set');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'Not set');
console.log('\n');

const MUSIC_DIR = path.join(process.cwd(), 'public', 'music');
const CONCURRENT_UPLOADS = 10;
const tracks = [];
const processedFiles = new Set();
const uploadedFiles = new Map();

// Progress tracking
let totalFiles = 0;
let processedCount = 0;
let lastProgressUpdate = Date.now();

function updateProgress() {
  const now = Date.now();
  if (now - lastProgressUpdate > 1000) {
    const percent = Math.round((processedCount / totalFiles) * 100);
    process.stdout.write(`\rProgress: ${percent}% (${processedCount}/${totalFiles})`);
    lastProgressUpdate = now;
  }
}

function decodeFileName(str) {
  return str
    .replace(/%20/g, ' ')
    .replace(/%27/g, "'")
    .replace(/%3F/g, '?')
    .replace(/%21/g, '!')
    .replace(/%2C/g, ',')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%5B/g, '[')
    .replace(/%5D/g, ']')
    .replace(/%7B/g, '{')
    .replace(/%7D/g, '}')
    .replace(/%3A/g, ':')
    .replace(/%40/g, '@')
    .replace(/%23/g, '#')
    .replace(/%24/g, '$')
    .replace(/%25/g, '%')
    .replace(/%5E/g, '^')
    .replace(/%26/g, '&')
    .replace(/%2A/g, '*')
    .replace(/%2B/g, '+')
    .replace(/%3D/g, '=');
}

function formatTitle(str) {
  if (!str) return '';
  return str
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\d+_/g, '')
    .trim();
}

async function checkIfUploaded(filePath, folderPath) {
  const fileName = path.basename(filePath);
  const key = `${folderPath}/${fileName}`;
  
  if (uploadedFiles.has(key)) {
    return uploadedFiles.get(key);
  }
  
  try {
    const result = await cloudinary.api.resource(key, { resource_type: 'video' });
    uploadedFiles.set(key, result);
    return result;
  } catch (error) {
    return null;
  }
}

async function uploadFile(filePath) {
  const relativePath = path.relative(MUSIC_DIR, filePath);
  const fileName = path.basename(filePath);
  const folderPath = path.dirname(relativePath).replace(/\\/g, '/');
  const decodedFileName = decodeFileName(fileName);
  
  try {
    // Check if file is already uploaded
    const existingFile = await checkIfUploaded(filePath, folderPath);
    if (existingFile) {
      return { success: true, fileName: decodedFileName, folderPath, result: existingFile, cached: true };
    }
    
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: folderPath,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    });
    
    // Add track to tracks array
    const pathParts = folderPath.split('/');
    if (pathParts.length >= 2) {
      const [artist, album] = pathParts;
      const songName = decodedFileName.replace('.m4a', '');
      
      const trackKey = `${artist}/${album}/${songName}`;
      if (!processedFiles.has(trackKey)) {
        processedFiles.add(trackKey);
        
        // Find cover art and lyrics files in the public folder
        const coverArtPath = path.join(MUSIC_DIR, folderPath, `${songName}.jpg`);
        const lyricsPath = path.join(MUSIC_DIR, folderPath, `${songName}.lrc`);
        
        const track = {
          id: `${artist}-${album}-${songName}`.toLowerCase().replace(/\s+/g, '-'),
          title: formatTitle(songName),
          artist: formatTitle(artist),
          album: formatTitle(album),
          audioUrl: result.secure_url,
          coverArt: fs.existsSync(coverArtPath) 
            ? `/music/${folderPath}/${songName}.jpg`
            : `/music/${folderPath}/${songName}.png`,
          lyricsUrl: fs.existsSync(lyricsPath)
            ? `/music/${folderPath}/${songName}.lrc`
            : undefined
        };
        
        tracks.push(track);
      }
    }
    
    return { success: true, fileName: decodedFileName, folderPath, result };
  } catch (error) {
    return { success: false, fileName: decodedFileName, folderPath, error: error.message };
  }
}

async function processBatch(files) {
  const uploadPromises = files.map(file => uploadFile(file));
  return Promise.all(uploadPromises);
}

async function scanDirectory(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await scanDirectory(fullPath));
    } else if (path.extname(entry.name).toLowerCase() === '.m4a') {
      // Only add audio files
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  if (!fs.existsSync(MUSIC_DIR)) {
    console.error('Music directory not found');
    process.exit(1);
  }

  console.log('Scanning for audio files...');
  const audioFiles = await scanDirectory(MUSIC_DIR);
  totalFiles = audioFiles.length;
  console.log(`Found ${totalFiles} audio files to process\n`);

  let successCount = 0;
  let failCount = 0;
  let cachedCount = 0;

  // Process files in batches
  for (let i = 0; i < audioFiles.length; i += CONCURRENT_UPLOADS) {
    const batch = audioFiles.slice(i, i + CONCURRENT_UPLOADS);
    const results = await processBatch(batch);
    
    for (const result of results) {
      processedCount++;
      updateProgress();
      
      if (result.cached) {
        cachedCount++;
      } else if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }
  }

  // Save tracks to JSON
  const outputPath = path.join(process.cwd(), 'src', 'data', 'tracks.json');
  fs.writeFileSync(outputPath, JSON.stringify(tracks, null, 2));

  console.log('\n\nSummary:');
  console.log(`✅ Successful uploads: ${successCount}`);
  console.log(`💾 Cached files: ${cachedCount}`);
  console.log(`❌ Failed uploads: ${failCount}`);
  console.log(`🎵 Generated ${tracks.length} tracks in tracks.json`);
}

main().catch(console.error); 