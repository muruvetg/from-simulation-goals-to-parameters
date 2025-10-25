import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PromptConfig } from '@/lib/prompts';
import { DataLoader } from '@/lib/data-loader';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, messages = [], model = "gpt-3.5-turbo" } = await request.json();

    // Load static data
    const csvData = DataLoader.loadParametersToGoalsTable();
    const staticData = 'Parameters to Goals Table (CSV):\n' + csvData;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: PromptConfig.buildConversationMessages([...messages, { role: 'user', content: message }], staticData),
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return NextResponse.json({ response });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from OpenAI' },
      { status: 500 }
    );
  }
}