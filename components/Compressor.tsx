import React, { useState, useEffect, useCallback } from 'react';
import { ImageSettings, ProcessedImage, CropConfig } from '../types';
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

  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropInsets, setCropInsets] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

  const [processed, setProcessed] = useState<ProcessedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const img = new Image();
    const url = URL.createObjectURL(originalFile);
    img.onload = () => {
      setOriginalDimensions({ w: img.width, h: img.height });
      URL.revokeObjectURL(url);
    };
    img.src = url;
    
    setSettings({
        quality: 0.8,
        scale: 1,
        format: originalFile.type === 'image/png' ? 'image/png' : 'image/jpeg' as any,
        rotation: 0,
        crop: undefined
    });
    setCropInsets({ top: 0, bottom: 0, left: 0, right: 0 });
    setIsCropOpen(false);
  }, [originalFile]);

  useEffect(() => {
    if (!originalDimensions) return;
    
    if (cropInsets.top === 0 && cropInsets.bottom === 0 && cropInsets.left === 0 && cropInsets.right === 0) {
        setSettings(s => ({ ...s, crop: undefined }));
        return;
    }

    const x = Math.floor(originalDimensions.w * (cropInsets.left / 100));
    const y = Math.floor(originalDimensions.h * (cropInsets.top / 100));
    const width = Math.floor(originalDimensions.w * (1 - (cropInsets.left + cropInsets.right) / 100));
    const height = Math.floor(originalDimensions.h * (1 - (cropInsets.top + cropInsets.bottom) / 100));

    if (width > 0 && height > 0) {
        const newCrop: CropConfig = { x, y, width, height };
        setSettings(s => ({ ...s, crop: newCrop }));
    }
  }, [cropInsets, originalDimensions]);

  const process = useCallback(async () => {
    setIsProcessing(true);
    try {
      const result = await processImageClientSide(originalFile, settings);
      setProcessed(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [originalFile, settings]);

  useEffect(() => {
    const timer = setTimeout(() => {
      process();
    }, 300);
    return () => clearTimeout(timer);
  }, [process]);

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
      <div className="lg:col-span-4 h-full bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col gap-6 overflow-y-auto custom-scrollbar shadow-sm">
        
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

                 {isCropOpen && (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 p-2">
                       <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Cắt lề (%)</p>
                       
                       {[
                         { label: 'Trên', key: 'top' },
                         { label: 'Dưới', key: 'bottom' },
                         { label: 'Trái', key: 'left' },
                         { label: 'Phải', key: 'right' }
                       ].map((side) => (
                          <div key={side.key} className="flex items-center gap-3 group">
                             <label className="text-sm text-gray-500 dark:text-gray-400 w-10 group-hover:text-primary transition-colors">{side.label}</label>
                             <input 
                                type="range" 
                                min="0" 
                                max="45" 
                                step="1"
                                value={(cropInsets as any)[side.key]} 
                                onChange={(e) => setCropInsets({...cropInsets, [side.key]: Number(e.target.value)})}
                                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-secondary"
                             />
                             <span className="text-sm text-gray-700 dark:text-white w-8 text-right font-mono">{(cropInsets as any)[side.key]}</span>
                          </div>
                       ))}
                       <button 
                          onClick={() => setCropInsets({top: 0, bottom: 0, left: 0, right: 0})}
                          className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 w-full text-right mt-2 underline"
                        >
                          Đặt lại
                        </button>
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

        <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
           <div className="flex justify-between items-center mb-4 text-base">
              <span className="text-gray-500 dark:text-gray-400">Gốc:</span>
              <span className="font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">{formatBytes(originalFile.size)}</span>
           </div>
           <div className="flex justify-between items-center mb-6 text-base">
              <span className="text-gray-500 dark:text-gray-400">Kết quả:</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700/50 bg-gray-100 dark:bg-gray-800 ${processed && processed.size < originalFile.size ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                {processed ? formatBytes(processed.size) : '...'}
              </span>
           </div>
           
           <Button 
            onClick={handleDownload} 
            disabled={!processed} 
            className="w-full py-4 text-xl shadow-xl shadow-primary/20"
           >
            Tải xuống
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
           </Button>
        </div>
      </div>

      {/* Preview (Right) */}
      <div className="lg:col-span-8 h-full bg-gray-100 dark:bg-gray-900/50 rounded-2xl flex items-center justify-center p-4 border border-dashed border-gray-300 dark:border-gray-700 relative overflow-hidden group">
        {!processed && isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-dark/80 backdrop-blur-sm z-10 transition-all">
            <div className="flex flex-col items-center gap-4">
               <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent shadow-lg shadow-primary/50"></div>
               <span className="text-primary font-medium tracking-wide animate-pulse text-lg">Đang xử lý...</span>
            </div>
          </div>
        )}
        {processed ? (
          <div className="relative max-w-full max-h-full">
            <img 
              src={processed.url} 
              alt="Processed" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent" 
            />
            <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-black/80 backdrop-blur-md text-gray-900 dark:text-white text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 shadow-xl font-mono">
              {processed.width} x {processed.height} px
            </div>
          </div>
        ) : (
           <span className="text-gray-400 dark:text-gray-500 text-lg">Đang chuẩn bị...</span>
        )}
      </div>
    </div>
  );
};