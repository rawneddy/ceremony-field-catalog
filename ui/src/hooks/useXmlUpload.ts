import { useState } from 'react';
import { catalogApi } from '../services/catalogApi';
import { parseXmlToObservations } from '../services/xmlParser';
import type { UploadStatus } from '../types';

export const useXmlUpload = () => {
  const [statuses, setStatuses] = useState<UploadStatus[]>([]);

  const uploadFiles = async (files: File[], contextId: string, metadata: Record<string, string>) => {
    const initialStatuses: UploadStatus[] = files.map(file => ({
      fileName: file.name,
      status: 'pending'
    }));
    setStatuses(initialStatuses);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      updateStatus(file.name, { status: 'parsing' });

      try {
        const content = await file.text();
        const observations = parseXmlToObservations(content, metadata);
        
        updateStatus(file.name, { status: 'submitting', observationCount: observations.length });
        
        await catalogApi.submitObservations(contextId, observations);
        
        updateStatus(file.name, { status: 'complete' });
      } catch (error) {
        console.error(`Failed to upload ${file.name}`, error);
        updateStatus(file.name, { status: 'error', error: (error as Error).message });
      }
    }
  };

  const updateStatus = (fileName: string, update: Partial<UploadStatus>) => {
    setStatuses(prev => prev.map(s => s.fileName === fileName ? { ...s, ...update } : s));
  };

  const clearStatuses = () => {
    setStatuses([]);
  };

  return {
    uploadFiles,
    statuses,
    clearStatuses,
    isUploading: statuses.some(s => s.status === 'parsing' || s.status === 'submitting'),
  };
};
