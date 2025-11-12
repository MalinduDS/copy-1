/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { type Resolution } from '../services/geminiService';

interface DownloadPanelProps {
  onDownloadCurrent: () => void;
  onUpscale: (resolution: Resolution) => void;
}

const resolutions: { key: Resolution; label: string; description: string; }[] = [
  { key: 'HD', label: 'HD', description: '1280px' },
  { key: 'FHD', label: 'Full HD', description: '1920px' },
  { key: '4K', label: '4K UHD', description: '3840px' },
];

const DownloadPanel: React.FC<DownloadPanelProps> = ({ onDownloadCurrent, onUpscale }) => {
  return (
    <div 
      className="absolute right-0 bottom-full mb-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-2 z-50 animate-fade-in-up"
    >
      <ul className="space-y-1">
        <li>
          <button 
            onClick={onDownloadCurrent}
            className="w-full text-left px-3 py-2 rounded-md transition-colors text-gray-200 hover:bg-gray-700/50"
          >
            <p className="font-semibold">Download Current Size</p>
            <p className="text-xs text-gray-400">Save the image with its current dimensions.</p>
          </button>
        </li>
        <li className="h-px bg-gray-700 my-1"></li>
        {resolutions.map(({ key, label, description }) => (
          <li key={key}>
            <button 
              onClick={() => onUpscale(key)}
              className="w-full text-left px-3 py-2 rounded-md transition-colors text-gray-200 hover:bg-gray-700/50"
            >
              <p className="font-semibold">Upscale & Download {label}</p>
              <p className="text-xs text-gray-400">Enlarge image to {description} on the longest side.</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DownloadPanel;
