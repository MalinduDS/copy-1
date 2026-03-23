/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { SparkleIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="w-full py-4 px-8 border-b border-gray-700 bg-gray-800/30 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-center gap-3">
          <div className="relative group flex items-center justify-center">
            <SparkleIcon className="w-6 h-6 text-blue-400" />
            <span className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-900 border border-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                AI-Powered Editing
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-100">
            Pixshop
          </h1>
      </div>
    </header>
  );
};

export default Header;