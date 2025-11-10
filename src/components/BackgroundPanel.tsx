/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface BackgroundPanelProps {
  onApplyBackgroundEffect: (prompt: string) => void;
  isLoading: boolean;
}

const BackgroundPanel: React.FC<BackgroundPanelProps> = ({ onApplyBackgroundEffect, isLoading }) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const presets = [
    { name: 'Sunset', prompt: 'a beautiful sunset gradient from orange to deep purple', css: 'from-orange-500 via-red-500 to-purple-800' },
    { name: 'Oceanic', prompt: 'a deep ocean gradient from dark blue to turquoise', css: 'from-cyan-500 to-blue-800' },
    { name: 'Forest', prompt: 'a lush forest gradient from dark green to a light, misty green', css: 'from-green-800 to-emerald-400' },
    { name: 'Synthwave', prompt: 'an 80s synthwave gradient from neon pink to electric blue', css: 'from-pink-500 via-purple-500 to-cyan-500' },
    { name: 'Pastel', prompt: 'a soft, dreamy pastel gradient from light pink to baby blue', css: 'from-pink-300 to-sky-300' },
    { name: 'Galaxy', prompt: 'a dark galaxy gradient from deep space black to cosmic purple', css: 'from-gray-900 via-purple-900 to-indigo-900' },
  ];
  
  const activePrompt = selectedPresetPrompt || customPrompt;

  const handlePresetClick = (prompt: string) => {
    setSelectedPresetPrompt(prompt);
    setCustomPrompt('');
  };
  
  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPrompt(e.target.value);
    setSelectedPresetPrompt(null);
  };

  const handleApply = () => {
    if (activePrompt) {
        onApplyBackgroundEffect(activePrompt);
    }
  };

  return (
    <div className="w-full bg-gray-900/20 border border-white/10 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-center text-gray-300">Generate a New Background</h3>
      <p className="text-sm text-gray-400 text-center -mt-2">Choose a preset or describe a custom gradient background.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {presets.map(preset => (
          <button
            key={preset.name}
            onClick={() => handlePresetClick(preset.prompt)}
            disabled={isLoading}
            className={`w-full text-center aspect-video flex items-center justify-center bg-gradient-to-br border text-white font-bold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed ${preset.css} ${selectedPresetPrompt === preset.prompt ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-blue-400 border-transparent' : 'border-white/20'}`}
          >
            {preset.name}
          </button>
        ))}
      </div>
      
      <input
        type="text"
        value={customPrompt}
        onChange={handleCustomChange}
        placeholder="Or describe a custom gradient (e.g., 'a gradient from red to yellow')"
        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
        disabled={isLoading}
      />

      {activePrompt && (
        <div className="animate-fade-in flex flex-col gap-4 pt-2">
            <button
                onClick={handleApply}
                className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading || !activePrompt.trim()}
            >
                Apply Background
            </button>
        </div>
      )}
    </div>
  );
};

export default BackgroundPanel;
