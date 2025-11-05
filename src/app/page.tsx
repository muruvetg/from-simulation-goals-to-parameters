'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, ArrowUp, Settings, PanelLeft } from 'lucide-react';
import { ChatSidebar } from '@/components/ChatSidebar';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Latest GPT-4 Omni model - Best performance' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Faster, cost-effective GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'High intelligence, lower cost' },
  { value: 'gpt-4', label: 'GPT-4', description: 'Original GPT-4 model' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and economical' },
  { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K', description: 'Extended context version' },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [refreshSessionsFn, setRefreshSessionsFn] = useState<(() => Promise<void>) | null>(null);


  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      const session = await response.json();

      if (session.messages) {
        setMessages(session.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })));
      }
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Create new session if none exists (first message)
      let sessionId = currentSessionId;
      if (!sessionId) {
        // Generate smart title from first message (limit to 50 chars)
        let sessionTitle = currentInput.slice(0, 50);
        if (currentInput.length > 50) {
          sessionTitle += '...';
        }

        const sessionResponse = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: sessionTitle }),
        });

        if (sessionResponse.ok) {
          const newSession = await sessionResponse.json();
          sessionId = newSession.id;
          setCurrentSessionId(sessionId);
          // Refresh sidebar sessions
          if (refreshSessionsFn) {
            await refreshSessionsFn();
          }
        } else {
          console.error('Failed to create session');
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          messages,
          model: selectedModel,
          sessionId
        }),
      });

      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ChatSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentSessionId={currentSessionId}
        onSessionSelect={loadSession}
        onNewChat={handleNewChat}
        onRefreshSessions={setRefreshSessionsFn}
      />

      <div className={cn(
        "min-h-screen bg-background transition-all duration-300",
        sidebarOpen ? "lg:ml-72" : "ml-0"
      )}>
        <div className="flex items-center justify-center p-4 pb-8 min-h-screen">
          <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="gap-2"
              >
                <PanelLeft className="h-4 w-4" />
                {sidebarOpen ? 'Hide' : 'Show'} History
              </Button>

              <Link href="/prompts">
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Manage Prompts
                </Button>
              </Link>
            </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Simulation Goal to Parameters
          </h1>
          <p className="text-muted-foreground text-lg">
            Transform your business goals into actionable simulation parameters
          </p>
        </div>

        {/* Chat Container */}
        <div className="flex flex-col h-[70vh] max-h-[600px] min-h-[500px] mb-8">
          {/* Messages Area */}
          <Card className="flex-1 mb-4">
            <CardContent className="p-6 h-full overflow-y-auto pb-16">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3">
                    <div className="text-muted-foreground text-lg">
                      💡 Ready to optimize your processes?
                    </div>
                    <div className="text-muted-foreground">
                      Enter your business simulation goal below to get started
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <Card
                        className={`p-4 max-w-[75%] ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-xs font-semibold mb-2 opacity-70">
                          {message.role === 'user' ? 'You' : 'Assistant'}
                        </div>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </Card>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <Card className="bg-muted max-w-[75%] p-4">
                        <div className="text-xs font-semibold mb-2 opacity-70">Assistant</div>
                        <div className="text-muted-foreground flex items-center gap-2">
                          <div className="animate-pulse">●</div>
                          <div className="animate-pulse">●</div>
                          <div className="animate-pulse">●</div>
                          <span>Analyzing your goal...</span>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Input Area */}
          <Card className="mb-16">
            <CardContent className="p-0">
              <div className="border rounded-md">
                {/* Main Input Area */}
                <form onSubmit={handleSubmit}>
                  <div className="relative">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Describe your business process and what you'd like to improve..."
                      className="min-h-16 resize-none border-0 focus-visible:ring-0 shadow-none px-3 py-3"
                      disabled={isLoading}
                    />

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between px-3 py-2 border-t">
                      <div className="flex items-center gap-1">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                          <SelectTrigger className="w-auto border-0 shadow-none h-8 px-2 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MODELS.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{model.label}</span>
                                  <span className="text-xs text-muted-foreground">{model.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        {isLoading ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-16 opacity-0"></Card>
        </div>
      </div>
    </div>
    </div>
    </>
  );
}