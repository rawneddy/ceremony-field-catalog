export interface UploadBin {
  id: string;
  files: File[];
  metadata: Record<string, string>;
  status: 'pending' | 'submitting' | 'complete' | 'error';
  error?: string;
  progress: number;
}
