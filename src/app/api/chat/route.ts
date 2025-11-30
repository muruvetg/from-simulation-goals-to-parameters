import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PromptConfig } from '@/lib/prompts';
import { DataLoader } from '@/lib/data-loader';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, messages = [], model = "gpt-4o-mini", sessionId } = await request.json();

    // Load active prompt from database
    const activePrompt = await prisma.prompt.findFirst({
      where: { isActive: true }
    });

    if (!activePrompt) {
      return NextResponse.json(
        { error: 'No active prompt found. Please activate a prompt.' },
        { status: 400 }
      );
    }

    // Load static data
    const csvData = DataLoader.loadParametersToGoalsTable();
    // TODO: Re-enable SimulationParameters.csv when needed
    // const simulationParamsData = DataLoader.loadSimulationParametersTable();
    const staticData = 'Parameters to Goals Table (CSV):\n' + csvData;
    // + '\n\nSimulation Parameters Table (CSV):\n' + simulationParamsData;

    const conversationMessages = PromptConfig.buildConversationMessages([...messages, { role: 'user', content: message }], staticData, activePrompt.content);

    // Log the messages being sent to OpenAI for debugging
    console.log('=== OpenAI Messages ===');
    console.log('System Prompt:', conversationMessages[0].content);
    console.log('Total messages count:', conversationMessages.length);
    console.log('========================');

    const completion = await openai.chat.completions.create({
      model: model,
      messages: conversationMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

    // Save messages to database if sessionId is provided
    if (sessionId) {
      await prisma.message.createMany({
        data: [
          {
            role: 'user',
            content: message,
            model: model,
            chatSessionId: sessionId,
          },
          {
            role: 'assistant',
            content: response,
            model: model,
            chatSessionId: sessionId,
          }
        ]
      });

      // Check if this is the first message and update title if needed
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: { _count: { select: { messages: true } } }
      });

      // If this is the first user message and title is "New Chat", update it
      if (session && session._count.messages === 2 && session.title === 'New Chat') {
        let sessionTitle = message.slice(0, 50);
        if (message.length > 50) {
          sessionTitle += '...';
        }

        await prisma.chatSession.update({
          where: { id: sessionId },
          data: {
            title: sessionTitle,
            updatedAt: new Date()
          }
        });
      } else {
        // Just update timestamp
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() }
        });
      }
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from OpenAI' },
      { status: 500 }
    );
  }
}