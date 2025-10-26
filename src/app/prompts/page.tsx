'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Check, X, Settings, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';

interface Prompt {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState({ title: '', content: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  // Load prompts on mount
  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      setPrompts(data);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    }
  };

  const createPrompt = async () => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrompt),
      });

      if (response.ok) {
        setNewPrompt({ title: '', content: '' });
        setIsCreating(false);
        fetchPrompts();
      }
    } catch (error) {
      console.error('Error creating prompt:', error);
    }
  };

  const updatePrompt = async (id: string, data: { title: string; content: string }) => {
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setEditingId(null);
        fetchPrompts();
      }
    } catch (error) {
      console.error('Error updating prompt:', error);
    }
  };

  const deletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPrompts();
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchPrompts();
      }
    } catch (error) {
      console.error('Error toggling prompt:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex justify-start">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Chat
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prompts Management</h1>
            <p className="text-muted-foreground">Manage your system prompts and select active prompt</p>
          </div>

          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Prompt
          </Button>
        </div>


        {/* New Prompt Form */}
        {isCreating && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Prompt title"
                value={newPrompt.title}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                placeholder="Prompt content"
                value={newPrompt.content}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, content: e.target.value }))}
                className="min-h-72"
              />
              <div className="flex gap-2">
                <Button onClick={createPrompt} className="gap-2">
                  <Check className="h-4 w-4" />
                  Create
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)} className="gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prompts Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Prompts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {prompts.map((prompt) => (
                <div key={prompt.id} className={`${!prompt.isActive ? 'opacity-60' : ''}`}>
                  {/* Table Row */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Expand Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setExpandedPrompt(expandedPrompt === prompt.id ? null : prompt.id)}
                      >
                        {expandedPrompt === prompt.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        {editingId === prompt.id ? (
                          <Input
                            defaultValue={prompt.title}
                            className="font-semibold"
                            onBlur={(e) => {
                              const content = prompts.find(p => p.id === prompt.id)?.content || '';
                              updatePrompt(prompt.id, { title: e.target.value, content });
                            }}
                          />
                        ) : (
                          <h3 className="font-semibold text-lg truncate">{prompt.title}</h3>
                        )}
                      </div>

                      {/* Status */}
                      <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                        prompt.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {prompt.isActive ? 'Active' : 'Inactive'}
                      </span>

                      {/* Dates */}
                      <div className="hidden md:block text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(prompt.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(prompt.id, prompt.isActive)}
                      >
                        {prompt.isActive ? 'Deactivate' : 'Activate'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(editingId === prompt.id ? null : prompt.id)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        {editingId === prompt.id ? 'Done' : 'Edit'}
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePrompt(prompt.id)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedPrompt === prompt.id && (
                    <div className="px-4 pb-4 border-t bg-muted/20">
                      {editingId === prompt.id ? (
                        <Textarea
                          defaultValue={prompt.content}
                          className="mt-3 min-h-40 font-mono text-sm"
                          onBlur={(e) => {
                            updatePrompt(prompt.id, { title: prompt.title, content: e.target.value });
                          }}
                        />
                      ) : (
                        <div className="mt-3 bg-background p-4 rounded-md border">
                          <pre className="whitespace-pre-wrap text-sm font-mono">{prompt.content}</pre>
                        </div>
                      )}

                      <div className="flex justify-between text-xs text-muted-foreground mt-3">
                        <span>Created: {new Date(prompt.createdAt).toLocaleDateString()}</span>
                        <span>Updated: {new Date(prompt.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {prompts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No prompts yet</h3>
              <p className="text-muted-foreground mb-4">Create your first system prompt to get started</p>
              <Button onClick={() => setIsCreating(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Prompt
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}