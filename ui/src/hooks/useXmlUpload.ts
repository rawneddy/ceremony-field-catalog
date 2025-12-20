import { useState } from 'react';
import { toast } from 'sonner';
import { catalogApi } from '../services/catalogApi';
import { parseXmlToObservations, extractMetadataFromXml } from '../utils/xmlParser';
import type { MetadataExtractionRule, UploadBin } from '../types';

export const useXmlUpload = () => {
  const [bins, setBins] = useState<UploadBin[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const scanFiles = async (files: File[], rules: Record<string, MetadataExtractionRule>): Promise<number> => {
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
      } catch {
        toast.error(`Failed to scan "${file.name}" - not valid XML`);
        // Skip invalid files entirely - don't add to any bin
      }
    }

    const binsList = Object.values(newBins);
    setBins(binsList);
    setIsScanning(false);
    return binsList.length;
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

  const clearBins = () => {
    setBins([]);
  };

  return {
    bins,
    scanFiles,
    updateBinMetadata,
    submitBin,
    clearBins,
    isUploading: bins.some(b => b.status === 'submitting'),
    isScanning
  };
};