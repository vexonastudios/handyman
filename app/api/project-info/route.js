import { NextResponse } from 'next/server';

export async function GET() {
  // Return the client ID so the user can easily copy the project number
  return NextResponse.json({
    google_client_id: process.env.GOOGLE_CLIENT_ID || 'Not Configured'
  });
}
