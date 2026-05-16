import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://hot.monochrome.tf/', {
      next: { revalidate: 3600 }, // Cache for 1 hour
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Musik/1.0',
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Hot API returned ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Hot API proxy failed:', error);
    return NextResponse.json({ error: 'Failed to fetch trending data' }, { status: 500 });
  }
}
