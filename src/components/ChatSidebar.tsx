'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PanelLeft,
  Plus,
  MessageSquare,
  Trash2,
  Check,
  X,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    messages: number;
  };
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onRefreshSessions?: React.Dispatch<React.SetStateAction<(() => Promise<void>) | null>>;
}

export function ChatSidebar({
  isOpen,
  onToggle,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  onRefreshSessions
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch sessions:', response.statusText);
        setSessions([]);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Expose fetchSessions function to parent
  useEffect(() => {
    if (onRefreshSessions) {
      onRefreshSessions(() => fetchSessions);
    }
  }, [onRefreshSessions]);

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });

      if (response.ok) {
        const newSession = await response.json();
        fetchSessions();
        onSessionSelect(newSession.id);
        onNewChat();
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchSessions();
        if (currentSessionId === sessionId) {
          onNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const startEditing = (session: ChatSession) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveTitle = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle }),
      });

      if (response.ok) {
        fetchSessions();
        setEditingId(null);
      }
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const clearAllHistory = async () => {
    if (!confirm('Are you sure you want to delete all chat history? This action cannot be undone.')) return;

    try {
      const deletePromises = sessions.map(session =>
        fetch(`/api/sessions/${session.id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      fetchSessions();
      onNewChat();
    } catch (error) {
      console.error('Error clearing all history:', error);
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full bg-background border-r border-border z-40 transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "w-72"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Chat History</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="h-8 w-8 p-0"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={createNewSession}
              className="w-full gap-2 mb-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>

            {sessions.length > 0 && (
              <Button
                onClick={clearAllHistory}
                variant="outline"
                className="w-full gap-2 text-destructive hover:text-destructive"
                size="sm"
              >
                <History className="h-4 w-4" />
                Clear All History
              </Button>
            )}
          </div>

          {/* Sessions List */}
          <ScrollArea className="flex-1 p-1">
            <div className="space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Loading...</div>
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                  <div className="text-sm text-muted-foreground">No conversations yet</div>
                  <div className="text-xs text-muted-foreground">Start a new chat to begin</div>
                </div>
              ) : (
                sessions.map((session) => (
                <Card
                  key={session.id}
                  className={cn(
                    "p-1.5 cursor-pointer transition-colors hover:bg-muted/50 group min-h-[60px]",
                    currentSessionId === session.id && "bg-muted border-primary"
                  )}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-0 flex-1 min-w-0">
                      <MessageSquare className="h-2 w-2 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0 ml-1">
                        {editingId === session.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="h-6 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveTitle(session.id);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => saveTitle(session.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={cancelEditing}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium leading-tight">
                              {session.title.split(' ').slice(0, 4).join(' ')}{session.title.split(' ').length > 4 ? '...' : ''}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                              <p className="text-[10px] text-muted-foreground">
                                {session._count.messages} msg
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(session.updatedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {editingId !== session.id && (
                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 opacity-70 group-hover:opacity-100 hover:text-destructive"
                          onClick={() => deleteSession(session.id)}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}