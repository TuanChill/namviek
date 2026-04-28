import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useTemplates } from '../hooks/useTemplates';
import { Loader2, LayoutTemplate } from 'lucide-react';
import type { Template } from '../api';
import { TemplateProgressWidget } from './TemplateProgressWidget';

export function TemplateDialog() {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
    resetProgress
  } = useTemplates();
  
  const navigate = useNavigate();

  const categories = useMemo(() => {
    const cats = Array.from(new Set(templates.map(t => t.category)));
    return cats;
  }, [templates]);

  // Default to first category if none selected
  const activeCategory = selectedCategory || (categories.length > 0 ? categories[0] : null);

  const displayedTemplates = useMemo(() => {
    if (!activeCategory) return [];
    return templates.filter(t => t.category === activeCategory);
  }, [templates, activeCategory]);

  const handleCreate = async (template: Template) => {
    try {
      // 1. Close main selection dialog
      setOpen(false);
      // 2. Ensure progress widget starts maximized
      setIsProgressMinimized(false);
      
      // We don't await here because we want to let the hook update its state and show the widget
      createFromTemplate({ templateId: template.id }).catch((error) => {
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
      // Small delay to let user see the green checkmark before jumping
      const timer = setTimeout(() => {
        handleGoToDatabase();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, createdDbId, isProgressMinimized]);

  // isProgressOpen if we are currently creating or if it finished (success)
  const isProgressOpen = creatingTemplateId !== null || isSuccess;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-1.5 h-8 text-xs text-muted-foreground">
            <LayoutTemplate size={13} />
            Start from Template
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] h-[90vh] flex flex-col p-0 overflow-hidden">
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
              {/* Sidebar Categories */}
              <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-1">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeCategory === category
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Main Content Grid */}
              <div className="w-3xl flex-1 flex flex-col overflow-hidden bg-muted/5">
                <ScrollArea className="flex-1">
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedTemplates.map(template => (
                      <Card key={template.id} className="flex flex-col">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <CardDescription>{template.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 pb-3">
                          <div className="flex flex-wrap gap-1.5">
                            {template.fields.slice(0, 5).map(f => (
                              <Badge key={f.name} variant="secondary" className="text-xs font-normal">
                                {f.name}
                              </Badge>
                            ))}
                            {template.fields.length > 5 && (
                              <Badge variant="secondary" className="text-xs font-normal">
                                +{template.fields.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0">
                          <Button
                            className="w-full"
                            onClick={() => handleCreate(template)}
                            disabled={isProgressOpen}
                          >
                            Use Template
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
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
