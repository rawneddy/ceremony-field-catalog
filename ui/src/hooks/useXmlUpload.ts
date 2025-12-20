import { useState } from 'react';
import { catalogApi } from '../services/catalogApi';
import { parseXmlToObservations, extractMetadataFromXml } from '../services/xmlParser';
import type { UploadStatus, MetadataExtractionRule, UploadBin } from '../types';

export const useXmlUpload = () => {
  const [statuses, setStatuses] = useState<UploadStatus[]>([]);
  const [bins, setBins] = useState<UploadBin[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Legacy simple upload (kept for compatibility)
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

  const scanFiles = async (files: File[], rules: Record<string, MetadataExtractionRule>) => {
    setIsScanning(true);
    const newBins: Record<string, UploadBin> = {};

    for (const file of files) {
      try {
        const content = await file.text();
        const extracted = extractMetadataFromXml(content, rules);
        
        // Create a signature based on sorted metadata keys/values
        const signature = JSON.stringify(Object.entries(extracted).sort((a, b) => a[0].localeCompare(b[0])));
        
        if (!newBins[signature]) {
          newBins[signature] = {
            id: signature, // Use signature as ID for grouping
            files: [],
            metadata: extracted,
            status: 'pending',
            progress: 0
          };
        }
        newBins[signature].files.push(file);
      } catch (e) {
        console.error("Failed to scan file", file.name, e);
        // Fallback to empty bin
        const sig = "{}";
        if (!newBins[sig]) {
             newBins[sig] = { id: sig, files: [], metadata: {}, status: 'pending', progress: 0 };
        }
        newBins[sig].files.push(file);
      }
    }
    
    setBins(Object.values(newBins));
    setIsScanning(false);
  };

  const updateBinMetadata = (binId: string, metadata: Record<string, string>) => {
    setBins(prev => prev.map(bin => 
      bin.id === binId ? { ...bin, metadata } : bin
    ));
  };

  const submitBin = async (binId: string, contextId: string) => {
    setBins(prev => prev.map(b => b.id === binId ? { ...b, status: 'submitting', progress: 0 } : b));
    
    const bin = bins.find(b => b.id === binId);
    if (!bin) return;

    let completed = 0;
    try {
      for (const file of bin.files) {
        const content = await file.text();
        const observations = parseXmlToObservations(content, bin.metadata);
        await catalogApi.submitObservations(contextId, observations);
        completed++;
        setBins(prev => prev.map(b => 
            b.id === binId ? { ...b, progress: (completed / bin.files.length) * 100 } : b
        ));
      }
      setBins(prev => prev.map(b => b.id === binId ? { ...b, status: 'complete', progress: 100 } : b));
    } catch (e) {
      setBins(prev => prev.map(b => b.id === binId ? { ...b, status: 'error', error: (e as Error).message } : b));
    }
  };

  const clearStatuses = () => {
    setStatuses([]);
    setBins([]);
  };

  return {
    uploadFiles,
    statuses,
    bins,
    scanFiles,
    updateBinMetadata,
    submitBin,
    clearStatuses,
    isUploading: statuses.some(s => s.status === 'parsing' || s.status === 'submitting') || bins.some(b => b.status === 'submitting'),
    isScanning
  };
};