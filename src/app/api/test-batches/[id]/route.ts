import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/test-batches/[id] - Get single test batch
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const testBatch = await prisma.testBatch.findUnique({
      where: { id },
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
      }
    });

    if (!testBatch) {
      return NextResponse.json(
        { error: 'Test batch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(testBatch);
  } catch (error) {
    console.error('Error fetching test batch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test batch' },
      { status: 500 }
    );
  }
}

// PUT /api/test-batches/[id] - Update test batch
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const testBatch = await prisma.testBatch.update({
      where: { id },
      data: {
        name: body.name,
        testMessage: body.testMessage,
        groundTruth: body.groundTruth,
      },
      include: {
        runs: true,
        _count: {
          select: { runs: true }
        }
      }
    });

    return NextResponse.json(testBatch);
  } catch (error) {
    console.error('Error updating test batch:', error);
    return NextResponse.json(
      { error: 'Failed to update test batch' },
      { status: 500 }
    );
  }
}

// DELETE /api/test-batches/[id] - Delete test batch
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.testBatch.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting test batch:', error);
    return NextResponse.json(
      { error: 'Failed to delete test batch' },
      { status: 500 }
    );
  }
}