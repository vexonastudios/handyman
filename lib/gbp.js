import { google } from 'googleapis';

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

// Refresh an access token from a stored refresh token
// Returns { access_token, expiry_date }
export async function refreshAccessToken(refreshToken) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

// List all GBP accounts for the authenticated user
// accessToken is passed directly (from browser localStorage via API request)
export async function listAccounts(accessToken) {
  const response = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`GBP accounts error: ${response.status} ${response.statusText}`);
  const data = await response.json();
  return data.accounts || [];
}

// List all locations for a GBP account
export async function listLocations(accountName, accessToken) {
  const response = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) throw new Error(`GBP locations error: ${response.status} ${response.statusText}`);
  const data = await response.json();
  return data.locations || [];
}

// Publish a photo post to GBP
// accessToken can be a fresh one — obtained by calling refreshAccessToken(refreshToken) first
export async function publishPost({ description, imagePath, locationName, accessToken }) {
  if (!locationName) throw new Error('No GBP location configured. Please set it in Settings.');
  if (!accessToken) throw new Error('Not authenticated. Please connect your Google account in Settings.');

  // Step 1: Initiate media upload
  const { default: fs } = await import('fs');
  const imageBuffer = fs.readFileSync(imagePath);

  const initiateRes = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/media:startUpload`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
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
        Authorization: `Bearer ${accessToken}`,
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
        Authorization: `Bearer ${accessToken}`,
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
