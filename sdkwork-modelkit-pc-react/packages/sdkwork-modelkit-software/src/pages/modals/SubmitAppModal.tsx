import React, { useState, useRef } from 'react';
import { X, Upload, Apple, CheckCircle2, Monitor, Terminal, ImageIcon, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { SoftwareItem } from '../../services/types';
import { softwareService } from '../../services/SoftwareService';
import { driveUploadService } from '@sdkwork/modelkit-pc-core/host';

interface SubmitAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onAppSubmitted: (newApp: SoftwareItem) => void;
}

export function SubmitAppModal({ isOpen, onClose, categories, onAppSubmitted }: SubmitAppModalProps) {
  const [modalStep, setModalStep] = useState(1);

  // Form states for Submit Soft App
  const [newAppName, setNewAppName] = useState('');
  const [newAppPublisher, setNewAppPublisher] = useState('');
  const [newAppCategory, setNewAppCategory] = useState('Development (IDE)');
  const [newAppVersion, setNewAppVersion] = useState('1.0.0');
  const [newAppOS, setNewAppOS] = useState<string[]>(['macOS']);
  const [newAppSize, setNewAppSize] = useState('45 MB');
  const [newAppWebsite, setNewAppWebsite] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppTags, setNewAppTags] = useState('');

  // Icon and screenshots upload
  const [newAppIcon, setNewAppIcon] = useState<string>('');
  const [newAppIconName, setNewAppIconName] = useState('');
  const [newAppScreenshots, setNewAppScreenshots] = useState<string[]>([]);
  const [isIconDragging, setIsIconDragging] = useState(false);
  const [isScreenDragging, setIsScreenDragging] = useState(false);

  const iconInputRef = useRef<HTMLInputElement>(null);
  const screenInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      void driveUploadService
        .uploadMedia(file)
        .then((uploaded) => {
          setNewAppIcon(uploaded.uri);
          setNewAppIconName(file.name);
          toast.success(`Icon selected: ${file.name}`);
        })
        .catch(() => toast.error(`Icon upload failed: ${file.name}`));
    }
  };

  const handleScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      files.forEach((file: File) => {
        void driveUploadService
          .uploadMedia(file)
          .then((uploaded) => {
            setNewAppScreenshots(prev => [...prev, uploaded.uri].slice(0, 3));
            toast.success(`Screenshot selected: ${file.name}`);
          })
          .catch(() => toast.error(`Screenshot upload failed: ${file.name}`));
      });
    }
  };

  const handleIconDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsIconDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        void driveUploadService
          .uploadMedia(file)
          .then((uploaded) => {
            setNewAppIcon(uploaded.uri);
            setNewAppIconName(file.name);
            toast.success(`Icon dropped: ${file.name}`);
          })
          .catch(() => toast.error(`Icon upload failed: ${file.name}`));
      } else {
        toast.error('Only image files are supported');
      }
    }
  };

  const handleScreenDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsScreenDragging(false);
    if (e.dataTransfer.files) {
      const files = (Array.from(e.dataTransfer.files) as File[]).filter((f: File) => f.type.startsWith('image/'));
      files.forEach((file: File) => {
        void driveUploadService
          .uploadMedia(file)
          .then((uploaded) => {
            setNewAppScreenshots(prev => [...prev, uploaded.uri].slice(0, 3));
            toast.success(`Screenshot dropped: ${file.name}`);
          })
          .catch(() => toast.error(`Screenshot upload failed: ${file.name}`));
      });
    }
  };

  const handleToggleOS = (os: string) => {
    if (newAppOS.includes(os)) {
      setNewAppOS(newAppOS.filter(item => item !== os));
    } else {
      setNewAppOS([...newAppOS, os]);
    }
  };

  const handleSubmitApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName || !newAppPublisher || !newAppDesc) {
      toast.error('Please complete all required fields and step checks');
      return;
    }

    try {
      const newAppItem = await softwareService.submitSoftware({
        name: newAppName,
        publisher: newAppPublisher,
        category: newAppCategory || 'Development (IDE)',
        version: newAppVersion,
        os: newAppOS.length > 0 ? newAppOS : ['macOS'],
        size: newAppSize,
        website: newAppWebsite || 'https://google.com',
        desc: newAppDesc
      });

      if (newAppIcon) newAppItem.icon = newAppIcon;
      if (newAppTags) newAppItem.tags = newAppTags.split(',').map(t => t.trim());
      if (newAppScreenshots.length > 0) newAppItem.screenshots = newAppScreenshots;

      onAppSubmitted(newAppItem);
      onClose();
      toast.success('Software application published successfully!');
    } catch (e) {
      toast.error('Failed to submit application');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-panel border border-divider rounded-3xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 text-text-main">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-divider flex justify-between items-center bg-canvas">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-main/10 text-primary-main flex items-center justify-center border border-[var(--color-primary-alpha)]">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-main">Register SDK / Application</h2>
              <p className="text-[11px] text-text-muted mt-1 uppercase tracking-wider font-bold">Publish your artifact</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-8 h-8 rounded-full border border-divider hover:bg-surface-hover flex items-center justify-center text-text-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Wizard Progress Indication */}
        <div className="flex items-center justify-center gap-2 py-4 bg-surface border-b border-divider select-none">
          {[1, 2, 3].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center gap-2">
              <div 
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  modalStep >= stepNumber 
                    ? 'bg-primary-main text-white border-primary-main' 
                    : 'bg-panel border border-divider text-text-muted'
                } transition-all`}
              >
                {stepNumber}
              </div>
              {stepNumber < 3 && (
                <div className={`w-8 h-px ${modalStep > stepNumber ? 'bg-primary-hover' : 'bg-divider'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Body wrapping steps */}
        <form onSubmit={handleSubmitApp} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            
            {/* STEP 1: Basic Identity */}
            {modalStep === 1 && (
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-5">
                <p className="text-xs text-text-muted font-medium mb-2 uppercase tracking-widest text-center">Step 1: Application Identity</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-main flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-hover"></span> App Name *
                    </label>
                    <input 
                      type="text" 
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                      placeholder="e.g. ModelKit Studio IDE"
                      className="w-full bg-surface border border-divider rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary-main focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-main flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-hover"></span> Publisher *
                    </label>
                    <input 
                      type="text" 
                      value={newAppPublisher}
                      onChange={(e) => setNewAppPublisher(e.target.value)}
                      placeholder="e.g. SDKWork Labs"
                      className="w-full bg-surface border border-divider rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary-main focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-main">Category Taxonomy</label>
                    <select 
                      value={newAppCategory}
                      onChange={(e) => setNewAppCategory(e.target.value)}
                      className="w-full bg-surface border border-divider rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary-main focus:ring-1 focus:ring-blue-500 transition-all custom-select"
                    >
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-main flex items-center gap-1.5">
                      Initial Version
                    </label>
                    <input 
                      type="text" 
                      value={newAppVersion}
                      onChange={(e) => setNewAppVersion(e.target.value)}
                      placeholder="SemVer (e.g. 1.0.0)"
                      className="w-full bg-surface border border-divider rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary-main focus:ring-1 focus:ring-blue-500 transition-all font-mono placeholder:text-zinc-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-main">Developer Website / GitHub Repo</label>
                  <input 
                    type="text" 
                    value={newAppWebsite}
                    onChange={(e) => setNewAppWebsite(e.target.value)}
                    placeholder="https://"
                    className="w-full bg-surface border border-divider rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary-main focus:ring-1 focus:ring-blue-500 transition-all font-mono placeholder:text-zinc-500"
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 2: Architecture & Content */}
            {modalStep === 2 && (
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">
                <p className="text-xs text-text-muted font-medium mb-2 uppercase tracking-widest text-center">Step 2: Arch & Content Specifications</p>
                
                <div className="space-y-3">
                  <label className="text-xs font-bold text-text-main">Supported Architectures</label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { id: 'macOS', icon: <Apple size={14}/> },
                      { id: 'Windows', icon: <Monitor size={14}/> },
                      { id: 'Linux', icon: <Terminal size={14}/> }
                    ].map(os => {
                      const isSelected = newAppOS.includes(os.id);
                      return (
                        <button
                          key={os.id}
                          type="button"
                          onClick={() => handleToggleOS(os.id)}
                          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border transition-all ${
                            isSelected 
                              ? 'border-primary-main bg-primary-main/10 text-primary-main shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20' 
                              : 'border-divider bg-surface text-text-muted hover:text-text-main hover:border-gray-500'
                          }`}
                        >
                          {os.icon}
                          <span className="text-[13px] font-bold">{os.id}</span>
                          {isSelected && <CheckCircle2 size={13} className="ml-1" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-divider pt-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-main">Package Size (Approx)</label>
                    <input 
                      type="text" 
                      value={newAppSize}
                      onChange={(e) => setNewAppSize(e.target.value)}
                      className="w-full bg-surface border border-divider rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary-main transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-main">Metadata Tags (CSV)</label>
                    <input 
                      type="text" 
                      value={newAppTags}
                      onChange={(e) => setNewAppTags(e.target.value)}
                      placeholder="e.g. IDE, Typescript, Web3"
                      className="w-full bg-surface border border-divider rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary-main transition-all font-mono placeholder:text-zinc-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-main flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-hover"></span> Public Description *
                  </label>
                  <textarea 
                    value={newAppDesc}
                    onChange={(e) => setNewAppDesc(e.target.value)}
                    placeholder="Provide a detailed description of features, architectures and release notes..."
                    rows={4}
                    className="w-full bg-surface border border-divider rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary-main focus:ring-1 focus:ring-blue-500 transition-all resize-none placeholder:text-zinc-500 custom-scrollbar"
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 3: Media & Graphics Assets */}
            {modalStep === 3 && (
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">
                <p className="text-xs text-text-muted font-medium mb-2 uppercase tracking-widest text-center">Step 3: Media & Screenshots</p>
                
                <div className="grid grid-cols-[120px_1fr] gap-6 items-start bg-surface p-5 rounded-2xl border border-divider">
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-text-muted text-center">App Logo</p>
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsIconDragging(true); }}
                      onDragLeave={() => setIsIconDragging(false)}
                      onDrop={handleIconDrop}
                      onClick={() => iconInputRef.current?.click()}
                      className={`w-24 h-24 mx-auto rounded-3xl overflow-hidden border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${
                        isIconDragging
                          ? 'border-primary-main bg-primary-main/10'
                          : newAppIcon 
                            ? 'border-primary-main/40 bg-surface' 
                            : 'border-divider hover:border-divider-strong bg-panel'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={iconInputRef}
                        onChange={handleIconChange}
                        accept="image/*"
                        className="hidden" 
                      />
                      {newAppIcon ? (
                        <img src={newAppIcon} alt="Icon Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 opacity-50">
                          <ImageIcon size={22} />
                          <span className="text-[10px] uppercase font-bold text-center leading-tight">Drop<br/>Logo</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-1">
                    <p className="text-[11px] font-bold text-text-muted mt-1 uppercase tracking-wider">Showcase Gallery (Up to 3)</p>
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsScreenDragging(true); }}
                      onDragLeave={() => setIsScreenDragging(false)}
                      onDrop={handleScreenDrop}
                      onClick={() => screenInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        isScreenDragging 
                          ? 'border-primary-main bg-primary-main/5' 
                          : newAppScreenshots.length > 0 
                            ? 'border-primary-main/40 bg-surface' 
                            : 'border-divider hover:border-divider-strong bg-panel'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={screenInputRef}
                        onChange={handleScreenshotsChange}
                        accept="image/*"
                        multiple
                        className="hidden" 
                      />
                      <div className="flex flex-col items-center justify-center gap-1">
                        <ImageIcon className="w-5 h-5 text-text-muted mb-1" />
                        <p className="text-xs font-semibold text-text-main">Drag or select screenshots</p>
                        <p className="text-[10px] text-text-muted font-normal">{newAppScreenshots.length}/3 loaded</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image preview lists */}
                {newAppScreenshots.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-divider animate-in fade-in duration-200">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Screenshot Previews (Click X to discard)</p>
                    <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
                      {newAppScreenshots.map((src, idx) => (
                        <div key={idx} className="relative w-28 h-16 bg-surface-hover rounded-lg overflow-hidden border border-divider-strong shrink-0">
                          <img src={src} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewAppScreenshots(newAppScreenshots.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-1 right-1 bg-black/75 p-0.5 rounded-full text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </div>

          {/* Steps control footer */}
          <div className="px-6 py-5 border-t border-divider bg-canvas flex justify-between items-center font-sans">
            <div>
              {modalStep > 1 && (
                <button 
                  type="button" 
                  onClick={() => setModalStep(modalStep - 1)} 
                  className="px-5 py-2.5 text-[13px] font-bold text-text-main hover:text-text-main transition-colors rounded-lg bg-surface border border-divider flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Back
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-5 py-2.5 text-[13px] font-bold text-text-muted hover:text-text-main transition-colors rounded-lg hover:bg-surface-hover"
              >
                Cancel
              </button>
              
              {modalStep < 3 ? (
                <button 
                  type="button" 
                  onClick={() => {
                    if (modalStep === 1 && (!newAppName || !newAppPublisher)) {
                      toast.error('Please fill in required fields (App Name and Publisher)');
                      return;
                    }
                    setModalStep(modalStep + 1);
                  }}
                  className="px-6 py-2.5 rounded-lg text-[13px] font-bold bg-primary-main text-white hover:bg-primary-hover shadow-md flex items-center gap-1"
                >
                  Next Step <ChevronRight size={14} />
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="px-6 py-2.5 rounded-lg text-[13px] font-bold bg-surface text-text-main shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Publish Software
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
