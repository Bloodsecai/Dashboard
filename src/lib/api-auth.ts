import { NextRequest, NextResponse } from 'next/server';

export interface ApiAuthResult {
  authenticated: boolean;
  error?: string;
}

export function validateApiKey(request: NextRequest): ApiAuthResult {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  const validApiKey = process.env.API_SECRET_KEY;

  if (!validApiKey) {
    console.error('API_SECRET_KEY not configured in environment variables');
    return { authenticated: false, error: 'Server configuration error' };
  }

  if (!apiKey) {
    return { authenticated: false, error: 'Missing API key. Provide x-api-key header or Bearer token.' };
  }

  if (apiKey !== validApiKey) {
    return { authenticated: false, error: 'Invalid API key' };
  }

  return { authenticated: true };
}

export function unauthorizedResponse(error: string): NextResponse {
  return NextResponse.json(
    { success: false, error },
    { status: 401 }
  );
}

export function errorResponse(error: string, status: number = 500): NextResponse {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}
