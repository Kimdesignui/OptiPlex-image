import React, { useState, useRef, useEffect } from 'react';
import { AppMode } from './types';
import { Compressor } from './components/Compressor';
import { AIEnhancer } from './components/AIEnhancer';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.COMPRESS);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial theme check (system preference or local storage)
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 md:p-6 font-sans transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto h-[calc(100vh-3rem)] flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">OptiPlex</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Studio hình ảnh thông minh</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Theme Toggle */}
             <button 
                onClick={toggleTheme}
                className="p-2.5 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 transition-all"
                title={theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
             >
                {theme === 'light' ? (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                   </svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                   </svg>
                )}
             </button>

             {file && (
                <div className="flex bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-800 shadow-sm">
                   <button
                      onClick={() => setMode(AppMode.COMPRESS)}
                      className={`px-5 py-2 text-sm font-bold rounded-md transition-all ${
                         mode === AppMode.COMPRESS 
                         ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-700' 
                         : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                   >
                      Nén & Resize
                   </button>
                   <button
                      onClick={() => setMode(AppMode.ENHANCE)}
                      className={`px-5 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${
                         mode === AppMode.ENHANCE 
                         ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 shadow-sm ring-1 ring-purple-100 dark:ring-purple-900' 
                         : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                   >
                      AI Nâng cao
                   </button>
                </div>
             )}
             
             {file && (
               <button 
                  onClick={handleReset}
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1 bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                 </svg>
                 Chọn ảnh khác
               </button>
             )}
          </div>
        </header>

        {/* Main Content Area - Split Screen Grid */}
        <div className="flex-1 min-h-0">
          {!file ? (
             // EMPTY STATE: Split Screen
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                
                {/* Left Column: Upload */}
                <div className="lg:col-span-4 h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 flex flex-col justify-center relative overflow-hidden group transition-all hover:border-primary/50 shadow-sm">
                    <input 
                       type="file" 
                       accept="image/*"
                       onChange={handleFileChange}
                       ref={fileInputRef}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="z-0 flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-gray-100 dark:border-gray-600 group-hover:border-primary/30">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                           </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Tải ảnh lên</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-base max-w-sm mx-auto leading-relaxed">
                          Chọn ảnh từ thiết bị của bạn để bắt đầu chỉnh sửa.
                          <br/>
                          <span className="text-sm opacity-60 mt-2 block">Hỗ trợ PNG, JPG, WEBP</span>
                        </p>
                        <div className="mt-8 px-8 py-4 bg-primary/10 text-primary font-medium rounded-xl text-base border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
                            Chọn tập tin
                        </div>
                    </div>
                </div>

                {/* Right Column: Placeholder */}
                <div className="lg:col-span-8 h-full bg-gray-100 dark:bg-gray-900/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center p-8">
                   <div className="text-center opacity-30 text-gray-500 dark:text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-40 w-40 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xl font-medium mb-2">Kết quả sẽ hiển thị tại đây</p>
                      <p className="text-base">Vui lòng tải ảnh lên ở cột bên trái</p>
                   </div>
                </div>

             </div>
          ) : (
             <>
               {mode === AppMode.COMPRESS ? (
                  <Compressor originalFile={file} />
               ) : (
                  <AIEnhancer originalFile={file} />
               )}
             </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;