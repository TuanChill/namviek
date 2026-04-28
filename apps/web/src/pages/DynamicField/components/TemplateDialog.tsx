import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useTemplates } from '../hooks/useTemplates';
import { Loader2, LayoutTemplate, ImageIcon } from 'lucide-react';
import type { Template } from '../api';
import { TemplateProgressWidget } from './TemplateProgressWidget';

// ─── Template preview images ──────────────────────────────────────────────────
// Add your preview images here, keyed by template id.
// Example: { 'pm-task-tracker': '/images/templates/pm-task-tracker.png' }
const TEMPLATE_PREVIEW_IMAGES: Record<string, string> = {
  'pm-task-tracker':         '/images/templates/pm-task-tracker.png',
  'pm-bug-tracker':          '/images/templates/pm-bug-tracker.png',
  'pm-roadmap':              '/images/templates/pm-roadmap.png',
  'hr-applicant-tracker':    '/images/templates/hr-applicant-tracker.png',
  'hr-employee-directory':   '/images/templates/hr-employee-directory.png',
  'sales-pipeline':          '/images/templates/sales-pipeline.png',
  'sales-customer-feedback': '/images/templates/sales-customer-feedback.png',
  'mktg-content-calendar':   '/images/templates/mktg-content-calendar.png',
  'mktg-campaign-tracker':   '/images/templates/mktg-campaign-tracker.png',
};

export function TemplateDialog() {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isProgressMinimized, setIsProgressMinimized] = useState(false);

  const {
    templates,
    isLoadingTemplates,
    createFromTemplate,
    creatingTemplateId,
    activeTemplateName,
    progressMessage,
    isSuccess,
    createdDbId,
    resetProgress,
  } = useTemplates();

  const navigate = useNavigate();

  const categories = useMemo(() => {
    return Array.from(new Set(templates.map(t => t.category)));
  }, [templates]);

  // Group templates by category
  const byCategory = useMemo(() => {
    const map: Record<string, Template[]> = {};
    for (const t of templates) {
      if (!map[t.category]) map[t.category] = [];
      map[t.category].push(t);
    }
    return map;
  }, [templates]);

  // Auto-select first template when list loads
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [templates]);

  const handleCreate = async (template: Template) => {
    try {
      setOpen(false);
      setIsProgressMinimized(false);
      createFromTemplate({ templateId: template.id }).catch(error => {
        console.error('Failed to create from template:', error);
        alert(error.message || 'Failed to create database from template');
      });
    } catch (error) {
      console.error('Failed to setup template creation:', error);
    }
  };

  const handleGoToDatabase = () => {
    if (createdDbId) {
      window.location.href = `/test/${createdDbId}`;
    }
  };

  // Auto-redirect if maximized and successful
  useEffect(() => {
    if (isSuccess && createdDbId && !isProgressMinimized) {
      const timer = setTimeout(() => handleGoToDatabase(), 800);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, createdDbId, isProgressMinimized]);

  const isProgressOpen = creatingTemplateId !== null || isSuccess;

  // Default open to first category
  const defaultOpenCategories = categories.slice(0, 1);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-1.5 h-8 text-xs text-muted-foreground"
          >
            <LayoutTemplate size={13} />
            Start from Template
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-5xl max-h-[88vh] h-[88vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Select a template to instantly create a pre-configured database with sample data.
            </DialogDescription>
          </DialogHeader>

          {isLoadingTemplates ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* ── Left: accordion category list ── */}
              <div className="w-64 border-r shrink-0 flex flex-col bg-muted/20">
                <ScrollArea className="flex-1">
                  <Accordion
                    type="multiple"
                    defaultValue={defaultOpenCategories}
                    className="p-3 space-y-1"
                  >
                    {categories.map(category => (
                      <AccordionItem
                        key={category}
                        value={category}
                        className="border-none"
                      >
                        <AccordionTrigger className="text-sm font-medium px-2 py-2 rounded-md hover:bg-muted hover:no-underline">
                          {category}
                        </AccordionTrigger>
                        <AccordionContent className="pb-1 pt-0">
                          <div className="space-y-0.5 pl-1">
                            {(byCategory[category] ?? []).map(template => (
                              <button
                                key={template.id}
                                onClick={() => setSelectedTemplate(template)}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${selectedTemplate?.id === template.id
                                    ? 'bg-primary text-primary-foreground font-medium'
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                  }`}
                              >
                                {template.name}
                              </button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </div>

              {/* ── Right: preview panel ── */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {selectedTemplate ? (
                  <>
                    {/* Header bar with name, description and use button */}
                    <div className="flex items-start justify-between gap-4 px-6 py-4 border-b shrink-0">
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold leading-tight">
                          {selectedTemplate.name}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {selectedTemplate.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {selectedTemplate.fields.slice(0, 5).map(f => (
                            <Badge key={f.name} variant="secondary" className="text-xs font-normal">
                              {f.name}
                            </Badge>
                          ))}
                          {selectedTemplate.fields.length > 5 && (
                            <Badge variant="secondary" className="text-xs font-normal">
                              +{selectedTemplate.fields.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        className="shrink-0"
                        onClick={() => handleCreate(selectedTemplate)}
                        disabled={isProgressOpen}
                      >
                        Use Template
                      </Button>
                    </div>

                    {/* Preview image area */}
                    <ScrollArea className="flex-1">
                      <div className="p-6">
                        {TEMPLATE_PREVIEW_IMAGES[selectedTemplate.id] ? (
                          <img
                            src={TEMPLATE_PREVIEW_IMAGES[selectedTemplate.id]}
                            alt={`${selectedTemplate.name} preview`}
                            className="w-full rounded-lg border shadow-sm object-cover"
                          />
                        ) : (
                          // Placeholder — replace by adding an entry to TEMPLATE_PREVIEW_IMAGES
                          <div className="w-full aspect-video rounded-lg border border-dashed bg-muted/30 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <ImageIcon size={40} strokeWidth={1.2} />
                            <p className="text-sm">Preview image coming soon</p>
                            <p className="text-xs opacity-60">
                              Add your image to{' '}
                              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                                TEMPLATE_PREVIEW_IMAGES[&apos;{selectedTemplate.id}&apos;]
                              </code>
                              {' '}in{' '}
                              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                                TemplateDialog.tsx
                              </code>
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    Select a template from the list
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TemplateProgressWidget
        isOpen={isProgressOpen}
        isMinimized={isProgressMinimized}
        onToggleMinimize={() => setIsProgressMinimized(prev => !prev)}
        templateName={activeTemplateName}
        progressMessage={progressMessage}
        isSuccess={isSuccess}
        onGoToDatabase={handleGoToDatabase}
        onClose={resetProgress}
      />
    </>
  );
}
