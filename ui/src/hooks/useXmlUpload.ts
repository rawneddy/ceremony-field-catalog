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

    // Track bins with their unique field/attribute paths during scanning
    const binData: Record<string, {
      bin: Omit<UploadBin, 'fieldCount' | 'attributeCount'>;
      fieldPaths: Set<string>;
      attributePaths: Set<string>;
    }> = {};

    for (const file of files) {
      try {
        const content = await file.text();
        const extracted = extractMetadataFromXml(content, rules);

        // Also parse to count unique fields and attributes
        const observations = parseXmlToObservations(content, extracted);

        // Create a signature based on sorted metadata keys/values
        const signature = JSON.stringify(Object.entries(extracted).sort((a, b) => a[0].localeCompare(b[0])));

        if (!binData[signature]) {
          binData[signature] = {
            bin: {
              id: signature,
              files: [],
              metadata: extracted,
              status: 'pending',
              progress: 0
            },
            fieldPaths: new Set(),
            attributePaths: new Set()
          };
        }

        const entry = binData[signature];
        if (entry) {
          entry.bin.files.push(file);
          // Separate fields (no @) from attributes (contain @)
          observations.forEach(o => {
            if (o.fieldPath.includes('@')) {
              entry.attributePaths.add(o.fieldPath);
            } else {
              entry.fieldPaths.add(o.fieldPath);
            }
          });
        }
      } catch {
        toast.error(`Failed to scan "${file.name}" - not valid XML`);
        // Skip invalid files entirely - don't add to any bin
      }
    }

    // Convert to final bins with field and attribute counts
    const binsList: UploadBin[] = Object.values(binData).map(({ bin, fieldPaths, attributePaths }) => ({
      ...bin,
      fieldCount: fieldPaths.size,
      attributeCount: attributePaths.size
    }));

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