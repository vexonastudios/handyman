import { google } from 'googleapis';
import { getSetting } from './db.js';
import fs from 'fs';

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + '/api/auth/google/callback'
  );
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/business.manage',
    ],
  });
}

async function getAuthenticatedClient() {
  const oauth2Client = getOAuth2Client();
  const refreshToken = getSetting('google_refresh_token');
  if (!refreshToken) throw new Error('Google account not connected. Please connect in Settings.');

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Auto-refresh access token
  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);
  return oauth2Client;
}

export async function listAccounts() {
  const auth = await getAuthenticatedClient();
  const response = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${(await auth.getAccessToken()).token}` },
  });
  if (!response.ok) throw new Error(`GBP accounts error: ${response.statusText}`);
  const data = await response.json();
  return data.accounts || [];
}

export async function listLocations(accountName) {
  const auth = await getAuthenticatedClient();
  const token = (await auth.getAccessToken()).token;
  const response = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(`GBP locations error: ${response.statusText}`);
  const data = await response.json();
  return data.locations || [];
}

export async function publishPost({ description, imagePath, locationName }) {
  const auth = await getAuthenticatedClient();
  const token = (await auth.getAccessToken()).token;

  if (!locationName) throw new Error('No GBP location configured. Please set it in Settings.');

  // Step 1: Initiate media upload
  const imageBuffer = fs.readFileSync(imagePath);
  const initiateRes = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/media:startUpload`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }
  );
  if (!initiateRes.ok) throw new Error(`Media initiate failed: ${initiateRes.statusText}`);
  const { resourceName } = await initiateRes.json();

  // Step 2: Upload image bytes
  const uploadRes = await fetch(
    `https://mybusiness.googleapis.com/upload/v1/${resourceName}?upload_type=media`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
        'X-Goog-Upload-Protocol': 'raw',
      },
      body: imageBuffer,
    }
  );
  if (!uploadRes.ok) throw new Error(`Media upload failed: ${uploadRes.statusText}`);

  // Step 3: Create local post with the uploaded media
  const postRes = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        languageCode: 'en-US',
        summary: description,
        topicType: 'STANDARD',
        media: [
          {
            mediaFormat: 'PHOTO',
            sourceUrl: '',
            name: resourceName,
          },
        ],
      }),
    }
  );
  if (!postRes.ok) {
    const errText = await postRes.text();
    throw new Error(`GBP post failed: ${postRes.statusText} — ${errText}`);
  }
  return await postRes.json();
}
