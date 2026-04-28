import { useState, useEffect, useCallback } from 'react';
import { api, type Template } from '../api';
import { useDatabase } from './useDatabase';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('');
  const { databases } = useDatabase();

  useEffect(() => {
    setIsLoadingTemplates(true);
    api.templates.list()
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setIsLoadingTemplates(false));
  }, []);

  const createFromTemplate = useCallback((variables: { templateId: string; name?: string }) => {
    return new Promise<any>((resolve, reject) => {
      setCreatingTemplateId(variables.templateId);
      setProgressMessage('Starting...');

      const baseUrl = import.meta.env.DEV ? 'http://localhost:4001/api' : '/api';
      let url = `${baseUrl}/databases/from-template/stream?templateId=${variables.templateId}`;
      if (variables.name) {
        url += `&name=${encodeURIComponent(variables.name)}`;
      }

      const eventSource = new EventSource(url);

      eventSource.addEventListener('progress', (event) => {
        setProgressMessage(event.data);
      });

      eventSource.addEventListener('done', (event) => {
        eventSource.close();
        setCreatingTemplateId(null);
        setProgressMessage('');
        try {
          const db = JSON.parse(event.data);
          resolve(db);
        } catch (e) {
          reject(e);
        }
      });

      eventSource.addEventListener('error', (event: any) => {
        eventSource.close();
        setCreatingTemplateId(null);
        setProgressMessage('');
        reject(new Error(event.data || 'Failed to create from template'));
      });

      eventSource.onerror = () => {
        eventSource.close();
        setCreatingTemplateId(null);
        setProgressMessage('');
        reject(new Error('Connection error or server failed during template creation'));
      };
    });
  }, []);

  return {
    templates,
    isLoadingTemplates,
    createFromTemplate,
    creatingTemplateId,
    progressMessage,
  };
}
