import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Upload, FileCode, CheckCircle2, AlertCircle, Loader2, ArrowRight, Database, Filter } from 'lucide-react';
import { useContexts } from '../hooks/useContexts';
import { useXmlUpload } from '../hooks/useXmlUpload';
import ContextSelector from '../components/search/ContextSelector';
import MetadataFilters from '../components/search/MetadataFilters';

const UploadPage: React.FC = () => {
  const [contextId, setContextId] = useState('');
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);

  const { data: contexts } = useContexts();
  const selectedContext = contexts?.find(c => c.contextId === contextId);
  const { uploadFiles, statuses, isUploading } = useXmlUpload();

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'text/xml' || f.name.endsWith('.xml'));
    if (files.length > 0) {
      uploadFiles(files, contextId, metadata);
      setStep(3);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      uploadFiles(files, contextId, metadata);
      setStep(3);
    }
  };

  const isMetadataComplete = selectedContext?.requiredMetadata.every(key => metadata[key]?.trim().length > 0);

  const resetUpload = () => {
    setStep(1);
    setContextId('');
    setMetadata({});
  };

  return (
    <Layout>
      <div className="bg-paper border-b border-steel p-8 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-ink uppercase tracking-tight">XML Observation Upload</h1>
            <p className="text-slate-500 mt-1 font-medium">Extract field usage patterns from existing documents.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className={`flex flex-col items-center ${step >= 1 ? 'text-ceremony' : 'text-slate-300'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black mb-1 ${step >= 1 ? 'border-ceremony' : 'border-slate-200'}`}>1</div>
                <span className="text-[10px] font-black uppercase">Context</span>
             </div>
             <div className="w-8 h-px bg-steel mt-[-16px]" />
             <div className={`flex flex-col items-center ${step >= 2 ? 'text-ceremony' : 'text-slate-300'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black mb-1 ${step >= 2 ? 'border-ceremony' : 'border-slate-200'}`}>2</div>
                <span className="text-[10px] font-black uppercase">Metadata</span>
             </div>
             <div className="w-8 h-px bg-steel mt-[-16px]" />
             <div className={`flex flex-col items-center ${step >= 3 ? 'text-ceremony' : 'text-slate-300'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black mb-1 ${step >= 3 ? 'border-ceremony' : 'border-slate-200'}`}>3</div>
                <span className="text-[10px] font-black uppercase">Upload</span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-paper/30 p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Step 1: Select Context */}
          <section className={`bg-white border-2 p-8 rounded-md transition-all ${step === 1 ? 'border-ceremony shadow-xl' : 'border-steel opacity-50'}`}>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
               <Database className="w-4 h-4" />
               Phase 1: Observation Point
            </h2>
            <div className="max-w-md">
              <label className="block text-xs font-bold uppercase tracking-tight text-ink mb-2">Select Target Context</label>
              <ContextSelector 
                value={contextId} 
                onChange={(val) => { setContextId(val); setMetadata({}); setStep(val ? 2 : 1); }} 
                contexts={contexts || []} 
              />
              <p className="mt-4 text-xs text-slate-400 italic">Only active contexts are available for new observations.</p>
            </div>
          </section>

          {/* Step 2: Metadata */}
          {selectedContext && (
            <section className={`bg-white border-2 p-8 rounded-md transition-all ${step === 2 ? 'border-ceremony shadow-xl' : 'border-steel opacity-50'}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                   <Filter className="w-4 h-4" />
                   Phase 2: Context Metadata
                </h2>
                {isMetadataComplete && (
                  <div className="bg-mint/20 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                <MetadataFilters 
                  context={selectedContext} 
                  values={metadata} 
                  onChange={(k, v) => setMetadata(prev => ({ ...prev, [k]: v }))} 
                />
                
                {step === 2 && isMetadataComplete && (
                   <button 
                    onClick={() => setStep(3)}
                    className="bg-ink text-paper px-8 py-3 rounded font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-slate transition-all shadow-lg ml-auto"
                   >
                     Next: File Upload <ArrowRight className="w-4 h-4" />
                   </button>
                )}
              </div>
            </section>
          )}

          {/* Step 3: Upload */}
          {step === 3 && (
            <section className="bg-white border-2 border-ceremony p-8 rounded-md shadow-xl animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <Upload className="w-4 h-4" />
                 Phase 3: XML Ingestion
              </h2>

              {statuses.length === 0 ? (
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="border-2 border-dashed border-steel rounded-lg p-12 flex flex-col items-center justify-center bg-paper/50 hover:bg-ceremony/5 hover:border-ceremony transition-all cursor-pointer group"
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  <input id="fileInput" type="file" multiple accept=".xml" className="hidden" onChange={handleFileSelect} />
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-ceremony" />
                  </div>
                  <h3 className="text-lg font-black text-ink uppercase tracking-tight">Drop XML Files Here</h3>
                  <p className="text-slate-400 text-sm mt-1">or click to browse local files</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {statuses.map((status) => (
                    <UploadItem key={status.fileName} status={status} />
                  ))}
                  
                  {!isUploading && (
                    <div className="pt-6 border-t border-steel mt-6 flex justify-between items-center">
                       <div className="text-sm font-bold text-ink uppercase tracking-tight">
                          Ingestion Cycle Complete
                       </div>
                       <button 
                        onClick={resetUpload}
                        className="text-ceremony font-black uppercase tracking-widest text-xs hover:underline"
                       >
                         Start New Batch
                       </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
};

const UploadItem = ({ status }: { status: any }) => {
  const isProcessing = status.status === 'parsing' || status.status === 'submitting';
  const isComplete = status.status === 'complete';
  const isError = status.status === 'error';

  return (
    <div className={`p-4 border rounded-md flex items-center gap-4 transition-all ${
      isComplete ? 'border-mint bg-mint/5' : isError ? 'border-red-200 bg-red-50' : 'border-steel bg-white'
    }`}>
      <div className={`p-2 rounded ${
        isComplete ? 'bg-mint/20 text-emerald-700' : isError ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
      }`}>
        {isComplete ? <CheckCircle2 className="w-5 h-5" /> : isError ? <AlertCircle className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-black text-ink truncate">{status.fileName}</span>
          <span className="text-[10px] font-black uppercase tracking-widest">
            {isProcessing ? 'Processing' : status.status}
          </span>
        </div>
        
        {isProcessing && (
           <div className="w-full bg-paper h-1 rounded-full overflow-hidden">
              <div className="bg-ceremony h-full animate-progress" />
           </div>
        )}
        
        {isComplete && (
          <div className="text-[10px] font-bold text-emerald-700 uppercase">
             Successfully extracted {status.observationCount} observations
          </div>
        )}
        
        {isError && (
          <div className="text-[10px] font-bold text-red-600 uppercase">
             Error: {status.error}
          </div>
        )}
      </div>

      {isProcessing && <Loader2 className="w-4 h-4 text-ceremony animate-spin" />}
    </div>
  );
};

export default UploadPage;