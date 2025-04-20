'use client';

import { useState, useEffect } from 'react';
import { CldUploadWidget, CloudinaryUploadWidgetResults, CloudinaryUploadWidgetInfo, CloudinaryUploadWidgetError } from 'next-cloudinary';

interface UploadResult {
  info: CloudinaryUploadWidgetInfo;
}

export default function UploadPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadResult[]>([]);
  const [cloudName, setCloudName] = useState<string | null>(null);

  useEffect(() => {
    // Check for Cloudinary cloud name on client side
    const name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!name) {
      setError('Cloudinary cloud name is not configured. Please check your environment variables.');
    } else {
      setCloudName(name);
    }
  }, []);

  const handleUpload = async (results: UploadResult[]) => {
    try {
      const response = await fetch('/api/process-uploads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: results }),
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      const data = await response.json();
      setResult(data);
      setUploadedFiles(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Configuration Error</h1>
          <div className="p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>Make sure you have the following environment variables set:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</li>
              <li>CLOUDINARY_API_KEY</li>
              <li>CLOUDINARY_API_SECRET</li>
            </ul>
            <p className="mt-2">These can be added to your .env.local file or your deployment platform's environment variables.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!cloudName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Upload Music</h1>
        
        <CldUploadWidget
          uploadPreset="music_uploads"
          options={{
            sources: ['local'],
            resourceType: 'video',
            maxFiles: 10,
            clientAllowedFormats: ['m4a'],
            showAdvancedOptions: false,
            styles: {
              palette: {
                window: "#FFFFFF",
                sourceBg: "#FFFFFF",
                windowBorder: "#90a0b3",
                tabIcon: "#0078FF",
                inactiveTabIcon: "#69778A",
                menuIcons: "#5A616A",
                link: "#0078FF",
                action: "#FF620C",
                inProgress: "#0078FF",
                complete: "#20B832",
                error: "#EA2727",
                textDark: "#000000",
                textLight: "#FFFFFF"
              }
            }
          }}
          onSuccess={(results: CloudinaryUploadWidgetResults) => {
            if (Array.isArray(results)) {
              handleUpload(results as UploadResult[]);
            } else if (results && typeof results === 'object' && 'info' in results) {
              handleUpload([results as UploadResult]);
            }
          }}
          onError={(error: CloudinaryUploadWidgetError) => {
            if (error) {
              setError(typeof error === 'string' ? error : error.statusText || 'Upload failed');
            }
          }}
        >
          {({ open }: { open: () => void }) => (
            <button
              onClick={() => open()}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
            >
              Upload Audio Files
            </button>
          )}
        </CldUploadWidget>

        {result && (
          <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-md">
            <h2 className="font-bold mb-2">Upload Complete</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="mt-4">
            <h3 className="font-bold mb-2">Uploaded Files:</h3>
            <ul className="list-disc pl-5">
              {uploadedFiles.map((file, index) => (
                <li key={index} className="text-sm">
                  {file.info.original_filename}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 