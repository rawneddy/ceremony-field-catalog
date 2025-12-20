import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Upload, CheckCircle2, Loader2, Database } from 'lucide-react';
import { useContexts } from '../hooks/useContexts';
import { useXmlUpload } from '../hooks/useXmlUpload';
import ContextSelector from '../components/search/ContextSelector';
import BinRow from '../components/upload/BinRow';

const UploadPage: React.FC = () => {
  const [contextId, setContextId] = useState('');
  const [step, setStep] = useState(1);

  const { data: contexts } = useContexts();
  const selectedContext = contexts?.find(c => c.contextId === contextId);
  
  const {
    bins,
    scanFiles,
    updateBinMetadata,
    submitBin,
    clearBins,
    isScanning
  } = useXmlUpload();

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'text/xml' || f.name.endsWith('.xml'));
    if (files.length > 0 && selectedContext) {
      const validCount = await scanFiles(files, selectedContext.metadataRules || {});
      if (validCount > 0) {
        setStep(3);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedContext) {
      const files = Array.from(e.target.files);
      const validCount = await scanFiles(files, selectedContext.metadataRules || {});
      if (validCount > 0) {
        setStep(3);
      }
    }
  };

  const handleContextChange = (val: string) => {
    setContextId(val);
    if (val) {
      setStep(2);
    } else {
        setStep(1);
    }
  };

  const resetUpload = () => {
    clearBins();
    setStep(1);
    setContextId('');
  };

  return (
    <Layout>
      <div className="bg-paper p-6 shrink-0 shadow-header relative z-10">
        <div className="flex items-center justify-between px-2">
          <div className="w-56 shrink-0">
            <h1 className="text-2xl font-black text-ink uppercase tracking-tight">Upload</h1>
            <p className="text-slate-500 text-sm font-medium">Smart field extraction</p>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setStep(1)} className={`flex flex-col items-center transition-colors hover:opacity-80 ${step >= 1 ? 'text-ceremony' : 'text-slate-300'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black mb-1 ${step >= 1 ? 'border-ceremony' : 'border-slate-200'}`}>1</div>
                <span className="text-[10px] font-black uppercase">Context</span>
             </button>
             <div className="w-8 h-px bg-steel mt-[-16px]" />
             <div className={`flex flex-col items-center ${step >= 2 ? 'text-ceremony' : 'text-slate-300'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black mb-1 ${step >= 2 ? 'border-ceremony' : 'border-slate-200'}`}>2</div>
                <span className="text-[10px] font-black uppercase">Scan</span>
             </div>
             <div className="w-8 h-px bg-steel mt-[-16px]" />
             <div className={`flex flex-col items-center ${step >= 3 ? 'text-ceremony' : 'text-slate-300'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black mb-1 ${step >= 3 ? 'border-ceremony' : 'border-slate-200'}`}>3</div>
                <span className="text-[10px] font-black uppercase">Review</span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-2 bg-gradient-to-b from-black/10 to-transparent shrink-0" />
        <div className="flex-1 overflow-auto bg-paper/30 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
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
                onChange={handleContextChange} 
                contexts={contexts || []} 
              />
              <p className="mt-4 text-xs text-slate-400 italic">Select a context to load its extraction rules.</p>
            </div>
          </section>

          {/* Step 2: Drop Zone (Scan) */}
          {step >= 2 && selectedContext && (
             <section className={`bg-white border-2 p-12 rounded-md transition-all text-center ${step === 2 ? 'border-ceremony shadow-xl' : 'border-steel opacity-50'}`}>
                {step === 2 ? (
                    <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileDrop}
                        className="border-2 border-dashed border-steel rounded-lg p-12 flex flex-col items-center justify-center bg-paper/50 hover:bg-ceremony/5 hover:border-ceremony transition-all cursor-pointer group"
                        onClick={() => document.getElementById('fileInput')?.click()}
                    >
                        <input id="fileInput" type="file" multiple accept=".xml" className="hidden" onChange={handleFileSelect} />
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                            {isScanning ? <Loader2 className="w-8 h-8 text-ceremony animate-spin" /> : <Upload className="w-8 h-8 text-ceremony" />}
                        </div>
                        <h3 className="text-lg font-black text-ink uppercase tracking-tight">{isScanning ? 'Scanning Files...' : 'Drop XML Files to Scan'}</h3>
                        <p className="text-slate-400 text-sm mt-1">{isScanning ? 'Extracting metadata based on rules...' : 'We will attempt to automatically extract metadata.'}</p>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-mint" />
                        <span className="font-bold">Files Scanned</span>
                        <button onClick={() => setStep(2)} className="text-xs text-ceremony hover:underline ml-2">Rescan</button>
                    </div>
                )}
             </section>
          )}

          {/* Step 3: Bin Review */}
          {step === 3 && selectedContext && (
             <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-ink uppercase tracking-tight">Review & Submit</h2>
                    <button onClick={resetUpload} className="text-xs text-slate-400 hover:text-error-500">Cancel & Restart</button>
                </div>
                
                {bins.length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 border border-steel rounded text-slate-400 italic">
                        No files found.
                    </div>
                ) : (
                    bins.map(bin => (
                        <BinRow 
                            key={bin.id} 
                            bin={bin} 
                            context={selectedContext} 
                            onUpdate={(meta) => updateBinMetadata(bin.id, meta)}
                            onSubmit={() => submitBin(bin.id, contextId)}
                        />
                    ))
                )}
             </div>
          )}
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default UploadPage;