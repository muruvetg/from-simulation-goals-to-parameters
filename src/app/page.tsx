'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, ArrowUp } from 'lucide-react';

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
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input, messages, model: selectedModel }),
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto space-y-6">
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
        <div className="flex flex-col h-[70vh] max-h-[600px] min-h-[500px]">
          {/* Messages Area */}
          <Card className="flex-1 mb-4">
            <CardContent className="p-6 h-full overflow-y-auto">
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
          <Card>
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
        </div>
      </div>
    </div>
  );
}