import { useState, useRef, useEffect } from 'react';
import { Paperclip, Upload, X, File as FileIcon, Loader2, Download } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '../api';
import type { CellProps } from './shared';
import type { FileAttachment } from '../types';

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function FileChip({ file }: { file: FileAttachment }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-xs font-medium whitespace-nowrap max-w-[120px]">
      <FileIcon size={12} className="shrink-0 text-muted-foreground" />
      <span className="truncate">{file.name}</span>
    </span>
  );
}

export function FileCell({ field, value, onSave }: CellProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'upload' | 'files'>('files');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowMultiple = field.config?.allowMultipleFiles ?? false;
  const attachments = (value?.jsonValue as FileAttachment[]) ?? [];

  // When opening, if no files, default to upload tab
  useEffect(() => {
    if (open) {
      setTab(attachments.length === 0 ? 'upload' : 'files');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newAttachments: FileAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await api.upload.file(file);
        newAttachments.push(result);
        
        // If single file, we only upload the first one and break
        if (!allowMultiple) break;
      }

      const updated = allowMultiple 
        ? [...attachments, ...newAttachments]
        : newAttachments;

      onSave({ jsonValue: updated });
      setTab('files');
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('Failed to upload file. Check console for details.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (urlToDelete: string) => {
    try {
      await api.upload.delete(urlToDelete);
      const updated = attachments.filter(f => f.url !== urlToDelete);
      onSave({ jsonValue: updated });
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file from storage.');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full text-left min-h-5 flex flex-wrap gap-1 items-center">
          {attachments.length === 0 ? (
            <span className="text-muted-foreground/40 text-sm flex items-center gap-1">
              <Paperclip size={12} /> —
            </span>
          ) : (
            attachments.map((f, i) => <FileChip key={i} file={f} />)
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 overflow-hidden flex flex-col" align="start">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col h-[300px]">
          <div className="px-3 pt-3">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="files">Files ({attachments.length})</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <TabsContent value="upload" className="h-full m-0 data-[state=active]:flex flex-col">
              <div 
                className="flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors relative"
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 size={32} className="text-primary animate-spin" />
                    <p className="text-sm font-medium">Uploading...</p>
                  </>
                ) : (
                  <>
                    <div className="bg-primary/10 p-3 rounded-full text-primary">
                      <Upload size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Click to upload file</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {allowMultiple ? 'Multiple files allowed' : 'Single file only'}
                      </p>
                    </div>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple={allowMultiple}
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </div>
            </TabsContent>

            <TabsContent value="files" className="m-0 flex flex-col gap-2">
              {attachments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Paperclip size={32} className="opacity-20" />
                  <p className="text-sm">No files uploaded</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {attachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors group">
                      <div className="bg-muted p-2 rounded flex-shrink-0 text-muted-foreground">
                        <FileIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" title={file.name}>{file.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(file.size)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-muted"
                          title="Download"
                          onClick={e => e.stopPropagation()}
                        >
                          <Download size={13} />
                        </a>
                        <button 
                          onClick={() => handleDelete(file.url)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10"
                          title="Delete"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
