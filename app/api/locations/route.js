import { NextResponse } from 'next/server';
import { listAccounts, listLocations } from '@/lib/gbp';
import { getSetting } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const accountName = searchParams.get('account');

  try {
    if (accountName) {
      const locations = await listLocations(accountName);
      return NextResponse.json({ locations });
    } else {
      const accounts = await listAccounts();
      return NextResponse.json({ accounts });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
