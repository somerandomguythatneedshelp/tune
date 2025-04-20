import React from 'react';
import EnvironmentError from './EnvironmentError';

const cloudinaryVars = [
  'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const MissingCloudinaryConfig: React.FC = () => {
  return (
    <EnvironmentError 
      title="Cloudinary Configuration Missing" 
      missingVars={cloudinaryVars} 
    />
  );
};

export default MissingCloudinaryConfig; 