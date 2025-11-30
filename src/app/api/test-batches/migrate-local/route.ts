import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/test-batches/migrate-local - Migrate localStorage test batches to database
export async function POST(request: NextRequest) {
  try {
    const { testBatches } = await request.json();

    if (!Array.isArray(testBatches) || testBatches.length === 0) {
      return NextResponse.json(
        { error: 'No test batches provided' },
        { status: 400 }
      );
    }

    const migratedBatches = [];

    for (const batch of testBatches) {
      try {
        const migratedBatch = await prisma.testBatch.create({
          data: {
            name: batch.name || 'Migrated Test',
            testMessage: batch.testMessage || '',
            groundTruth: batch.groundTruth || null,
            createdAt: batch.createdAt ? new Date(batch.createdAt) : new Date(),
            runs: {
              create: batch.runs?.map((run: any) => ({
                sessionId: run.sessionId || null,
                model: run.model || 'unknown',
                prompt: run.prompt || 'unknown',
                promptId: run.promptId || 'unknown',
                iteration: run.iteration || 1,
                status: run.status || 'completed',
                startTime: run.startTime ? new Date(run.startTime) : null,
                endTime: run.endTime ? new Date(run.endTime) : null,
                error: run.error || null,
                response: run.response || null,
                groundTruthMatch: run.groundTruthMatch || null,
                notes: run.notes || null
              })) || []
            }
          },
          include: {
            runs: true,
            _count: {
              select: { runs: true }
            }
          }
        });

        migratedBatches.push(migratedBatch);
      } catch (batchError) {
        console.error(`Failed to migrate batch ${batch.id}:`, batchError);
        // Continue with other batches even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      migratedCount: migratedBatches.length,
      totalCount: testBatches.length,
      batches: migratedBatches
    });

  } catch (error) {
    console.error('Error migrating test batches:', error);
    return NextResponse.json(
      { error: 'Failed to migrate test batches' },
      { status: 500 }
    );
  }
}