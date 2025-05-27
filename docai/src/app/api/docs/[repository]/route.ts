// app/api/docs/[repository]/route.ts
import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ repository: string }> }
) {
  try {
    const { repository } = await params;
    const filePath = path.join(process.cwd(), 'public', repository, `${repository}.md`);
    
    console.log('Looking for file at:', filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
    return NextResponse.json(
      { error: 'Documentation not found' }, 
      { status: 404 }
    );
    }
    
    // Read and return file content
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('File found and read successfully');
    
    return new Response(content, {
      headers: {
        'Content-Type': 'text/markdown',
        'Cache-Control': 'no-cache', // Disable caching for development
      },
    });
  } catch (error) {
    console.error('Error reading documentation:', error);
    return NextResponse.json(
      { error: 'Error reading documentation' }, 
      { status: 500 }
    );
  }
}