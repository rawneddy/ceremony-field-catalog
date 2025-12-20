export interface FileWithMetadata {
  file: File;
  metadata: Record<string, string>;
  originalMetadata: Record<string, string>; // What was auto-extracted (for styling)
  fieldCount: number;
  attributeCount: number;
}

export interface UploadBin {
  id: 'complete' | 'incomplete';
  files: FileWithMetadata[];
  status: 'pending' | 'submitting' | 'complete' | 'error';
  error?: string;
  progress: number;
}
