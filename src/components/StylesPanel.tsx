/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface StylesPanelProps {
  onApplyStyle: (prompt: string) => void;
  isLoading: boolean;
}

const styles = [
  { 
    name: 'Vintage Film', 
    prompt: "Apply a vintage film look to the image, characterized by faded colors, a slight yellow tint, increased grain, and soft contrast. The blacks should be slightly lifted, and there should be a subtle vignette effect around the edges.",
    css: 'from-amber-400 via-stone-500 to-gray-600'
  },
  { 
    name: 'Neon Noir', 
    prompt: "Transform the image into a neon noir style. Dramatically increase contrast, crush the blacks, and introduce vibrant, glowing neon colors like electric blue, hot pink, and deep purple into the highlights and midtones. The overall mood should be dark, gritty, and futuristic.",
    css: 'from-pink-500 via-purple-600 to-blue-700'
  },
  { 
    name: 'Golden Hour', 
    prompt: "Bathe the image in a warm, golden hour light. Enhance the orange and yellow tones, soften the shadows, and add a gentle, hazy glow to the highlights to simulate the look of late afternoon sun.",
    css: 'from-orange-400 via-amber-500 to-yellow-300'
  },
  { 
    name: 'Monochrome', 
    prompt: "Convert the image to a high-impact, dramatic black and white. Push the contrast to its limits, creating deep, inky blacks and bright, clean whites. Emphasize textures and forms for a powerful, moody, and timeless effect.",
    css: 'from-gray-900 via-gray-500 to-gray-100'
  },
  { 
    name: 'Dreamy Pastel', 
    prompt: "Give the image a soft, dreamy aesthetic using a pastel color palette. Desaturate the original colors and shift them towards soft pinks, baby blues, and mint greens. Apply a gentle soft-focus or bloom effect to enhance the ethereal quality.",
    css: 'from-pink-300 via-sky-300 to-emerald-200'
  },
  { 
    name: 'Cyberpunk', 
    prompt: "Apply a cyberpunk aesthetic. Add glowing neon signs, rainy reflections on surfaces, and a cool, blue-cyan color grade. Introduce elements of futuristic technology and a high-tech, dystopian atmosphere.",
    css: 'from-cyan-400 via-blue-500 to-purple-600'
  },
];

const StylesPanel: React.FC<StylesPanelProps> = ({ onApplyStyle, isLoading }) => {
  const handleApply = (prompt: string) => {
    onApplyStyle(prompt);
  };

  return (
    <div className="w-full bg-gray-900/20 border border-white/10 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-center text-gray-300">Apply a Style Template</h3>
      <p className="text-sm text-gray-400 text-center -mt-2">Select a style to transform the look and feel of your image.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {styles.map(style => (
          <button
            key={style.name}
            onClick={() => handleApply(style.prompt)}
            disabled={isLoading}
            className={`w-full text-center aspect-video flex items-center justify-center bg-gradient-to-br border border-white/20 text-white font-bold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:scale-105 hover:border-white/40 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed ${style.css}`}
          >
            {style.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StylesPanel;
