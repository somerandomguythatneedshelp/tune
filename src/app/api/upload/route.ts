import { NextResponse } from 'next/server';
import cloudinary from 'cloudinary';

// Check if required environment variables are set
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Track whether configuration is valid
const isConfigValid = cloudName && apiKey && apiSecret;

// Configure Cloudinary only if all required vars are present
if (isConfigValid) {
  cloudinary.v2.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
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

const tracks: Track[] = [];
const processedFiles = new Set<string>();
const uploadedFiles = new Map<string, any>();

function decodeFileName(str: string): string {
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

function formatTitle(str: string): string {
  if (!str) return '';
  return str
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\d+_/g, '')
    .trim();
}

async function checkIfUploaded(fileName: string, folderPath: string): Promise<any> {
  const key = `${folderPath}/${fileName}`;
  
  if (uploadedFiles.has(key)) {
    return uploadedFiles.get(key);
  }
  
  try {
    const result = await cloudinary.v2.api.resource(key, { resource_type: 'video' });
    uploadedFiles.set(key, result);
    return result;
  } catch (error) {
    return null;
  }
}

async function uploadFile(file: File, folderPath: string): Promise<{
  success: boolean;
  fileName: string;
  folderPath: string;
  result?: any;
  cached?: boolean;
  error?: string;
}> {
  const fileName = decodeFileName(file.name);
  const songName = fileName.replace('.m4a', '');
  
  try {
    const existingFile = await checkIfUploaded(fileName, folderPath);
    if (existingFile) {
      return { success: true, fileName, folderPath, result: existingFile, cached: true };
    }
    
    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.v2.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: folderPath,
          use_filename: true,
          unique_filename: false,
          overwrite: true,
        },
        (error: any, result: any) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(buffer);
    });
    
    const trackKey = `${folderPath}/${songName}`;
    if (!processedFiles.has(trackKey)) {
      processedFiles.add(trackKey);
      
      const track: Track = {
        id: trackKey.toLowerCase().replace(/\s+/g, '-'),
        title: formatTitle(songName),
        artist: formatTitle(folderPath.split('/')[0] || 'Unknown'),
        album: formatTitle(folderPath.split('/')[1] || 'Unknown'),
        audioUrl: (result as any).secure_url,
        coverArt: `/music/${folderPath}/${songName}.jpg`,
        lyricsUrl: `/music/${folderPath}/${songName}.lrc`
      };
      
      tracks.push(track);
    }
    
    return { success: true, fileName, folderPath, result };
  } catch (error) {
    return { 
      success: false, 
      fileName, 
      folderPath, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function POST(request: Request) {
  // Check if configuration is valid before proceeding
  if (!isConfigValid) {
    return NextResponse.json({
      error: 'Cloudinary is not properly configured. Please check environment variables.',
      missingVars: {
        cloudName: !cloudName,
        apiKey: !apiKey,
        apiSecret: !apiSecret
      }
    }, { status: 500 });
  }
  
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    let successCount = 0;
    let failCount = 0;
    let cachedCount = 0;

    // Process files in batches
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const uploadPromises = batch.map(file => {
        // Extract artist and album from the file name or use defaults
        const fileName = file.name;
        const parts = fileName.split(' - ');
        const artist = parts.length > 1 ? parts[0] : 'Unknown';
        const album = 'Unknown';
        const folderPath = `${artist}/${album}`;
        
        return uploadFile(file, folderPath);
      });
      
      const results = await Promise.all(uploadPromises);
      
      for (const result of results) {
        if (result.cached) {
          cachedCount++;
        } else if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        successfulUploads: successCount,
        cachedFiles: cachedCount,
        failedUploads: failCount,
        totalTracks: tracks.length
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }, { status: 500 });
  }
} 