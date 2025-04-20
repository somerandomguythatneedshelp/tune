# Cloudinary Setup Instructions

This guide will help you set up Cloudinary for media uploads in this application.

## 1. Create a Cloudinary Account

1. Visit [Cloudinary's website](https://cloudinary.com/) and sign up for a free account if you don't already have one.
2. After signing up, you'll be directed to your Cloudinary dashboard.

## 2. Locate Your Cloudinary Credentials

In your Cloudinary dashboard:

1. Look for the "Account Details" section
2. Note down the following values:
   - **Cloud Name** - The unique name of your Cloudinary cloud
   - **API Key** - Your Cloudinary API key
   - **API Secret** - Your Cloudinary API secret

These values will be used as environment variables in your application.

## 3. Set Up Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Replace `your_cloud_name`, `your_api_key`, and `your_api_secret` with the values from your Cloudinary dashboard.

## 4. Restart Your Development Server

After setting up the environment variables, restart your development server for the changes to take effect:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

## 5. Test Uploads

Once your server is running again, the upload functionality should work properly. You can test it by:

1. Navigating to the upload page
2. Selecting a file to upload
3. Confirming that the file appears in your Cloudinary Media Library after the upload completes

## Troubleshooting

If you encounter issues:

- Double-check that all environment variables are correctly set in your `.env.local` file
- Ensure there are no typos in the variable names or values
- Verify that your Cloudinary account is active and in good standing
- Check the browser console and server logs for any error messages

## Additional Configuration

For advanced Cloudinary configuration options, you can add the following to your `.env.local` file:

```
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset  # Optional
CLOUDINARY_FOLDER=your_folder_name                       # Optional
```

These variables allow you to specify an upload preset with predefined settings and a specific folder for your uploads.

## Environment Variables Setup

To properly configure Cloudinary for this application, you need to set the following environment variables:

### Required Environment Variables

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### How to Set Up Environment Variables

#### Local Development

1. Create a file named `.env.local` in the root of your project
2. Add the following lines, replacing the values with your actual Cloudinary credentials:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

3. Restart your development server if it's already running

#### Vercel Deployment

1. Go to your project settings in the Vercel dashboard
2. Navigate to the "Environment Variables" section
3. Add each of the required variables:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Save your changes and redeploy your application

## Getting Cloudinary Credentials

If you don't have Cloudinary credentials yet:

1. Sign up for a free Cloudinary account at [cloudinary.com](https://cloudinary.com/users/register/free)
2. Once logged in, you can find your cloud name, API key, and API secret in the dashboard
3. Create an upload preset named `music_uploads` in your Cloudinary settings (Media Library → Settings → Upload)
4. Set the upload preset to "Unsigned" for client-side uploads

## Troubleshooting

If you're experiencing issues with Cloudinary configuration:

1. Ensure all three environment variables are set correctly
2. For Vercel deployments, check that the environment variables have been properly applied to your deployment
3. Verify that your Cloudinary account is active and the API credentials are valid
4. Make sure you have created the upload preset named `music_uploads` in your Cloudinary settings

## Important Notes

- The `NEXT_PUBLIC_` prefix is required for the cloud name because it's used in client-side code
- API key and secret should be kept secure and never exposed in client-side code
- For production, ensure your Cloudinary upload presets have proper security settings 