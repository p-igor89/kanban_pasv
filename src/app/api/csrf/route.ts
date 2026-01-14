/**
 * CSRF Token API
 * GET /api/csrf - Get or generate a CSRF token
 */

import { NextResponse } from 'next/server';
import { getCsrfToken, setCsrfToken } from '@/lib/security/csrf';

export async function GET() {
  try {
    // Check if token exists
    let token = await getCsrfToken();

    // Generate new token if none exists
    if (!token) {
      token = await setCsrfToken();
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    return NextResponse.json({ error: 'Failed to get CSRF token' }, { status: 500 });
  }
}
