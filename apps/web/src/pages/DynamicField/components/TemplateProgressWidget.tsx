import React from 'react';
import { Loader2, CheckCircle2, Minimize2, Maximize2, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TemplateProgressWidgetProps {
  isOpen: boolean;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  templateName: string;
  progressMessage: string;
  isSuccess: boolean;
  onGoToDatabase: () => void;
  onClose: () => void;
}

export function TemplateProgressWidget({
  isOpen,
  isMinimized,
  onToggleMinimize,
  templateName,
  progressMessage,
  isSuccess,
  onGoToDatabase,
  onClose,
}: TemplateProgressWidgetProps) {
  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <Card className="fixed bottom-6 gap-0 right-6 py-0 w-80 shadow-2xl border bg-background z-50 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isSuccess ? 'Completed' : 'Creating Database'}
          </span>
          <div className="flex items-center gap-1">
            {!isSuccess && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleMinimize}>
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
            {isSuccess && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            {isSuccess ? (
              <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
            ) : (
              <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-500 animate-spin shrink-0" />
            )}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate" title={templateName}>
                {templateName}
              </span>
              <span className="text-sm text-muted-foreground line-clamp-2">
                {isSuccess ? 'Database created successfully.' : progressMessage || 'Initializing...'}
              </span>
            </div>
          </div>
          {isSuccess && (
            <div className="flex gap-2 mt-1">
              <Button size="sm" className="w-full" onClick={onGoToDatabase}>
                View Database
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Maximized/Centered State
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
      <Card className="w-full py-0 gap-0 max-w-md shadow-lg border bg-background overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Building from Template</span>
          {!isSuccess && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onToggleMinimize}>
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="px-8 py-10 flex flex-col items-center justify-center text-center gap-5">
          {isSuccess ? (
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="relative mb-2">
              <Loader2 className="h-10 w-10 text-blue-600 dark:text-blue-500 animate-spin" />
            </div>
          )}

          <div className="space-y-1.5">
            <h3 className="text-lg font-medium">{templateName}</h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
              {isSuccess
                ? 'Your new database is ready!'
                : (progressMessage || 'Preparing workspace...')}
            </p>
          </div>

          {isSuccess && (
            <div className="w-full flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Dismiss
              </Button>
              <Button className="flex-1" onClick={onGoToDatabase}>
                View Database
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
