import React from 'react';

interface Props {
  missingVars?: string[];
  title?: string;
}

const EnvironmentError: React.FC<Props> = ({ 
  missingVars = ['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
  title = 'Environment Configuration Error'
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">{title}</h1>
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          Missing required environment variables
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>Make sure you have the following environment variables set:</p>
          <ul className="list-disc pl-5 mt-2">
            {missingVars.map(varName => (
              <li key={varName}>{varName}</li>
            ))}
          </ul>
          <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded">
            <h3 className="font-medium mb-2">How to fix this:</h3>
            <ol className="list-decimal pl-5">
              <li>Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in the project root</li>
              <li>Add the required environment variables with their values</li>
              <li>Restart your development server</li>
              <li>
                <a 
                  href="/CLOUDINARY_SETUP.md" 
                  className="text-blue-600 underline hover:text-blue-800"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  See detailed setup instructions
                </a>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentError; 