import { useState } from 'react';
import { toast } from 'sonner';
import { catalogApi } from '../services/catalogApi';
import { parseXmlToObservations, extractMetadataFromXml } from '../utils/xmlParser';
import type { MetadataExtractionRule, UploadBin, FileWithMetadata } from '../types';

export const useXmlUpload = () => {
  const [bins, setBins] = useState<UploadBin[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const scanFiles = async (
    files: File[],
    rules: Record<string, MetadataExtractionRule>,
    requiredMetadata: string[]
  ): Promise<number> => {
    setIsScanning(true);

    const completeFiles: FileWithMetadata[] = [];
    const incompleteFiles: FileWithMetadata[] = [];

    for (const file of files) {
      try {
        const content = await file.text();
        const extracted = extractMetadataFromXml(content, rules);

        // Parse to count unique fields and attributes
        const observations = parseXmlToObservations(content, extracted);

        // Count fields (no @) and attributes (contain @)
        const fieldPaths = new Set<string>();
        const attributePaths = new Set<string>();
        observations.forEach(o => {
          if (o.fieldPath.includes('@')) {
            attributePaths.add(o.fieldPath);
          } else {
            fieldPaths.add(o.fieldPath);
          }
        });

        const fileWithMeta: FileWithMetadata = {
          file,
          metadata: { ...extracted },
          originalMetadata: { ...extracted },
          fieldCount: fieldPaths.size,
          attributeCount: attributePaths.size
        };

        // Check completeness: all required metadata fields must be present
        const isComplete = requiredMetadata.every(field => extracted[field]);

        if (isComplete) {
          completeFiles.push(fileWithMeta);
        } else {
          incompleteFiles.push(fileWithMeta);
        }
      } catch {
        toast.error(`Failed to scan "${file.name}" - not valid XML`);
      }
    }

    // Create bins based on completeness
    const newBins: UploadBin[] = [];

    if (completeFiles.length > 0) {
      newBins.push({
        id: 'complete',
        files: completeFiles,
        status: 'pending',
        progress: 0
      });
    }

    if (incompleteFiles.length > 0) {
      newBins.push({
        id: 'incomplete',
        files: incompleteFiles,
        status: 'pending',
        progress: 0
      });
    }

    setBins(newBins);
    setIsScanning(false);
    return completeFiles.length + incompleteFiles.length;
  };

  const updateBinFiles = (binId: 'complete' | 'incomplete', updatedFiles: FileWithMetadata[]) => {
    setBins(prev => prev.map(bin =>
      bin.id === binId ? { ...bin, files: updatedFiles } : bin
    ));
  };

  const submitBin = async (binId: 'complete' | 'incomplete', contextId: string, optionalMetadata: string[]) => {
    setBins(prev => prev.map(b => b.id === binId ? { ...b, status: 'submitting', progress: 0 } : b));

    const bin = bins.find(b => b.id === binId);
    if (!bin) return;

    let completed = 0;
    try {
      for (const fileWithMeta of bin.files) {
        const content = await fileWithMeta.file.text();

        // Build metadata object, omitting empty optional fields
        const metadata: Record<string, string> = {};
        Object.entries(fileWithMeta.metadata).forEach(([key, value]) => {
          if (value && value.trim()) {
            metadata[key] = value;
          } else if (!optionalMetadata.includes(key)) {
            // Include empty required fields (will fail validation on backend)
            metadata[key] = value;
          }
          // Skip empty optional fields entirely
        });

        const observations = parseXmlToObservations(content, metadata);
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

  // Check if a bin has all required metadata filled for all files
  const isBinReady = (bin: UploadBin, requiredMetadata: string[]): boolean => {
    return bin.files.every(f =>
      requiredMetadata.every(field => f.metadata[field] && f.metadata[field].trim())
    );
  };

  return {
    bins,
    scanFiles,
    updateBinFiles,
    submitBin,
    clearBins,
    isBinReady,
    isUploading: bins.some(b => b.status === 'submitting'),
    isScanning
  };
};
