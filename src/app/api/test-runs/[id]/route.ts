import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/test-runs/[id] - Update test run (mainly for evaluations)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const testRun = await prisma.testRun.update({
      where: { id },
      data: {
        sessionId: body.sessionId,
        status: body.status,
        startTime: body.startTime ? new Date(body.startTime) : null,
        endTime: body.endTime ? new Date(body.endTime) : null,
        error: body.error,
        response: body.response,
        groundTruthMatch: body.groundTruthMatch,
        notes: body.notes
      }
    });

    return NextResponse.json(testRun);
  } catch (error) {
    console.error('Error updating test run:', error);
    return NextResponse.json(
      { error: 'Failed to update test run' },
      { status: 500 }
    );
  }
}

// GET /api/test-runs/[id] - Get single test run
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const testRun = await prisma.testRun.findUnique({
      where: { id },
      include: {
        testBatch: true
      }
    });

    if (!testRun) {
      return NextResponse.json(
        { error: 'Test run not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(testRun);
  } catch (error) {
    console.error('Error fetching test run:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test run' },
      { status: 500 }
    );
  }
}