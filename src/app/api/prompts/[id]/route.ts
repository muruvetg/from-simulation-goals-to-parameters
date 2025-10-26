import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

// PUT /api/prompts/[id] - Update prompt
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await request.json();

    // If activating this prompt, deactivate all others first
    if (body.isActive === true) {
      await prisma.prompt.updateMany({
        where: { NOT: { id } },
        data: { isActive: false },
      });
    }

    const updatedPrompt = await prisma.prompt.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(updatedPrompt);
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

// DELETE /api/prompts/[id] - Delete prompt
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    await prisma.prompt.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}

// GET /api/prompts/[id] - Get single prompt
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const prompt = await prisma.prompt.findUnique({
      where: { id },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(prompt);
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}