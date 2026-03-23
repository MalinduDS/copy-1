/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import type { DetectedObject as ApiDetectedObject } from '../services/geminiService';
import { BullseyeIcon } from './icons';

export interface DetectedObject extends ApiDetectedObject {
  id: string;
}

interface ObjectPanelProps {
  objects: DetectedObject[];
  isLoading: boolean;
  isEditing: boolean;
  onDetect: () => void;
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  onSelectObject: (id: string) => void;
  onHoverObject: (id: string | null) => void;
  onGenerateEdit: (prompt: string, objectId: string) => void;
}

const ObjectPanel: React.FC<ObjectPanelProps> = ({ objects, isLoading, isEditing, onDetect, selectedObjectId, hoveredObjectId, onSelectObject, onHoverObject, onGenerateEdit }) => {
  const [prompt, setPrompt] = useState('');
  
  const selectedObject = objects.find(o => o.id === selectedObjectId);

  useEffect(() => {
    // Clear prompt when selection changes
    setPrompt('');
  }, [selectedObjectId]);

  if (isLoading) {
    return (
      <div className="w-full text-center p-8 bg-gray-900/20 border border-white/10 rounded-lg animate-fade-in backdrop-blur-xl">
        <div role="status" className="flex flex-col items-center gap-4">
            <svg aria-hidden="true" className="w-12 h-12 text-gray-600 animate-spin fill-blue-500" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
            </svg>
            <span className="text-gray-300">Detecting objects in your image...</span>
        </div>
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div className="w-full bg-gray-900/20 border border-white/10 rounded-lg p-4 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-xl">
        <BullseyeIcon className="w-12 h-12 text-blue-400" />
        <h3 className="text-lg font-semibold text-center text-gray-300">Find & Edit Specific Objects</h3>
        <p className="text-sm text-gray-400 text-center max-w-md">Let the AI identify objects in your photo. You can then select an object to perform a precise edit, like changing its color or removing it.</p>
        <button
          onClick={onDetect}
          disabled={isLoading || isEditing}
          className="w-full max-w-xs mt-2 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          Find Objects
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-900/20 border border-white/10 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-xl">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-300">Detected Objects</h3>
        <button 
          onClick={onDetect}
          className="text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          disabled={isEditing}
        >
          Re-scan
        </button>
      </div>
      <p className="text-sm text-gray-400 -mt-2">Hover or click on an object below or on the image to select it for editing.</p>
      
      <div className="max-h-40 overflow-y-auto pr-2">
        <ul className="space-y-2">
          {objects.map(obj => (
            <li key={obj.id}>
              <button
                onClick={() => onSelectObject(obj.id)}
                onMouseEnter={() => onHoverObject(obj.id)}
                onMouseLeave={() => onHoverObject(null)}
                className={`w-full text-left p-3 rounded-md transition-all duration-200 border-2
                  ${selectedObjectId === obj.id ? 'bg-blue-500/20 border-blue-400' :
                  hoveredObjectId === obj.id ? 'bg-white/10 border-white/20 scale-[1.02]' :
                  'bg-white/5 border-transparent hover:bg-white/10'}`
                }
              >
                <span className="font-semibold text-gray-200 capitalize">{obj.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedObject && (
        <div className="animate-fade-in pt-4 border-t border-white/10">
          <p className="text-md text-gray-400 mb-2">
            Editing the selected <span className="font-bold text-cyan-400 capitalize">{`'${selectedObject.label}'`}</span>. Describe your change:
          </p>
          <form onSubmit={(e) => { e.preventDefault(); onGenerateEdit(prompt, selectedObjectId!); }} className="w-full flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`e.g., 'make it bright red'`}
              className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isEditing}
              autoFocus
            />
            <button 
              type="submit"
              className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 text-base rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
              disabled={isEditing || !prompt.trim()}
            >
              Generate
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ObjectPanel;