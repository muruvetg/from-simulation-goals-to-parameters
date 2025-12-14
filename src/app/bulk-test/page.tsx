'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  FlaskConical,
  Play,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Download,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Minus,
  BarChart3,
  FileText,
  Copy,
  Database,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

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
  response?: string;
  groundTruthMatch?: 'good' | 'bad' | 'neutral' | null;
  notes?: string;
  parametersRecommended?: number;
  correctParameters?: number;
}

interface TestBatch {
  id: string;
  name: string;
  testMessage: string;
  groundTruth: string;
  createdAt: Date;
  runs: TestRun[];
}

const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K' },
];

export default function BulkTestPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>(['gpt-4o-mini']);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [iterations, setIterations] = useState(10);
  const [testMessage, setTestMessage] = useState('');
  const [groundTruth, setGroundTruth] = useState('');
  const [testName, setTestName] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  // Test management
  const [testBatches, setTestBatches] = useState<TestBatch[]>([]);
  const [currentBatch, setCurrentBatch] = useState<TestBatch | null>(null);
  const [viewMode, setViewMode] = useState<'setup' | 'analysis'>('setup');
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);

  useEffect(() => {
    fetchPrompts();
    loadTestBatches();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();

      // Ensure data is an array
      if (Array.isArray(data)) {
        setPrompts(data);

        const activePrompt = data.find((p: any) => p.isActive);
        if (activePrompt && !selectedPrompts.includes(activePrompt.id)) {
          setSelectedPrompts([activePrompt.id]);
        }
      } else {
        console.error('Expected array from API, got:', data);
        setPrompts([]);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
      setPrompts([]);
    }
  };

  const loadTestBatches = () => {
    const saved = localStorage.getItem('bulk-test-batches');
    if (saved) {
      const batches = JSON.parse(saved).map((b: any) => ({
        ...b,
        createdAt: new Date(b.createdAt),
        runs: b.runs.map((r: any) => ({
          ...r,
          startTime: r.startTime ? new Date(r.startTime) : undefined,
          endTime: r.endTime ? new Date(r.endTime) : undefined
        }))
      }));
      setTestBatches(batches);
    }
  };

  const saveTestBatches = (batches: TestBatch[]) => {
    localStorage.setItem('bulk-test-batches', JSON.stringify(batches));
    setTestBatches(batches);
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
    if (!testMessage.trim() || selectedModels.length === 0 || selectedPrompts.length === 0) {
      return;
    }

    setIsRunning(true);

    // Create new batch
    const batchId = Date.now().toString();
    const newBatch: TestBatch = {
      id: batchId,
      name: testName || `Test ${new Date().toLocaleString()}`,
      testMessage: testMessage.trim(),
      groundTruth: groundTruth.trim(),
      createdAt: new Date(),
      runs: []
    };

    // Generate test runs
    const runs: TestRun[] = [];
    let runId = 0;

    for (const modelValue of selectedModels) {
      for (const promptId of selectedPrompts) {
        const prompt = prompts.find(p => p.id === promptId);
        for (let i = 1; i <= iterations; i++) {
          runs.push({
            id: `${batchId}-run-${++runId}`,
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

    newBatch.runs = runs;
    setCurrentBatch(newBatch);

    // Execute tests in parallel with batching
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < runs.length; i += batchSize) {
      batches.push(runs.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await Promise.all(batch.map(run => executeTestRun(run, newBatch)));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Save completed batch
    const updatedBatches = [...testBatches, newBatch];
    saveTestBatches(updatedBatches);
    setViewMode('analysis');
    setIsRunning(false);
  };

  const executeTestRun = async (run: TestRun, batch: TestBatch) => {
    try {
      // Update status to running
      run.status = 'running';
      run.startTime = new Date();
      setCurrentBatch({ ...batch });

      // Set the active prompt
      await fetch(`/api/prompts/${run.promptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });

      // Create session with descriptive name
      const sessionName = `${batch.name} - ${run.model} - ${run.prompt} #${run.iteration}`;

      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: sessionName }),
      });

      if (!sessionResponse.ok) throw new Error('Failed to create session');

      const session = await sessionResponse.json();
      run.sessionId = session.id;

      // Send the message
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: batch.testMessage,
          messages: [],
          model: run.model,
          sessionId: session.id
        }),
      });

      if (!chatResponse.ok) throw new Error('Chat request failed');

      const chatData = await chatResponse.json();
      run.response = chatData.response;
      run.status = 'completed';
      run.endTime = new Date();

    } catch (error) {
      console.error(`Test run ${run.id} failed:`, error);
      run.status = 'error';
      run.endTime = new Date();
      run.error = error instanceof Error ? error.message : 'Unknown error';
    }

    setCurrentBatch({ ...batch });
  };

  const updateRunEvaluation = (runId: string, groundTruthMatch: 'good' | 'bad' | 'neutral' | null, notes?: string) => {
    if (!currentBatch) return;

    const updatedRuns = currentBatch.runs.map(run =>
      run.id === runId
        ? { ...run, groundTruthMatch, notes }
        : run
    );

    const updatedBatch = { ...currentBatch, runs: updatedRuns };
    setCurrentBatch(updatedBatch);

    // Update in saved batches
    const updatedBatches = testBatches.map(batch =>
      batch.id === currentBatch.id ? updatedBatch : batch
    );
    saveTestBatches(updatedBatches);
  };

  const updateRunMetrics = (runId: string, parametersRecommended: number, correctParameters: number) => {
    if (!currentBatch) return;

    const updatedRuns = currentBatch.runs.map(run =>
      run.id === runId
        ? { ...run, parametersRecommended, correctParameters }
        : run
    );

    const updatedBatch = { ...currentBatch, runs: updatedRuns };
    setCurrentBatch(updatedBatch);

    // Update in saved batches
    const updatedBatches = testBatches.map(batch =>
      batch.id === currentBatch.id ? updatedBatch : batch
    );
    saveTestBatches(updatedBatches);
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
    return currentBatch?.runs.filter(run => run.status === status).length || 0;
  };

  const getEvaluationCount = (evaluation: 'good' | 'bad' | 'neutral' | null) => {
    return currentBatch?.runs.filter(run => run.groundTruthMatch === evaluation).length || 0;
  };

  const exportResults = () => {
    if (!currentBatch) return;

    const completedRuns = currentBatch.runs.filter(run => run.status === 'completed');

    if (completedRuns.length === 0) {
      alert('No completed test runs to export');
      return;
    }

    // Create Excel data - Simple table with each run as a row
    const excelData: any[][] = [];

    // Header row
    const headerRow: any[] = [
      'Test Run ID',
      'Model',
      'Prompt',
      'Iteration',
      'Parameters Recommended',
      'Correct Parameters',
      'Precision (%)',
      'Recall',
      'Response'
    ];
    excelData.push(headerRow);

    // Data rows - each test run gets its own row
    completedRuns.forEach(run => {
      const precision = (run.parametersRecommended && run.parametersRecommended > 0)
        ? Math.round((run.correctParameters! / run.parametersRecommended) * 100)
        : 0;

      excelData.push([
        run.id,
        run.model,
        run.prompt,
        run.iteration,
        run.parametersRecommended || 'Not set',
        run.correctParameters || 'Not set',
        run.parametersRecommended ? precision : 'N/A',
        run.correctParameters || 'Not set',
        run.response || ''
      ]);
    });

    // Add summary statistics at the end
    excelData.push([]);
    excelData.push(['SUMMARY TABLE']);
    excelData.push([]);

    // Group by model and prompt for averages
    const runsWithMetrics = completedRuns.filter(run =>
      run.parametersRecommended !== undefined && run.correctParameters !== undefined
    );

    if (runsWithMetrics.length > 0) {
      // Get unique prompts and models
      const uniquePrompts = [...new Set(runsWithMetrics.map(run => run.prompt))];
      const uniqueModels = [...new Set(runsWithMetrics.map(run => run.model))];

      // Create header row: Test Case | Model1 | Model2 | Model3...
      const summaryHeaderRow = ['Test Case'];
      uniqueModels.forEach(model => {
        // Shorten model names for better display
        const shortModel = model
          .replace('gpt-4o-mini', 'GPT 4o Mini')
          .replace('gpt-4o', 'GPT 4o')
          .replace('gpt-4-turbo', 'GPT 4 Turbo')
          .replace('gpt-4', 'GPT 4')
          .replace('gpt-3.5-turbo-16k', 'GPT 3.5 T.16K')
          .replace('gpt-3.5-turbo', 'GPT 3.5 Turbo');
        summaryHeaderRow.push(shortModel);
      });
      excelData.push(summaryHeaderRow);

      // Group data by prompt and model
      const groupedData = new Map();
      runsWithMetrics.forEach(run => {
        const promptKey = run.prompt;
        const modelKey = run.model;

        if (!groupedData.has(promptKey)) {
          groupedData.set(promptKey, new Map());
        }

        if (!groupedData.get(promptKey).has(modelKey)) {
          groupedData.get(promptKey).set(modelKey, []);
        }

        groupedData.get(promptKey).get(modelKey).push(run);
      });

      // Create data rows for each prompt (test case)
      uniquePrompts.forEach(prompt => {
        const row: any[] = [prompt];

        uniqueModels.forEach(model => {
          const runsForThisCombo = groupedData.get(prompt)?.get(model);

          if (runsForThisCombo && runsForThisCombo.length > 0) {
            // Calculate average precision for this prompt-model combination
            const avgPrecision = runsForThisCombo.reduce((sum: number, run: any) => {
              return sum + (run.parametersRecommended > 0 ? (run.correctParameters / run.parametersRecommended) : 0);
            }, 0) / runsForThisCombo.length;

            // Show as percentage
            row.push(`${Math.round(avgPrecision * 100)}%`);
          } else {
            row.push('N/A');
          }
        });

        excelData.push(row);
      });
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Auto-size columns
    const wscols = [
      { wch: 15 }, // Test Run ID
      { wch: 15 }, // Model
      { wch: 20 }, // Prompt
      { wch: 10 }, // Iteration
      { wch: 18 }, // Parameters Recommended
      { wch: 15 }, // Correct Parameters
      { wch: 12 }, // Precision
      { wch: 10 }, // Recall
      { wch: 60 }  // Response
    ];
    ws['!cols'] = wscols;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Test Results');

    // Generate file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `bulk-test-results-${timestamp}.xlsx`;

    // Save file
    XLSX.writeFile(wb, fileName);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const saveBatchToDatabase = async (batch: TestBatch) => {
    try {
      const response = await fetch('/api/test-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: batch.name,
          testMessage: batch.testMessage,
          groundTruth: batch.groundTruth,
          runs: batch.runs
        }),
      });

      if (response.ok) {
        alert('✅ Test batch saved to database successfully!');
      } else {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        // Clone the response so we can try both JSON and text
        const responseClone = response.clone();

        try {
          const error = await response.json();
          console.error('Save error:', error);
          errorMessage = `${error.error}${error.details ? '\nDetails: ' + error.details : ''}`;
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON:', jsonError);
          console.error('Response status:', response.status);
          console.error('Response headers:', Object.fromEntries(response.headers.entries()));

          // Try to get the response as text using the cloned response
          try {
            const responseText = await responseClone.text();
            console.error('Response text:', responseText);
            errorMessage += `\nResponse: ${responseText}`;
          } catch (textError) {
            console.error('Failed to get response as text:', textError);
          }
        }

        alert(`❌ Failed to save: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error saving batch:', error);
      alert('❌ Failed to save to database');
    }
  };

  const retryFailedTests = async () => {
    if (!currentBatch) return;

    const failedRuns = currentBatch.runs.filter(run => run.status === 'error');
    if (failedRuns.length === 0) {
      alert('No failed tests to retry!');
      return;
    }

    if (!confirm(`Retry ${failedRuns.length} failed tests?`)) return;

    setIsRunning(true);

    // Reset failed runs to pending
    failedRuns.forEach(run => {
      run.status = 'pending';
      run.error = undefined;
      run.response = undefined;
      run.startTime = undefined;
      run.endTime = undefined;
    });

    setCurrentBatch({ ...currentBatch });

    // Execute failed tests in batches
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < failedRuns.length; i += batchSize) {
      batches.push(failedRuns.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await Promise.all(batch.map(run => executeTestRun(run, currentBatch)));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update saved batches
    const updatedBatches = testBatches.map(batch =>
      batch.id === currentBatch.id ? currentBatch : batch
    );
    saveTestBatches(updatedBatches);

    setIsRunning(false);
    alert(`✅ Retry completed! ${failedRuns.filter(r => r.status === 'completed').length}/${failedRuns.length} tests succeeded.`);
  };

  const deleteBatch = (batchId: string) => {
    if (!confirm('Are you sure you want to delete this test batch? This action cannot be undone.')) return;

    const updatedBatches = testBatches.filter(batch => batch.id !== batchId);
    saveTestBatches(updatedBatches);

    // If we're currently viewing the deleted batch, go back to setup
    if (currentBatch?.id === batchId) {
      setCurrentBatch(null);
      setViewMode('setup');
    }
  };

  if (viewMode === 'analysis' && currentBatch) {
    const completedRuns = currentBatch.runs.filter(run => run.status === 'completed');
    const groupedByModel = completedRuns.reduce((acc, run) => {
      if (!acc[run.model]) acc[run.model] = [];
      acc[run.model].push(run);
      return acc;
    }, {} as Record<string, TestRun[]>);

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Chat
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Bulk Test Analysis</h1>
                <p className="text-muted-foreground">{currentBatch.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setViewMode('setup')}
                className="gap-2"
              >
                <FlaskConical className="h-4 w-4" />
                New Test
              </Button>
              <Button
                variant="outline"
                onClick={exportResults}
                className="gap-2"
                disabled={!currentBatch || currentBatch.runs.filter(r => r.status === 'completed').length === 0}
              >
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{currentBatch.runs.length}</p>
                    <p className="text-sm text-muted-foreground">Total Tests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{getStatusCount('completed')}</p>
                    <p className="text-sm text-muted-foreground">Successful</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => getStatusCount('error') > 0 && retryFailedTests()}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold">{getStatusCount('error')}</p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </div>
                  {getStatusCount('error') > 0 && !isRunning && (
                    <Button size="sm" variant="outline" className="gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{getStatusCount('pending')}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ground Truth Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Test Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Test Message:</Label>
                <p className="text-sm bg-muted p-3 rounded-md mt-1">{currentBatch.testMessage}</p>
              </div>
              {currentBatch.groundTruth && (
                <div>
                  <Label className="text-sm font-medium">Expected Ground Truth:</Label>
                  <p className="text-sm bg-muted p-3 rounded-md mt-1">{currentBatch.groundTruth}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results by Model */}
          <div className="space-y-6">
            {Object.entries(groupedByModel).map(([model, runs]) => (
              <Card key={model}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{model}</span>
                    <Badge variant="secondary">{runs.length} results</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {runs.map((run) => (
                      <Card
                        key={run.id}
                        className={cn(
                          "p-4 cursor-pointer transition-colors",
                          run.groundTruthMatch === 'good' && "border-green-200 bg-green-50",
                          run.groundTruthMatch === 'bad' && "border-red-200 bg-red-50",
                          run.groundTruthMatch === 'neutral' && "border-yellow-200 bg-yellow-50",
                          selectedRun?.id === run.id && "ring-2 ring-primary"
                        )}
                        onClick={() => setSelectedRun(selectedRun?.id === run.id ? null : run)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium">{run.prompt} #{run.iteration}</span>
                              <Badge variant="outline" className="text-xs">
                                {run.endTime && run.startTime
                                  ? `${Math.round((run.endTime.getTime() - run.startTime.getTime()) / 1000)}s`
                                  : 'N/A'
                                }
                              </Badge>
                            </div>

                            {selectedRun?.id === run.id && (
                              <div className="space-y-3 border-t pt-3">
                                <div>
                                  <Label className="text-xs font-medium">Response:</Label>
                                  <div className="text-sm bg-background p-3 rounded border mt-1 relative">
                                    <pre className="whitespace-pre-wrap font-sans">{run.response}</pre>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(run.response || '');
                                      }}
                                      className="absolute top-2 right-2 h-8 w-8 p-0"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t">
                                  <Label className="text-xs font-medium">Evaluation:</Label>
                                  <Button
                                    size="sm"
                                    variant={run.groundTruthMatch === 'good' ? 'default' : 'outline'}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateRunEvaluation(run.id, run.groundTruthMatch === 'good' ? null : 'good');
                                    }}
                                    className="h-7 gap-1"
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                    Good
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={run.groundTruthMatch === 'neutral' ? 'default' : 'outline'}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateRunEvaluation(run.id, run.groundTruthMatch === 'neutral' ? null : 'neutral');
                                    }}
                                    className="h-7 gap-1"
                                  >
                                    <Minus className="h-3 w-3" />
                                    Neutral
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={run.groundTruthMatch === 'bad' ? 'default' : 'outline'}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateRunEvaluation(run.id, run.groundTruthMatch === 'bad' ? null : 'bad');
                                    }}
                                    className="h-7 gap-1"
                                  >
                                    <ThumbsDown className="h-3 w-3" />
                                    Poor
                                  </Button>
                                </div>

                                <div className="flex gap-2 pt-2 border-t">
                                  <div className="flex items-center gap-1">
                                    <Label className="text-xs font-medium">Recommended:</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={run.parametersRecommended || ''}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        const recommended = parseInt(e.target.value) || 0;
                                        updateRunMetrics(run.id, recommended, run.correctParameters || 0);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      onFocus={(e) => e.stopPropagation()}
                                      className="w-16 h-6 text-xs"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Label className="text-xs font-medium">Correct:</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={run.correctParameters || ''}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        const correct = parseFloat(e.target.value) || 0;
                                        updateRunMetrics(run.id, run.parametersRecommended || 0, correct);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      onFocus={(e) => e.stopPropagation()}
                                      className="w-16 h-6 text-xs"
                                      placeholder="0"
                                    />
                                  </div>
                                  {run.parametersRecommended && run.correctParameters !== undefined && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>Precision: {run.parametersRecommended > 0 ? Math.round((run.correctParameters / run.parametersRecommended) * 100) : 0}%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {run.groundTruthMatch === 'good' && <ThumbsUp className="h-4 w-4 text-green-500" />}
                            {run.groundTruthMatch === 'bad' && <ThumbsDown className="h-4 w-4 text-red-500" />}
                            {run.groundTruthMatch === 'neutral' && <Minus className="h-4 w-4 text-yellow-500" />}
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Chat
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <FlaskConical className="h-8 w-8" />
                Bulk Testing
              </h1>
              <p className="text-muted-foreground">Run systematic tests across models and prompts</p>
            </div>
          </div>
        </div>

        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="testName">Test Name</Label>
              <Input
                id="testName"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g., Parameter Extraction Test v1"
              />
            </div>

            <div>
              <Label htmlFor="testMessage">Test Message *</Label>
              <Textarea
                id="testMessage"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter the message you want to test..."
                className="min-h-24"
              />
            </div>

            <div>
              <Label htmlFor="groundTruth">Expected Ground Truth (for comparison)</Label>
              <Textarea
                id="groundTruth"
                value={groundTruth}
                onChange={(e) => setGroundTruth(e.target.value)}
                placeholder="Enter what you expect the ideal response to contain..."
                className="min-h-24"
              />
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
              <Button
                onClick={runBulkTest}
                disabled={isRunning || !testMessage.trim() || selectedModels.length === 0 || selectedPrompts.length === 0}
                className="gap-2"
                size="lg"
              >
                <Play className="h-4 w-4" />
                {isRunning ? 'Running Tests...' : 'Start Bulk Test'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Test Results */}
        {isRunning && currentBatch && (
          <Card>
            <CardHeader>
              <CardTitle>Test Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm mb-4">
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

              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {currentBatch.runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status)}
                      <span className="text-sm">
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
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Previous Test Batches */}
        {testBatches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Previous Test Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testBatches.map((batch) => {
                  const completed = batch.runs.filter(r => r.status === 'completed').length;
                  const total = batch.runs.length;

                  return (
                    <Card
                      key={batch.id}
                      className="p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setCurrentBatch(batch);
                            setViewMode('analysis');
                          }}
                        >
                          <h3 className="font-medium">{batch.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {batch.createdAt.toLocaleString()} • {completed}/{total} completed
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveBatchToDatabase(batch);
                            }}
                            className="gap-1"
                          >
                            <Database className="h-3 w-3" />
                            Save to DB
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCurrentBatch(batch);
                              setViewMode('analysis');
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBatch(batch.id);
                            }}
                            className="gap-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}