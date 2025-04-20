const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const MUSIC_DIR = path.join(process.cwd(), 'public', 'music');

async function uploadFile(filePath, key) {
  const fileContent = fs.readFileSync(filePath);
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: getContentType(filePath),
    ACL: 'public-read'
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    console.log(`Successfully uploaded ${key}`);
  } catch (error) {
    console.error(`Error uploading ${key}:`, error);
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.m4a':
      return 'audio/mp4';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.lrc':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

async function uploadDirectory(dirPath, prefix = '') {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const key = path.join(prefix, entry.name);

    if (entry.isDirectory()) {
      await uploadDirectory(fullPath, key);
    } else {
      await uploadFile(fullPath, key);
    }
  }
}

async function main() {
  if (!fs.existsSync(MUSIC_DIR)) {
    console.error('Music directory not found');
    process.exit(1);
  }

  console.log('Starting music upload...');
  await uploadDirectory(MUSIC_DIR, 'music');
  console.log('Upload complete!');
}

main().catch(console.error); 