import React, { useState, useRef } from 'react';
import { X, Sparkles, Upload, GitBranch, FolderArchive, Trash2, ShieldCheck, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { RelayNode } from '../../services/types';
import { relayService } from '../../services/RelayService';
import { driveUploadService } from '@sdkwork/modelkit-pc-core/host';

interface SubmitRelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoriesList: { id: string; label: string }[];
  onRelaySubmitted: (newRelay: RelayNode) => void;
}

export function SubmitRelayModal({ isOpen, onClose, categoriesList, onRelaySubmitted }: SubmitRelayModalProps) {
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [newSiteCategory, setNewSiteCategory] = useState('LLM');
  const [newSiteDesc, setNewSiteDesc] = useState('');
  const [newSiteEmail, setNewSiteEmail] = useState('');
  const [publishSourceType, setPublishSourceType] = useState<'git' | 'zip'>('git');
  const [repoUrl, setRepoUrl] = useState('');
  const [zipFileBase64, setZipFileBase64] = useState<string | null>(null);
  const [zipFileName, setZipFileName] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isDragOverScreens, setIsDragOverScreens] = useState(false);
  const [isDragOverZip, setIsDragOverZip] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setZipFileBase64(event.target.result as string);
          setZipFileName(file.name);
          toast.success(`ZIP package selected: ${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleZipDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverZip(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip') || file.type.includes('zip') || file.type.includes('archive')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setZipFileBase64(event.target.result as string);
            setZipFileName(file.name);
            toast.success(`ZIP dropped: ${file.name}`);
          }
        };
        reader.readAsDataURL(file);
      } else {
        toast.error('Please upload a valid ZIP package');
      }
    }
  };

  const handleScreenshotsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      files.forEach((file: File) => {
        // Screenshots upload through the shared Drive service and store the
        // drive:// reference — never a base64 data URL (DRIVE_SPEC.md §18).
        void driveUploadService
          .uploadMedia(file)
          .then((uploaded) => {
            setScreenshots(prev => [...prev, uploaded.uri].slice(0, 3));
            toast.success(`Screenshot selected: ${file.name}`);
          })
          .catch(() => toast.error(`Screenshot upload failed: ${file.name}`));
      });
    }
  };

  const handleScreenshotsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverScreens(false);
    if (e.dataTransfer.files) {
      const files = (Array.from(e.dataTransfer.files) as File[]).filter((f: File) => f.type.startsWith('image/'));
      files.forEach((file: File) => {
        void driveUploadService
          .uploadMedia(file)
          .then((uploaded) => {
            setScreenshots(prev => [...prev, uploaded.uri].slice(0, 3));
            toast.success(`Screenshot dropped: ${file.name}`);
          })
          .catch(() => toast.error(`Screenshot upload failed: ${file.name}`));
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName || !newSiteUrl || !newSiteDesc) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const newSite = await relayService.publishNode({
        name: newSiteName,
        category: newSiteCategory,
        url: newSiteUrl,
        desc: newSiteDesc,
        email: newSiteEmail,
        sourceType: publishSourceType,
        repoUrl: publishSourceType === 'git' ? repoUrl : (publishSourceType as any),
        zipFileName: publishSourceType === 'zip' ? zipFileName : undefined,
        screenshots: screenshots
      });

      onRelaySubmitted(newSite);
      toast.success('Website submitted successfully!');
    } catch (e) {
      toast.error('Submission failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-divider">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-divider bg-panel flex justify-between items-center sm:px-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500/20 to-primary-main/20 text-indigo-400 p-2 rounded-lg border border-indigo-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-main leading-tight">Host AI Project</h2>
              <p className="text-sm text-text-muted mt-0.5">Deploy your local node logic for wider access</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-main transition-colors rounded-lg hover:bg-surface-hover border border-transparent hover:border-divider"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <form id="relayPublishForm" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  Node Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Text-to-Image Proxy"
                  value={newSiteName}
                  onChange={e => setNewSiteName(e.target.value)}
                  className="w-full bg-panel border gap-2 border-divider-strong rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  Network Protocol Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={newSiteCategory}
                  onChange={e => setNewSiteCategory(e.target.value)}
                  className="w-full bg-panel border-divider-strong rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer border shadow-inner"
                >
                  {categoriesList.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                  {!categoriesList.some(c => c.id === 'LLM') && <option value="LLM">Text/Chat & Logic</option>}
                </select>
              </div>
            </div>

            <div className="space-y-2 relative">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                Primary Host URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 font-mono text-sm">
                  https://
                </div>
                <input
                  type="text"
                  required
                  placeholder="my-proxy.network.local"
                  value={newSiteUrl}
                  onChange={e => setNewSiteUrl(e.target.value)}
                  className="w-full bg-panel border border-divider-strong rounded-xl pl-16 pr-4 py-3 text-sm text-text-main font-mono focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                 Runtime Source Code Type
               </label>
               <div className="flex gap-4">
                 <button
                   type="button"
                   onClick={() => setPublishSourceType('git')}
                   className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-[13px] font-bold transition-all ${publishSourceType === 'git' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 ring-1 ring-indigo-500/20' : 'bg-surface border-divider text-text-muted hover:border-divider-strong'}`}
                 >
                   <GitBranch size={16}/> Link GitHub Repository
                 </button>
                 <button
                   type="button"
                   onClick={() => setPublishSourceType('zip')}
                   className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-[13px] font-bold transition-all ${publishSourceType === 'zip' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 ring-1 ring-indigo-500/20' : 'bg-surface border-divider text-text-muted hover:border-divider-strong'}`}
                 >
                   <FolderArchive size={16}/> Upload Node.js Bundle (ZIP)
                 </button>
               </div>
            </div>

            {publishSourceType === 'git' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  Remote Git Repository
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/organization/api-relay.git"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  className="w-full bg-panel border border-divider-strong rounded-xl px-4 py-3 text-sm font-mono text-text-main focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner placeholder:text-zinc-600"
                />
              </div>
            )}

            {publishSourceType === 'zip' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  Zip Application Archive
                </label>
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragOverZip(true); }}
                  onDragLeave={() => setIsDragOverZip(false)}
                  onDrop={handleZipDrop}
                  onClick={() => zipInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDragOverZip 
                      ? 'border-indigo-500 bg-indigo-500/10' 
                      : zipFileName
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-divider hover:border-divider-strong hover:bg-surface-hover bg-panel'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={zipInputRef} 
                    onChange={handleZipChange} 
                    accept=".zip,application/zip" 
                    className="hidden" 
                  />
                  
                  {zipFileName ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <FolderArchive size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-text-main">{zipFileName}</p>
                        <p className="text-xs text-text-muted">Archive ready to be built</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} className="text-text-muted mb-3" />
                      <p className="text-sm font-bold text-text-main mb-1">Upload Archive Container</p>
                      <p className="text-xs text-text-muted flex items-center gap-1.5">
                        <ShieldCheck size={12}/> Automatically audited securely via Node.js Daemon
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
                <div>Description / Architecture Details <span className="text-red-500">*</span></div>
              </label>
              <textarea
                required
                placeholder="Describe your routing topology..."
                value={newSiteDesc}
                onChange={e => setNewSiteDesc(e.target.value)}
                rows={4}
                className="w-full bg-panel border-divider-strong border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-indigo-500/50 transition-colors resize-none placeholder:text-zinc-600 shadow-inner"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
                <div>Dashboard Preview Screenshots</div>
                <span className="text-[10px] bg-surface-hover px-1.5 py-0.5 rounded text-text-muted">{screenshots.length} / 3</span>
              </label>
              <div 
                className={`w-full rounded-xl border border-dashed p-4 grid grid-cols-3 gap-3 transition-colors ${
                  isDragOverScreens ? 'border-indigo-500 bg-indigo-500/5' : 'border-divider bg-panel hover:bg-surface-hover/30 hover:border-divider-strong cursor-pointer'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOverScreens(true); }}
                onDragLeave={() => setIsDragOverScreens(false)}
                onDrop={handleScreenshotsDrop}
                onClick={() => screenshots.length < 3 && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleScreenshotsSelect} 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                />
                
                {screenshots.map((src, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-divider group">
                    <img src={src} alt="Upload" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setScreenshots(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 backdrop-blur text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))}
                
                {screenshots.length < 3 && (
                  <div className="aspect-video rounded-lg border border-dashed border-divider bg-surface flex flex-col items-center justify-center text-text-muted hover:border-indigo-500/50 hover:text-indigo-400 transition-colors pointer-events-none">
                    <Upload size={16} className="mb-1" />
                    <span className="text-[10px] uppercase font-bold">Add Image</span>
                  </div>
                )}
              </div>
            </div>

          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-divider bg-panel flex justify-between items-center sm:px-8">
          <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase tracking-wider font-bold">
            <Activity size={12} className="text-emerald-500" /> System Link Ready
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-text-muted hover:text-text-main transition-colors hover:bg-surface-hover"
            >
              Discard
            </button>
            <button 
              type="submit" 
              form="relayPublishForm"
              className="px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-primary-dark to-primary-main text-white hover:from-primary-main hover:to-primary-light transition-all shadow-[0_4px_12px_var(--color-primary-alpha)] hover:shadow-[0_8px_24px_var(--color-primary-alpha)] active:scale-95"
            >
              Deploy & List Node
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
