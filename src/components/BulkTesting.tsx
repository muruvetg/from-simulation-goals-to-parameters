'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  FlaskConical,
  Play,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Prompt {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
}

interface TestRun {
  id: string;
  sessionId: string;
  model: string;
  prompt: string;
  promptId: string;
  iteration: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

interface BulkTestingProps {
  isOpen: boolean;
  onToggle: () => void;
  onSessionSelect: (sessionId: string) => void;
  refreshSessionsFn: (() => Promise<void>) | null;
  currentInput: string;
}

const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K' },
];

export function BulkTesting({
  isOpen,
  onToggle,
  onSessionSelect,
  refreshSessionsFn,
  currentInput
}: BulkTestingProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>(['gpt-4o-mini']);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [iterations, setIterations] = useState(10);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testName, setTestName] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPrompts();
    }
  }, [isOpen]);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      setPrompts(data);

      // Auto-select active prompt
      const activePrompt = data.find((p: Prompt) => p.isActive);
      if (activePrompt && !selectedPrompts.includes(activePrompt.id)) {
        setSelectedPrompts([activePrompt.id]);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    }
  };

  const handleModelToggle = (modelValue: string) => {
    setSelectedModels(prev =>
      prev.includes(modelValue)
        ? prev.filter(m => m !== modelValue)
        : [...prev, modelValue]
    );
  };

  const handlePromptToggle = (promptId: string) => {
    setSelectedPrompts(prev =>
      prev.includes(promptId)
        ? prev.filter(p => p !== promptId)
        : [...prev, promptId]
    );
  };

  const runBulkTest = async () => {
    if (!currentInput.trim() || selectedModels.length === 0 || selectedPrompts.length === 0) {
      return;
    }

    setIsRunning(true);

    // Generate test runs
    const runs: TestRun[] = [];
    let runId = 0;

    for (const modelValue of selectedModels) {
      for (const promptId of selectedPrompts) {
        const prompt = prompts.find(p => p.id === promptId);
        for (let i = 1; i <= iterations; i++) {
          runs.push({
            id: `run-${++runId}`,
            sessionId: '',
            model: modelValue,
            prompt: prompt?.title || 'Unknown Prompt',
            promptId,
            iteration: i,
            status: 'pending'
          });
        }
      }
    }

    setTestRuns(runs);

    // Execute tests in parallel with batching to avoid overwhelming the server
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < runs.length; i += batchSize) {
      batches.push(runs.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await Promise.all(batch.map(run => executeTestRun(run)));
      // Small delay between batches to be gentle on the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);

    // Refresh sessions to show new chats
    if (refreshSessionsFn) {
      await refreshSessionsFn();
    }
  };

  const executeTestRun = async (run: TestRun) => {
    try {
      // Update status to running
      setTestRuns(prev => prev.map(r =>
        r.id === run.id ? { ...r, status: 'running', startTime: new Date() } : r
      ));

      // Set the active prompt
      await fetch(`/api/prompts/${run.promptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });

      // Create session with descriptive name
      const sessionName = testName ?
        `${testName} - ${run.model} - ${run.prompt} #${run.iteration}` :
        `Test: ${run.model} - ${run.prompt} #${run.iteration}`;

      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: sessionName }),
      });

      if (!sessionResponse.ok) throw new Error('Failed to create session');

      const session = await sessionResponse.json();

      // Update run with session ID
      setTestRuns(prev => prev.map(r =>
        r.id === run.id ? { ...r, sessionId: session.id } : r
      ));

      // Send the message
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          messages: [],
          model: run.model,
          sessionId: session.id
        }),
      });

      if (!chatResponse.ok) throw new Error('Chat request failed');

      // Update status to completed
      setTestRuns(prev => prev.map(r =>
        r.id === run.id ? {
          ...r,
          status: 'completed',
          endTime: new Date()
        } : r
      ));

    } catch (error) {
      console.error(`Test run ${run.id} failed:`, error);
      setTestRuns(prev => prev.map(r =>
        r.id === run.id ? {
          ...r,
          status: 'error',
          endTime: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        } : r
      ));
    }
  };

  const clearResults = () => {
    setTestRuns([]);
  };

  const getStatusIcon = (status: TestRun['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'running': return <RotateCcw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusCount = (status: TestRun['status']) => {
    return testRuns.filter(run => run.status === status).length;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            <CardTitle>Bulk Testing</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle}>×</Button>
        </CardHeader>

        <CardContent className="space-y-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {/* Test Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="testName">Test Name (optional)</Label>
              <Input
                id="testName"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g., Parameter Extraction Test"
              />
            </div>

            <div>
              <Label>Test Message</Label>
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {currentInput || "Enter a message in the main chat input to test"}
              </div>
            </div>

            <div>
              <Label>Models ({selectedModels.length} selected)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {MODELS.map((model) => (
                  <div key={model.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`model-${model.value}`}
                      checked={selectedModels.includes(model.value)}
                      onCheckedChange={() => handleModelToggle(model.value)}
                    />
                    <Label htmlFor={`model-${model.value}`} className="text-sm">
                      {model.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Prompts ({selectedPrompts.length} selected)</Label>
              <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                {prompts.map((prompt) => (
                  <div key={prompt.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`prompt-${prompt.id}`}
                      checked={selectedPrompts.includes(prompt.id)}
                      onCheckedChange={() => handlePromptToggle(prompt.id)}
                    />
                    <Label htmlFor={`prompt-${prompt.id}`} className="text-sm">
                      {prompt.title} {prompt.isActive && <Badge variant="secondary">Active</Badge>}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="iterations">Iterations per combination</Label>
              <Input
                id="iterations"
                type="number"
                min="1"
                max="50"
                value={iterations}
                onChange={(e) => setIterations(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Total tests: {selectedModels.length * selectedPrompts.length * iterations}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearResults}
                  disabled={isRunning || testRuns.length === 0}
                >
                  Clear Results
                </Button>
                <Button
                  onClick={runBulkTest}
                  disabled={isRunning || !currentInput.trim() || selectedModels.length === 0 || selectedPrompts.length === 0}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isRunning ? 'Running Tests...' : 'Run Tests'}
                </Button>
              </div>
            </div>
          </div>

          {/* Test Results */}
          {testRuns.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Test Results</h3>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {getStatusCount('pending')} pending
                  </div>
                  <div className="flex items-center gap-1">
                    <RotateCcw className="h-4 w-4 text-blue-500" />
                    {getStatusCount('running')} running
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {getStatusCount('completed')} completed
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {getStatusCount('error')} failed
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {testRuns.map((run) => (
                  <Card
                    key={run.id}
                    className={cn(
                      "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      run.status === 'completed' && run.sessionId && "hover:border-green-300"
                    )}
                    onClick={() => {
                      if (run.sessionId && run.status === 'completed') {
                        onSessionSelect(run.sessionId);
                        onToggle(); // Close the bulk testing modal
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(run.status)}
                        <span className="text-sm font-medium">
                          {run.model} - {run.prompt} #{run.iteration}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {run.startTime && run.endTime && (
                          <>
                            {Math.round((run.endTime.getTime() - run.startTime.getTime()) / 1000)}s
                          </>
                        )}
                        {run.error && (
                          <span className="text-red-500 ml-2">{run.error}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}