import React, { useState, useEffect, useCallback } from 'react';
import { ImageSettings, ProcessedImage, CropConfig, Unit } from '../types';
import { processImageClientSide, formatBytes } from '../services/imageProcessing';
import { Button } from './Button';

interface CompressorProps {
  originalFile: File;
}

export const Compressor: React.FC<CompressorProps> = ({ originalFile }) => {
  const [originalDimensions, setOriginalDimensions] = useState<{w: number, h: number} | null>(null);

  const [settings, setSettings] = useState<ImageSettings>({
    quality: 0.8,
    scale: 1,
    format: originalFile.type === 'image/png' ? 'image/png' : 'image/jpeg' as any,
    rotation: 0,
    crop: undefined,
  });

  const [appliedSettings, setAppliedSettings] = useState<ImageSettings | null>(null);

  const [isCropOpen, setIsCropOpen] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [cropUnit, setCropUnit] = useState<Unit>(Unit.PX);
  const [cropMode, setCropMode] = useState<'dims' | 'insets'>('dims');
  const [cropDimensions, setCropDimensions] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [viewMode, setViewMode] = useState<'single' | 'split'>('single');
  const [isComparing, setIsComparing] = useState(false);
  const [lockedRatio, setLockedRatio] = useState<number | null>(null);
  const [customRatio, setCustomRatio] = useState({ w: 1, h: 1 });
  const [isRatioLocked, setIsRatioLocked] = useState(false);

  const DPI = 96;
  const toPx = (val: number, unit: Unit) => {
    if (unit === Unit.CM) return val * (DPI / 2.54);
    if (unit === Unit.MM) return val * (DPI / 25.4);
    return val;
  };

  const fromPx = (val: number, unit: Unit) => {
    if (unit === Unit.CM) return val * (2.54 / DPI);
    if (unit === Unit.MM) return val * (25.4 / DPI);
    return val;
  };

  const formatUnit = (val: number) => {
    return parseFloat(val.toFixed(2));
  };

  const applyAnchor = (anchor: string) => {
    if (!originalDimensions) return;
    const { w, h } = originalDimensions;
    const { width, height } = cropDimensions;
    
    let newX = cropDimensions.x;
    let newY = cropDimensions.y;

    switch (anchor) {
        case 'tl': newX = 0; newY = 0; break;
        case 'tc': newX = (w - width) / 2; newY = 0; break;
        case 'tr': newX = w - width; newY = 0; break;
        case 'lc': newX = 0; newY = (h - height) / 2; break;
        case 'cc': newX = (w - width) / 2; newY = (h - height) / 2; break;
        case 'rc': newX = w - width; newY = (h - height) / 2; break;
        case 'bl': newX = 0; newY = h - height; break;
        case 'bc': newX = (w - width) / 2; newY = h - height; break;
        case 'br': newX = w - width; newY = h - height; break;
    }
    
    setCropDimensions(prev => ({ ...prev, x: Math.max(0, Math.floor(newX)), y: Math.max(0, Math.floor(newY)) }));
  };

  const applyLockedRatio = useCallback((ratio: number | null) => {
    if (!ratio || !originalDimensions) return;
    const { w, h } = originalDimensions;
    let newWidth = w;
    let newHeight = w / ratio;

    if (newHeight > h) {
        newHeight = h;
        newWidth = h * ratio;
    }

    setCropDimensions(prev => ({
        ...prev,
        x: Math.floor((w - newWidth) / 2),
        y: Math.floor((h - newHeight) / 2),
        width: Math.floor(newWidth),
        height: Math.floor(newHeight)
    }));
  }, [originalDimensions]);

  const handleRatioSelect = (ratio: number | null) => {
    setLockedRatio(ratio);
    if (ratio) {
        setIsRatioLocked(true);
        applyLockedRatio(ratio);
    } else {
        setIsRatioLocked(false);
    }
  };

  const [processed, setProcessed] = useState<ProcessedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const newSettings: ImageSettings = {
        quality: 0.8,
        scale: 1,
        format: originalFile.type === 'image/png' ? 'image/png' : 'image/jpeg' as any,
        rotation: 0,
        crop: undefined
    };

    const img = new Image();
    const url = URL.createObjectURL(originalFile);
    setOriginalUrl(url);
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      setOriginalDimensions({ w, h });
      setCropDimensions({ x: 0, y: 0, width: w, height: h });
      
      // Auto-apply initial settings for the first load
      setSettings(newSettings);
      setAppliedSettings(newSettings);
    };
    img.src = url;
    
    setIsCropOpen(false);
    setProcessed(null);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [originalFile]);

  useEffect(() => {
    if (!originalDimensions) return;
    
    const { x, y, width, height } = cropDimensions;
    
    // If it's the full image, don't apply crop settings
    if (x === 0 && y === 0 && width === originalDimensions.w && height === originalDimensions.h) {
        setSettings(s => ({ ...s, crop: undefined }));
        return;
    }

    if (width > 0 && height > 0) {
        const newCrop: CropConfig = { x, y, width, height };
        setSettings(s => ({ ...s, crop: newCrop }));
    }
  }, [cropDimensions, originalDimensions]);

  const process = useCallback(async () => {
    if (!appliedSettings) return;
    setIsProcessing(true);
    try {
      const result = await processImageClientSide(originalFile, appliedSettings);
      setProcessed(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [originalFile, appliedSettings]);

  useEffect(() => {
    if (appliedSettings) {
      process();
    }
  }, [appliedSettings, process]);

  const handleApply = () => {
    setAppliedSettings({ ...settings });
  };

  const isChanged = !appliedSettings || JSON.stringify(settings) !== JSON.stringify(appliedSettings);

  const rotationStyle = {
    transform: `rotate(${settings.rotation}deg)`,
    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
  };

  const handleDownload = () => {
    if (!processed) return;
    const link = document.createElement('a');
    link.href = processed.url;
    link.download = `optimized_${originalFile.name.split('.')[0]}.${settings.format.split('/')[1]}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Controls (Left) */}
      <div className="lg:col-span-3 h-full bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col gap-6 overflow-y-auto custom-scrollbar shadow-sm">
        
        {/* Edit Section */}
        <div>
           <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
               <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
             </svg>
             Chỉnh sửa
           </h3>
           <div className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
              
              {/* Rotation */}
              <div>
                 <label className="text-sm uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Góc xoay</label>
                 <div className="flex gap-2">
                    <input 
                       type="number" 
                       value={settings.rotation} 
                       onChange={(e) => setSettings({...settings, rotation: Number(e.target.value)})}
                       className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-base focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors"
                    />
                    <div className="flex gap-1 shrink-0">
                        <button onClick={() => setSettings(s => ({...s, rotation: s.rotation - 90}))} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-white p-2 rounded-lg transition-colors" title="-90 độ">
                           <span className="text-xl leading-none">↺</span>
                        </button>
                        <button onClick={() => setSettings(s => ({...s, rotation: s.rotation + 90}))} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-white p-2 rounded-lg transition-colors" title="+90 độ">
                           <span className="text-xl leading-none">↻</span>
                        </button>
                    </div>
                 </div>
              </div>

              {/* Crop Toggle */}
              <div>
                 <button 
                    onClick={() => setIsCropOpen(!isCropOpen)}
                    className={`w-full py-2.5 rounded-lg font-medium text-base transition-all border flex justify-between items-center px-4 ${isCropOpen ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                 >
                    <span>Cắt ảnh (Crop)</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isCropOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                 </button>

                 {isCropOpen && originalDimensions && (
                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-inner">
                       <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
                          {Object.values(Unit).map((u) => (
                             <button
                                key={u}
                                onClick={() => setCropUnit(u)}
                                className={`flex-1 py-1 text-xs font-bold rounded transition-all ${cropUnit === u ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                             >
                                {u.toUpperCase()}
                             </button>
                          ))}
                       </div>

                       <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
                          <button
                             onClick={() => setCropMode('dims')}
                             className={`flex-1 py-1 text-[10px] uppercase font-bold rounded transition-all ${cropMode === 'dims' ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                          >
                             Kích thước
                          </button>
                          <button
                             onClick={() => setCropMode('insets')}
                             className={`flex-1 py-1 text-[10px] uppercase font-bold rounded transition-all ${cropMode === 'insets' ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                          >
                             Cách lề
                          </button>
                       </div>

                       {/* Custom Aspect Ratio & Lock */}
                       <div className="space-y-1.5 p-2 bg-gray-100 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
                          <div className="flex justify-between items-center px-1">
                             <label className="text-[10px] uppercase font-bold text-gray-500">Tỉ lệ Aspect Ratio</label>
                             <button 
                                onClick={() => {
                                    const next = !isRatioLocked;
                                    setIsRatioLocked(next);
                                    if (next) {
                                        const r = customRatio.w / customRatio.h;
                                        setLockedRatio(r);
                                        applyLockedRatio(r);
                                    } else {
                                        setLockedRatio(null);
                                    }
                                }}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold transition-all ${isRatioLocked ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
                             >
                                {isRatioLocked ? (
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                   </svg>
                                ) : (
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                                   </svg>
                                )}
                                {isRatioLocked ? 'Đã khóa' : 'Mở khóa'}
                             </button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <div className="flex-1 flex gap-1">
                                <input 
                                   type="number" 
                                   value={customRatio.w}
                                   onChange={(e) => {
                                      const val = Math.max(0.1, Number(e.target.value));
                                      setCustomRatio(prev => ({ ...prev, w: val }));
                                      if (isRatioLocked) {
                                          const r = val / customRatio.h;
                                          setLockedRatio(r);
                                          applyLockedRatio(r);
                                      }
                                   }}
                                   className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-center font-bold outline-none"
                                   placeholder="W"
                                />
                                <span className="text-gray-400 font-bold">:</span>
                                <input 
                                   type="number" 
                                   value={customRatio.h}
                                   onChange={(e) => {
                                      const val = Math.max(0.1, Number(e.target.value));
                                      setCustomRatio(prev => ({ ...prev, h: val }));
                                      if (isRatioLocked) {
                                          const r = customRatio.w / val;
                                          setLockedRatio(r);
                                          applyLockedRatio(r);
                                      }
                                   }}
                                   className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-center font-bold outline-none"
                                   placeholder="H"
                                />
                             </div>
                             
                             <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />

                             <div className="grid grid-cols-4 gap-1">
                                {[
                                   { l: '1:1', w: 1, h: 1 },
                                   { l: '4:3', w: 4, h: 3 },
                                   { l: '16:9', w: 16, h: 9 },
                                   { l: 'Tự do', w: null, h: null }
                                ].map(p => (
                                   <button 
                                      key={p.l}
                                      onClick={() => {
                                         if (p.w === null) {
                                            setIsRatioLocked(false);
                                            setLockedRatio(null);
                                         } else {
                                            setCustomRatio({ w: p.w, h: p.h });
                                            const r = p.w / p.h;
                                            setLockedRatio(r);
                                            setIsRatioLocked(true);
                                            applyLockedRatio(r);
                                         }
                                      }}
                                      className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:border-primary transition-colors font-medium text-gray-500"
                                   >
                                      {p.l}
                                   </button>
                                ))}
                             </div>
                          </div>
                       </div>

                       {cropMode === 'dims' ? (
                         <>
                          <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Rộng (W)</label>
                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                                    <input 
                                      type="number" 
                                      value={formatUnit(fromPx(cropDimensions.width, cropUnit))}
                                      onChange={(e) => {
                                          const pxVal = toPx(Number(e.target.value), cropUnit);
                                          const safeW = Math.min(pxVal, originalDimensions.w - cropDimensions.x);
                                          setCropDimensions(prev => {
                                              let newH = prev.height;
                                              if (lockedRatio) {
                                                  newH = Math.min(safeW / lockedRatio, originalDimensions.h - prev.y);
                                              }
                                              return { ...prev, width: safeW, height: newH };
                                          });
                                      }}
                                      className="w-full bg-transparent outline-none text-sm font-mono text-gray-900 dark:text-white"
                                    />
                                    <span className="text-[10px] text-gray-400 font-bold">{cropUnit}</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Cao (H)</label>
                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                                    <input 
                                      type="number" 
                                      value={formatUnit(fromPx(cropDimensions.height, cropUnit))}
                                      onChange={(e) => {
                                          const pxVal = toPx(Number(e.target.value), cropUnit);
                                          const safeH = Math.min(pxVal, originalDimensions.h - cropDimensions.y);
                                          setCropDimensions(prev => {
                                              let newW = prev.width;
                                              if (lockedRatio) {
                                                  newW = Math.min(safeH * lockedRatio, originalDimensions.w - prev.x);
                                              }
                                              return { ...prev, height: safeH, width: newW };
                                          });
                                      }}
                                      className="w-full bg-transparent outline-none text-sm font-mono text-gray-900 dark:text-white"
                                    />
                                    <span className="text-[10px] text-gray-400 font-bold">{cropUnit}</span>
                                </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Vị trí X</label>
                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                                    <input 
                                      type="number" 
                                      value={formatUnit(fromPx(cropDimensions.x, cropUnit))}
                                      onChange={(e) => {
                                          const pxVal = toPx(Number(e.target.value), cropUnit);
                                          setCropDimensions(prev => ({ ...prev, x: Math.min(pxVal, originalDimensions.w - prev.width) }));
                                      }}
                                      className="w-full bg-transparent outline-none text-sm font-mono text-gray-900 dark:text-white"
                                    />
                                    <span className="text-[10px] text-gray-400 font-bold">{cropUnit}</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Vị trí Y</label>
                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                                    <input 
                                      type="number" 
                                      value={formatUnit(fromPx(cropDimensions.y, cropUnit))}
                                      onChange={(e) => {
                                          const pxVal = toPx(Number(e.target.value), cropUnit);
                                          setCropDimensions(prev => ({ ...prev, y: Math.min(pxVal, originalDimensions.h - prev.height) }));
                                      }}
                                      className="w-full bg-transparent outline-none text-sm font-mono text-gray-900 dark:text-white"
                                    />
                                    <span className="text-[10px] text-gray-400 font-bold">{cropUnit}</span>
                                </div>
                              </div>
                          </div>
                         </>
                       ) : (
                         <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                            {[
                               { label: 'Trái (L)', key: 'x' },
                               { label: 'Phải (R)', key: 'right' },
                               { label: 'Trên (T)', key: 'y' },
                               { label: 'Dưới (B)', key: 'bottom' }
                            ].map((side) => {
                               const value = side.key === 'x' ? cropDimensions.x :
                                            side.key === 'y' ? cropDimensions.y :
                                            side.key === 'right' ? (originalDimensions.w - cropDimensions.x - cropDimensions.width) :
                                            (originalDimensions.h - cropDimensions.y - cropDimensions.height);
                               return (
                                  <div key={side.key} className="space-y-1">
                                     <label className="text-[10px] uppercase font-bold text-gray-500">{side.label}</label>
                                     <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                                        <input 
                                           type="number" 
                                           value={formatUnit(fromPx(value, cropUnit))}
                                           onChange={(e) => {
                                              const pxVal = toPx(Number(e.target.value), cropUnit);
                                              setCropDimensions(prev => {
                                                 let { x, y, width, height } = prev;
                                                 if (side.key === 'x') {
                                                    const delta = pxVal - x;
                                                    x = pxVal;
                                                    width = Math.max(1, width - delta);
                                                 } else if (side.key === 'y') {
                                                    const delta = pxVal - y;
                                                    y = pxVal;
                                                    height = Math.max(1, height - delta);
                                                 } else if (side.key === 'right') {
                                                    width = Math.max(1, originalDimensions.w - x - pxVal);
                                                 } else if (side.key === 'bottom') {
                                                    height = Math.max(1, originalDimensions.h - y - pxVal);
                                                 }
                                                 return { x, y, width, height };
                                              });
                                           }}
                                           className="w-full bg-transparent outline-none text-sm font-mono text-gray-900 dark:text-white"
                                        />
                                        <span className="text-[10px] text-gray-400 font-bold">{cropUnit}</span>
                                     </div>
                                  </div>
                               );
                            })}
                         </div>
                       )}

                       <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex justify-between items-center mb-1">
                             <label className="text-[10px] uppercase font-bold text-gray-500">Căn lề nhanh (Anchor)</label>
                          </div>
                          <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
                             {['tl', 'tc', 'tr', 'lc', 'cc', 'rc', 'bl', 'bc', 'br'].map(anchor => (
                                <button 
                                   key={anchor}
                                   onClick={() => applyAnchor(anchor)}
                                   className="w-7 h-7 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded hover:bg-primary/20 hover:border-primary transition-colors flex items-center justify-center group"
                                   title={anchor}
                                >
                                   <div className={`w-1.5 h-1.5 rounded-full ${anchor === 'cc' ? 'bg-primary' : 'bg-gray-400 dark:bg-gray-500 group-hover:bg-primary'}`}></div>
                                </button>
                             ))}
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                             <label className="text-[10px] uppercase font-bold text-gray-500">Vị trí X</label>
                             <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                                <input 
                                   type="number" 
                                   value={formatUnit(fromPx(cropDimensions.x, cropUnit))}
                                   onChange={(e) => {
                                      const pxVal = toPx(Number(e.target.value), cropUnit);
                                      setCropDimensions(prev => ({ ...prev, x: Math.min(pxVal, originalDimensions.w - prev.width) }));
                                   }}
                                   className="w-full bg-transparent outline-none text-sm font-mono text-gray-900 dark:text-white"
                                />
                                <span className="text-[10px] text-gray-400 font-bold">{cropUnit}</span>
                             </div>
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] uppercase font-bold text-gray-500">Vị trí Y</label>
                             <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                                <input 
                                   type="number" 
                                   value={formatUnit(fromPx(cropDimensions.y, cropUnit))}
                                   onChange={(e) => {
                                      const pxVal = toPx(Number(e.target.value), cropUnit);
                                      setCropDimensions(prev => ({ ...prev, y: Math.min(pxVal, originalDimensions.h - prev.height) }));
                                   }}
                                   className="w-full bg-transparent outline-none text-sm font-mono text-gray-900 dark:text-white"
                                />
                                <span className="text-[10px] text-gray-400 font-bold">{cropUnit}</span>
                             </div>
                          </div>
                       </div>

                       <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-2">
                          <button 
                             onClick={() => setCropDimensions({ x: 0, y: 0, width: originalDimensions.w, height: originalDimensions.h })}
                             className="text-xs font-bold text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zM3.181 12.046a1 1 0 011.212-.727c.563.15 1.157.227 1.769.227h3.83l-1.623-1.623a1 1 0 011.414-1.414l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L10.586 14H6.162c-1.018 0-2.001-.157-2.924-.447a1 1 0 01-.727-1.213z" clipRule="evenodd" />
                             </svg>
                             Full ảnh
                          </button>
                          <button 
                             onClick={() => setIsCropOpen(false)}
                             className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                          >
                             Đóng
                          </button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Compression Section */}
        <div>
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
            </svg>
            Tùy chỉnh nén
          </h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-base font-medium text-gray-600 dark:text-gray-300">Chất lượng</label>
                <span className="text-base text-primary font-bold">{Math.round(settings.quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={settings.quality}
                onChange={(e) => setSettings({ ...settings, quality: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-base font-medium text-gray-600 dark:text-gray-300">Kích thước (Scale)</label>
                <span className="text-base text-primary font-bold">{Math.round(settings.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={settings.scale}
                onChange={(e) => setSettings({ ...settings, scale: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div>
              <label className="text-base font-medium text-gray-600 dark:text-gray-300 mb-2 block">Định dạng</label>
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                {(['image/jpeg', 'image/png', 'image/webp'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSettings({ ...settings, format: fmt })}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                      settings.format === fmt 
                        ? 'bg-white dark:bg-primary text-primary dark:text-white shadow ring-1 ring-gray-200 dark:ring-0' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                    }`}
                  >
                    {fmt.split('/')[1].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
           <Button 
            onClick={handleApply} 
            disabled={!isChanged || isProcessing}
            variant="secondary"
            className={`w-full py-3 text-lg font-bold border-2 ${isChanged ? 'border-primary text-primary bg-primary/5 animate-pulse-subtle' : 'border-gray-200 text-gray-400'}`}
           >
            {isProcessing ? 'Đang xử lý...' : 'Áp dụng thay đổi'}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
           </Button>

           <div className="flex justify-between items-center text-sm px-1">
              <span className="text-gray-500 dark:text-gray-400">Dung lượng dự kiến:</span>
              <span className={`font-mono font-bold ${processed && processed.size < originalFile.size ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                {processed ? formatBytes(processed.size) : 'Chưa áp dụng'}
              </span>
           </div>
           
           <Button 
            onClick={handleDownload} 
            disabled={!processed || isChanged} 
            className={`w-full py-4 text-xl shadow-xl ${!processed || isChanged ? 'opacity-50 grayscale cursor-not-allowed' : 'shadow-primary/20'}`}
           >
            Tải xuống kết quả
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
           </Button>
           
           {!processed && !isProcessing && (
              <p className="text-[10px] text-center text-gray-400 italic">
                * Nhấn "Áp dụng thay đổi" để xem kết quả và tải xuống
              </p>
           )}
           {processed && isChanged && (
              <p className="text-[10px] text-center text-primary font-medium animate-pulse">
                Bạn có thay đổi chưa áp dụng! Nhấn "Áp dụng" để cập nhật kết quả.
              </p>
           )}
        </div>
      </div>

      {/* Preview (Right) */}
      <div className="lg:col-span-9 h-full bg-gray-100 dark:bg-gray-900/50 rounded-2xl flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 dark:border-gray-700 relative overflow-hidden">
        
        {/* View Toggles & Comparison */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20 pointer-events-none">
           <div className="flex bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-lg p-1 border border-gray-200 dark:border-gray-700 pointer-events-auto shadow-md">
              <button 
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${viewMode === 'single' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                 Màn hình đơn
              </button>
              <button 
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${viewMode === 'split' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                 So sánh (Split)
              </button>
           </div>

           <div className="flex gap-2 pointer-events-auto">
              {processed && (
                 <button 
                   onMouseDown={() => setIsComparing(true)}
                   onMouseUp={() => setIsComparing(false)}
                   onMouseLeave={() => setIsComparing(false)}
                   onTouchStart={() => setIsComparing(true)}
                   onTouchEnd={() => setIsComparing(false)}
                   className={`px-4 py-2 bg-black/60 hover:bg-black/80 text-white rounded-full text-xs font-bold backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 shadow-xl ${isComparing ? 'scale-95 bg-primary' : ''}`}
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Giữ để xem ảnh gốc
                 </button>
              )}
              
              <button 
                 onClick={() => setShowGuidelines(!showGuidelines)}
                 className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all shadow-md bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 ${showGuidelines ? 'text-primary' : 'text-gray-500'}`}
              >
                 {showGuidelines ? 'Hiện Crop' : 'Ẩn Crop'}
              </button>
           </div>
        </div>

        {!processed && isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-dark/80 backdrop-blur-sm z-30 transition-all">
            <div className="flex flex-col items-center gap-4">
               <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent shadow-lg shadow-primary/50"></div>
               <span className="text-primary font-medium tracking-wide animate-pulse text-lg">Đang xử lý...</span>
            </div>
          </div>
        )}

        <div className={`relative w-full h-full flex items-center justify-center p-8 gap-6 ${viewMode === 'split' ? 'bg-gray-50/50 dark:bg-black/20' : ''}`}>
           {/* Original View (Panel Left - Only visible in split mode) */}
           {viewMode === 'split' && (
              <div className="relative flex flex-col items-center justify-center transition-all duration-300 w-1/2">
                 <span className="absolute top-0 left-0 bg-gray-900/60 text-white text-[10px] px-2 py-0.5 rounded-br font-bold z-20">
                    ẢNH GỐC {settings.rotation !== 0 && ` [Xoay ${settings.rotation}°]`}
                 </span>
                 <div className="relative group" style={rotationStyle}>
                    <img 
                       src={originalUrl} 
                       alt="OriginalSource" 
                       className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent" 
                    />
                    
                    {/* Guidelines only on original panel */}
                    {isCropOpen && showGuidelines && !isComparing && originalDimensions && (
                       <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                             <div className="absolute inset-0 bg-black/40"></div>
                             <div 
                                className="absolute border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-10"
                                style={{
                                   width: `${(cropDimensions.width / originalDimensions.w) * 100}%`,
                                   height: `${(cropDimensions.height / originalDimensions.h) * 100}%`,
                                   left: `${(cropDimensions.x / originalDimensions.w) * 100}%`,
                                   top: `${(cropDimensions.y / originalDimensions.h) * 100}%`,
                                }}
                             >
                                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 bg-primary/10">
                                   {[...Array(9)].map((_, i) => (
                                      <div key={i} className="border border-white/20"></div>
                                   ))}
                                </div>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
                 <div className="mt-2 text-[10px] text-gray-500 font-mono">{originalDimensions?.w} x {originalDimensions?.h} px</div>
              </div>
           )}

           {/* Result View (Panel Right or Full Panel) */}
           {(viewMode === 'split' || !isProcessing) && (
              <div className={`relative flex flex-col items-center justify-center transition-all duration-300 ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                 <span className={`absolute top-0 left-0 bg-primary/80 text-white text-[10px] px-2 py-0.5 rounded-br font-bold z-20 ${!processed ? 'animate-pulse' : ''}`}>
                    {isComparing ? 'SO SÁNH (GỐC)' : (isCropOpen && viewMode === 'single' ? 'GỐC (CẮT)' : 'KẾT QUẢ')}
                    {settings.rotation !== 0 && ` [Xoay ${settings.rotation}°]`}
                 </span>
                 
                 <div className="relative group w-full flex items-center justify-center" style={!processed || isComparing || (isCropOpen && viewMode === 'single') ? rotationStyle : {}}>
                    {/* Processing State for this specific view */}
                    {isProcessing && (
                       <div className="absolute inset-0 flex items-center justify-center bg-white/20 dark:bg-black/20 backdrop-blur-[1px] z-30 rounded-lg">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                       </div>
                    )}

                    <img 
                       src={isComparing ? originalUrl : (isCropOpen && viewMode === 'single' ? originalUrl : (processed?.url || originalUrl))} 
                       alt="ResultSource" 
                       className={`max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent transition-all duration-300 ${isChanged && !isComparing ? 'opacity-40 grayscale-[0.3]' : 'opacity-100'}`}
                    />

                    {isChanged && !isComparing && processed && (
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-black/60 backdrop-blur-[2px] text-white px-5 py-2.5 rounded-full text-xs font-bold border border-white/20 shadow-2xl flex items-center gap-2">
                             <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                             Thay đổi chưa áp dụng
                          </div>
                       </div>
                    )}

                    {/* Show guidelines in single mode if cropping and not comparing */}
                    {viewMode === 'single' && isCropOpen && showGuidelines && !isComparing && originalDimensions && (
                       <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                             <div className="absolute inset-0 bg-black/40"></div>
                             <div 
                                className="absolute border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-10"
                                style={{
                                   width: `${(cropDimensions.width / originalDimensions.w) * 100}%`,
                                   height: `${(cropDimensions.height / originalDimensions.h) * 100}%`,
                                   left: `${(cropDimensions.x / originalDimensions.w) * 100}%`,
                                   top: `${(cropDimensions.y / originalDimensions.h) * 100}%`,
                                }}
                             >
                                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 bg-primary/10">
                                   {[...Array(9)].map((_, i) => (
                                      <div key={i} className="border border-white/20"></div>
                                   ))}
                                </div>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>

                 {processed && !isComparing && (
                    <div className="mt-2 text-[10px] text-primary font-mono font-bold">{processed.width} x {processed.height} px</div>
                 )}
                 {!processed && !isProcessing && viewMode === 'single' && !isCropOpen && (
                    <p className="mt-4 text-gray-500 text-sm">Thiết lập thông số và nhấn băt đầu</p>
                 )}
              </div>
           )}
        </div>
        
        {processed && isChanged && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-white text-[11px] px-4 py-1.5 rounded-full font-bold shadow-lg animate-bounce z-40 backdrop-blur-sm">
             CÓ THAY ĐỔI CHƯA ÁP DỤNG!
          </div>
        )}
      </div>
    </div>
  );
};