import React, { useState } from 'react';
import { enhanceImageWithGemini } from '../services/geminiService';
import { Button } from './Button';

interface AIEnhancerProps {
  originalFile: File;
}

export const AIEnhancer: React.FC<AIEnhancerProps> = ({ originalFile }) => {
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [mode, setMode] = useState<'restore' | 'creative'>('restore');

  const handleEnhance = async () => {
    setIsProcessing(true);
    setError(null);
    setResultUrl(null);

    try {
      let prompt = "";
      if (mode === 'restore') {
        prompt = "Enhance the quality of this image. Increase sharpness, improve lighting, remove noise, and make it look high resolution and photorealistic. Maintain the original subject matter and composition exactly. Return a single high-quality image.";
      } else {
        prompt = customPrompt || "Make this image look like a high-budget cinematic movie shot. Enhance details and colors significantly. Transform the style as described.";
      }

      const url = await enhanceImageWithGemini(originalFile, prompt);
      setResultUrl(url);
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi xử lý với AI. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `ai_enhanced_${originalFile.name.split('.')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
       {/* Sidebar Controls (Left) */}
       <div className="lg:col-span-4 h-full bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col gap-6 overflow-y-auto custom-scrollbar shadow-sm">
          <div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
               </svg>
               AI Nâng cấp ảnh
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">Sử dụng Gemini 2.5 Flash Image để tái tạo và nâng cấp hình ảnh.</p>

            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setMode('restore')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${mode === 'restore' ? 'bg-white dark:bg-primary text-primary dark:text-white shadow ring-1 ring-gray-200 dark:ring-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-white/5'}`}
                >
                  Phục hồi & Nét
                </button>
                <button
                  onClick={() => setMode('creative')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${mode === 'creative' ? 'bg-white dark:bg-purple-600 text-purple-600 dark:text-white shadow ring-1 ring-gray-200 dark:ring-purple-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-white/5'}`}
                >
                  Sáng tạo
                </button>
              </div>

              {mode === 'creative' && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <label className="text-sm uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-500 block mb-2">Mô tả thay đổi (Tiếng Anh)</label>
                  <textarea
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-base text-gray-900 dark:text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                    rows={4}
                    placeholder="E.g., Make it look like a oil painting, add cyberpunk lighting..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                  />
                </div>
              )}
               
              {mode === 'restore' && (
                 <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-1">
                    <p className="text-sm text-gray-600 dark:text-gray-300 italic flex gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Chế độ này sẽ cố gắng giữ nguyên bố cục nhưng tăng độ nét và giảm nhiễu hạt.
                    </p>
                 </div>
              )}
            </div>
          </div>

          <div className="mt-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-200 text-sm flex gap-2 items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
            <Button 
              onClick={handleEnhance} 
              isLoading={isProcessing} 
              variant={mode === 'creative' ? 'secondary' : 'primary'}
              className={`w-full mb-3 py-4 text-base ${mode === 'creative' ? 'hover:bg-purple-100 dark:hover:bg-purple-700 dark:hover:text-white dark:hover:border-purple-600 text-purple-700 dark:text-gray-200 border-purple-200 dark:border-gray-600' : ''}`}
            >
              {isProcessing ? 'Đang phân tích...' : 'Bắt đầu xử lý'}
            </Button>
            
            {resultUrl && (
              <Button onClick={handleDownload} variant="ghost" className="w-full border border-gray-300 dark:border-gray-600 hover:border-gray-400 py-3 text-base">
                Tải xuống ảnh AI
              </Button>
            )}
          </div>
       </div>

       {/* Comparison View (Right) */}
       <div className="lg:col-span-8 h-full flex flex-col gap-4">
          <div className="h-1/2 bg-gray-100 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-300 dark:border-gray-700 relative flex flex-col group overflow-hidden">
            <span className="absolute top-3 left-3 bg-white/90 dark:bg-black/70 backdrop-blur text-gray-900 dark:text-white text-xs font-bold px-2 py-1 rounded border border-gray-200 dark:border-white/10 z-10 shadow-sm">GỐC</span>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
               <img 
                  src={URL.createObjectURL(originalFile)} 
                  alt="Original" 
                  className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" 
                  onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                />
            </div>
          </div>
          
          <div className="h-1/2 bg-gray-100 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-300 dark:border-gray-700 border-dashed relative flex flex-col items-center justify-center group overflow-hidden">
             <span className="absolute top-3 left-3 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg z-10">KẾT QUẢ AI</span>
             {isProcessing ? (
               <div className="flex flex-col items-center gap-3">
                 <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Gemini đang vẽ lại ảnh của bạn...</p>
               </div>
             ) : resultUrl ? (
                <img 
                  src={resultUrl} 
                  alt="AI Enhanced" 
                  className="max-h-full max-w-full object-contain rounded shadow-lg transition-transform duration-500 group-hover:scale-[1.02]" 
                />
             ) : (
               <div className="text-center opacity-40 text-gray-600 dark:text-gray-400">
                 <p className="text-base">Chưa có kết quả</p>
                 <p className="text-sm">Nhấn "Bắt đầu xử lý" ở cột bên trái</p>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};