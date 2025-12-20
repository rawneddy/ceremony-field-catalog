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
    }
  };

  const handleChangeContext = () => {
    clearBins();
    setStep(1);
  };

  const handleRescan = () => {
    clearBins();
    setStep(2);
  };

  const resetUpload = () => {
    clearBins();
    setStep(1);
    setContextId('');
  };

  const totalFiles = bins.reduce((sum, bin) => sum + bin.files.length, 0);
  const totalFields = bins.reduce((sum, bin) => sum + bin.fieldCount, 0);
  const totalAttributes = bins.reduce((sum, bin) => sum + bin.attributeCount, 0);

  return (
    <Layout>
      <div className="bg-paper p-6 shrink-0 shadow-header relative z-10">
        <div className="flex items-center justify-between px-2">
          <div className="w-56 shrink-0">
            <h1 className="text-2xl font-black text-ink uppercase tracking-tight">Upload</h1>
            <p className="text-slate-500 text-sm font-medium">Smart field extraction</p>
          </div>
          <div className="flex items-center gap-4">
             <button
               onClick={step > 1 ? handleChangeContext : undefined}
               disabled={step === 1}
               className={`flex flex-col items-center transition-colors ${step > 1 ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} ${step >= 1 ? 'text-ceremony' : 'text-slate-300'}`}
             >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black mb-1 ${step >= 1 ? 'border-ceremony' : 'border-slate-200'}`}>1</div>
                <span className="text-[10px] font-black uppercase">Context</span>
             </button>
             <div className="w-8 h-px bg-steel mt-[-16px]" />
             <button
               onClick={step > 2 ? handleRescan : undefined}
               disabled={step <= 2}
               className={`flex flex-col items-center transition-colors ${step > 2 ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} ${step >= 2 ? 'text-ceremony' : 'text-slate-300'}`}
             >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black mb-1 ${step >= 2 ? 'border-ceremony' : 'border-slate-200'}`}>2</div>
                <span className="text-[10px] font-black uppercase">Scan</span>
             </button>
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
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-ceremony" />
              <div>
                <h2 className="text-lg font-black text-ink uppercase tracking-tight">Select Context</h2>
                <p className="text-slate-500 text-xs">Choose the observation point for your data</p>
              </div>
            </div>
            <section className={`bg-white border-2 p-8 rounded-md transition-all ${step === 1 ? 'border-ceremony shadow-xl' : 'border-steel opacity-50'}`}>
              {step === 1 ? (
                <div className="max-w-md">
                  <label className="block text-xs font-bold uppercase tracking-tight text-ink mb-2">Target Context</label>
                  <ContextSelector
                    value={contextId}
                    onChange={handleContextChange}
                    contexts={contexts || []}
                  />
                  <p className="mt-4 text-xs text-slate-400 italic">Select a context to load its extraction rules.</p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-mint" />
                    <span className="text-slate-500"><span className="font-bold text-ink">{selectedContext?.displayName}</span> Selected</span>
                  </div>
                  <button onClick={handleChangeContext} className="text-xs text-ceremony hover:underline">Change</button>
                </div>
              )}
            </section>
          </div>

          {/* Step 2: Drop Zone (Scan) */}
          {step >= 2 && selectedContext && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-ceremony" />
                <div>
                  <h2 className="text-lg font-black text-ink uppercase tracking-tight">Scan Files</h2>
                  <p className="text-slate-500 text-xs">Upload XML files to extract field observations</p>
                </div>
              </div>
              <section className={`bg-white border-2 p-8 rounded-md transition-all ${step === 2 ? 'border-ceremony shadow-xl' : 'border-steel opacity-50'}`}>
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
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-mint" />
                      <span className="text-slate-500">
                        <span className="font-bold text-ink">{totalFiles} {totalFiles === 1 ? 'File' : 'Files'}</span> Scanned
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="font-bold text-ink">{totalFields.toLocaleString()}</span> Fields
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="font-bold text-ink">{totalAttributes.toLocaleString()}</span> Attributes
                      </span>
                    </div>
                    <button onClick={handleRescan} className="text-xs text-ceremony hover:underline">Rescan</button>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Step 3: Bin Review */}
          {step === 3 && selectedContext && (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-ceremony" />
                  <div>
                    <h2 className="text-lg font-black text-ink uppercase tracking-tight">Review & Submit</h2>
                    <p className="text-slate-500 text-xs">Verify metadata and submit observations</p>
                  </div>
                </div>
                <button onClick={resetUpload} className="text-xs text-slate-400 hover:text-error-500">Cancel & Restart</button>
              </div>
              <section className="bg-white border-2 border-ceremony shadow-xl p-6 rounded-md transition-all">
                {bins.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic">
                    No files found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bins.map(bin => (
                      <BinRow
                        key={bin.id}
                        bin={bin}
                        context={selectedContext}
                        onUpdate={(meta) => updateBinMetadata(bin.id, meta)}
                        onSubmit={() => submitBin(bin.id, contextId)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default UploadPage;