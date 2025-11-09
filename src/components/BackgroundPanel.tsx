/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';

interface BackgroundPanelProps {
  onApplyBackground: (backgroundFile: File) => void;
  isLoading: boolean;
}

const BackgroundPanel: React.FC<BackgroundPanelProps> = ({ onApplyBackground, isLoading }) => {
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!backgroundFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(backgroundFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [backgroundFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBackgroundFile(e.target.files[0]);
    }
  };

  const handleApply = () => {
    if (backgroundFile) {
      onApplyBackground(backgroundFile);
    }
  };

  return (
    <div className="w-full bg-gray-900/20 border border-white/10 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-center text-gray-300">Change Background</h3>
      <p className="text-sm text-gray-400 text-center -mt-2">Upload a new background and the AI will composite your subject onto it.</p>
      
      <div className="flex flex-col items-center gap-4">
        <label htmlFor="background-upload" className="w-full max-w-xs text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          {backgroundFile ? 'Change Background Image' : 'Select Background Image'}
        </label>
        <input id="background-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isLoading} />
        
        {previewUrl && (
          <div className="mt-2 p-2 border border-gray-700 rounded-lg bg-black/20">
            <img src={previewUrl} alt="Background preview" className="max-h-32 rounded-md" />
          </div>
        )}
      </div>

      {backgroundFile && (
        <div className="animate-fade-in flex flex-col gap-4 pt-2">
            <button
                onClick={handleApply}
                className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading || !backgroundFile}
            >
                Apply Background
            </button>
        </div>
      )}
    </div>
  );
};

export default BackgroundPanel;
