import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing genre id' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://hot.monochrome.tf/explore/genre/?id=${id}`, {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Musik/1.0',
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Genre API returned ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Genre API proxy failed:', error);
    return NextResponse.json({ error: 'Failed to fetch genre data' }, { status: 500 });
  }
}
