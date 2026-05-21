import { NextResponse } from 'next/server';
import { listAccounts, listLocations } from '@/lib/gbp';

// GET /api/locations
// Accepts: ?account=<accountName> for locations, otherwise returns accounts
// Requires: x-google-token header (access token from browser localStorage)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const accountName = searchParams.get('account');
  const token = request.headers.get('x-google-token');

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated. Please connect Google account in Settings.' }, { status: 401 });
  }

  try {
    if (token === 'demo-access-token') {
      if (accountName) {
        return NextResponse.json({
          locations: [{ name: 'locations/demo-location', title: 'Demo Handyman Business (gccsatx.com)' }]
        });
      } else {
        return NextResponse.json({
          accounts: [{ name: 'accounts/demo-account', accountName: 'Demo Account' }]
        });
      }
    }

    if (accountName) {
      const locations = await listLocations(accountName, token);
      return NextResponse.json({ locations });
    } else {
      const accounts = await listAccounts(token);
      return NextResponse.json({ accounts });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
