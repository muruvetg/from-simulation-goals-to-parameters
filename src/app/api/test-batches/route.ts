import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Debug: Log available Prisma models
console.log('Available Prisma models:', Object.keys(prisma));

// GET /api/test-batches - Get all test batches
export async function GET() {
  try {
    const testBatches = await prisma.testBatch.findMany({
      include: {
        runs: {
          orderBy: [
            { model: 'asc' },
            { prompt: 'asc' },
            { iteration: 'asc' }
          ]
        },
        _count: {
          select: { runs: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(testBatches);
  } catch (error) {
    console.error('Error fetching test batches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test batches' },
      { status: 500 }
    );
  }
}

// POST /api/test-batches - Create new test batch
export async function POST(request: NextRequest) {
  let body: any = null;

  try {
    body = await request.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));

    const { name, testMessage, groundTruth, runs } = body;

    // Validate required fields
    if (!name || !testMessage) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'name and testMessage are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(runs)) {
      return NextResponse.json(
        { error: 'Invalid runs data', details: 'runs must be an array' },
        { status: 400 }
      );
    }

    // Create test batch with runs
    const testBatch = await prisma.testBatch.create({
      data: {
        name: name.toString(),
        testMessage: testMessage.toString(),
        groundTruth: groundTruth ? groundTruth.toString() : null,
        runs: runs.length > 0 ? {
          create: runs.map((run: any) => ({
            sessionId: run.sessionId ? run.sessionId.toString() : null,
            model: run.model ? run.model.toString() : 'unknown',
            prompt: run.prompt ? run.prompt.toString() : 'unknown',
            promptId: run.promptId ? run.promptId.toString() : 'unknown',
            iteration: typeof run.iteration === 'number' ? run.iteration : 1,
            status: run.status ? run.status.toString() : 'completed',
            startTime: run.startTime ? new Date(run.startTime) : null,
            endTime: run.endTime ? new Date(run.endTime) : null,
            error: run.error ? run.error.toString() : null,
            response: run.response ? run.response.toString() : null,
            groundTruthMatch: run.groundTruthMatch ? run.groundTruthMatch.toString() : null,
            notes: run.notes ? run.notes.toString() : null
          }))
        } : undefined
      },
      include: {
        runs: true,
        _count: {
          select: { runs: true }
        }
      }
    });

    console.log('Test batch created successfully:', testBatch.id);
    return NextResponse.json(testBatch);

  } catch (error) {
    console.error('Error creating test batch:', error);
    if (body) {
      console.error('Request body was:', JSON.stringify(body, null, 2));
    }

    return NextResponse.json(
      {
        error: 'Failed to create test batch',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}