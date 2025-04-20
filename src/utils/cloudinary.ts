import { CldImage } from 'next-cloudinary';

export const getCloudinaryUrl = (publicId: string, options: {
  width?: number;
  height?: number;
  crop?: string;
  quality?: number;
  format?: string;
} = {}) => {
  const { width, height, crop, quality, format } = options;
  const transformations = [];

  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);

  const transformationString = transformations.length > 0 ? transformations.join(',') : '';
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${transformationString}/${publicId}`;
};

export const getCloudinaryVideoUrl = (publicId: string, options: {
  width?: number;
  height?: number;
  crop?: string;
  quality?: number;
} = {}) => {
  const { width, height, crop, quality } = options;
  const transformations = [];

  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  if (quality) transformations.push(`q_${quality}`);

  const transformationString = transformations.length > 0 ? transformations.join(',') : '';
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/${transformationString}/${publicId}`;
};

export { CldImage }; 