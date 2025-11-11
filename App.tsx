/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { 
    generateEditedImage, 
    generateFilteredImage, 
    generateAdjustedImage, 
    upscaleImage, 
    compositeWithBackground, 
    detectObjects,
    generateObjectEdit,
    type Resolution 
} from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import DownloadPanel from './components/DownloadPanel';
import BackgroundPanel from './components/BackgroundPanel';
import ObjectPanel, { type DetectedObject as UiDetectedObject } from './components/ObjectPanel';
import { UndoIcon, RedoIcon, EyeIcon, ChevronDownIcon } from './components/icons';
import StartScreen from './components/StartScreen';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

type Tab = 'retouch' | 'objects' | 'crop' | 'adjust' | 'filters' | 'background';

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState('AI is working its magic...');
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Object Detection State
  const [detectedObjects, setDetectedObjects] = useState<UiDetectedObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);

  // Download Panel State
  const [isDownloadPanelOpen, setIsDownloadPanelOpen] = useState<boolean>(false);
  const downloadButtonRef = useRef<HTMLDivElement>(null);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  // Effect to close dropdown when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (downloadButtonRef.current && !downloadButtonRef.current.contains(event.target as Node)) {
              setIsDownloadPanelOpen(false);
          }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, []);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const resetInteractionState = useCallback(() => {
    setEditHotspot(null);
    setDisplayHotspot(null);
    setDetectedObjects([]);
    setSelectedObjectId(null);
    setHoveredObjectId(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, []);

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    resetInteractionState();
  }, [history, historyIndex, resetInteractionState]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setActiveTab('retouch');
    resetInteractionState();
  }, [resetInteractionState]);

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setLoadingMessage('AI is working its magic...');
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply a filter to.');
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Applying creative filter...');
    setError(null);
    
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Making professional adjustments...');
    setError(null);
    
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyBackground = useCallback(async (backgroundFile: File) => {
    if (!currentImage) {
      setError('No image loaded to apply a background to.');
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Compositing images...');
    setError(null);
    
    try {
        const compositedImageUrl = await compositeWithBackground(currentImage, backgroundFile);
        const newImageFile = dataURLtoFile(compositedImageUrl, `composited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the background. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);
  
  const handleDetectObjects = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to detect objects in.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Detecting objects...');
    setError(null);
    setDetectedObjects([]);
    setSelectedObjectId(null);
    setHoveredObjectId(null);

    try {
        const objects = await detectObjects(currentImage);
        const objectsWithId = objects.map((obj, i) => ({ ...obj, id: `${Date.now()}-${i}` }));
        setDetectedObjects(objectsWithId);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to detect objects. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage]);

  const handleGenerateObjectEdit = useCallback(async (prompt: string, objectId: string) => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    const object = detectedObjects.find(o => o.id === objectId);
    if (!object) {
      setError('Could not find the selected object to edit.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Editing selected object...');
    setError(null);
    
    try {
        const editedImageUrl = await generateObjectEdit(currentImage, prompt, object);
        const newImageFile = dataURLtoFile(editedImageUrl, `object-edit-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to edit the object. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, detectedObjects, addImageToHistory]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      resetInteractionState();
    }
  }, [canUndo, historyIndex, resetInteractionState]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      resetInteractionState();
    }
  }, [canRedo, historyIndex, resetInteractionState]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      resetInteractionState();
    }
  }, [history, resetInteractionState]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      resetInteractionState();
  }, [resetInteractionState]);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          setIsDownloadPanelOpen(false);
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleUpscale = useCallback(async (resolution: Resolution) => {
    if (!currentImage) {
        setError('No image available to upscale.');
        return;
    }
    setIsDownloadPanelOpen(false);
    setIsLoading(true);
    setLoadingMessage(`Upscaling image to ${resolution}...`);
    setError(null);

    try {
        const upscaledImageUrl = await upscaleImage(currentImage, resolution);
        // Trigger download for the upscaled image
        const link = document.createElement('a');
        link.href = upscaledImageUrl;
        link.download = `upscaled-${resolution}-${currentImage.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to upscale the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage]);

  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab === 'retouch') {
        const img = e.currentTarget;
        const rect = img.getBoundingClientRect();

        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        
        setDisplayHotspot({ x: offsetX, y: offsetY });

        const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
        const scaleX = naturalWidth / clientWidth;
        const scaleY = naturalHeight / clientHeight;

        const originalX = Math.round(offsetX * scaleX);
        const originalY = Math.round(offsetY * scaleY);

        setEditHotspot({ x: originalX, y: originalY });
    } else if (activeTab === 'objects') {
        // Clicking on the image itself (not a box) will deselect any selected object.
        // The box's onClick has stopPropagation, so this only fires on the image.
        setSelectedObjectId(null);
    }
};

  const renderContent = () => {
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Try Again
            </button>
          </div>
        );
    }
    
    if (!currentImageUrl) {
      return <StartScreen onFileSelect={handleFileSelect} />;
    }

    const imageDisplay = (
      <div className="relative" onMouseLeave={() => activeTab === 'objects' && setHoveredObjectId(null)}>
        {/* Base image is the original, always at the bottom */}
        {originalImageUrl && (
            <img
                key={originalImageUrl}
                src={originalImageUrl}
                alt="Original"
                className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
            />
        )}
        {/* The current image is an overlay that fades in/out for comparison */}
        <img
            ref={imgRef}
            key={currentImageUrl}
            src={currentImageUrl}
            alt="Current"
            onClick={handleImageClick}
            className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTab === 'retouch' ? 'cursor-crosshair' : ''}`}
        />
        {/* Bounding Boxes Overlay */}
        {activeTab === 'objects' && detectedObjects.length > 0 && (
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {detectedObjects.map(obj => {
                if (!imgRef.current) return null;
                const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imgRef.current;
                if (!naturalWidth || !naturalHeight) return null;

                const scaleX = clientWidth / naturalWidth;
                const scaleY = clientHeight / naturalHeight;

                const boxStyle = {
                    left: `${obj.box.x1 * scaleX}px`,
                    top: `${obj.box.y1 * scaleY}px`,
                    width: `${(obj.box.x2 - obj.box.x1) * scaleX}px`,
                    height: `${(obj.box.y2 - obj.box.y1) * scaleY}px`,
                };
                
                const isSelected = obj.id === selectedObjectId;
                const isHovered = obj.id === hoveredObjectId;

                return (
                    <div 
                        key={obj.id} 
                        style={boxStyle}
                        className={`absolute pointer-events-auto cursor-pointer transition-all duration-200 rounded-md
                          ${isSelected ? 'border-4 border-blue-400 bg-blue-400/30 ring-2 ring-blue-300' :
                          isHovered ? 'border-2 border-dashed border-white bg-white/20' :
                          'border-2 border-white/50 bg-transparent'}`
                        }
                        onClick={(e) => { e.stopPropagation(); setSelectedObjectId(obj.id); }}
                        onMouseEnter={() => setHoveredObjectId(obj.id)}
                    >
                      <span 
                        className={`absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-black/60 px-2 py-1 rounded-md transition-opacity duration-200 whitespace-nowrap capitalize
                          ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`
                        }
                      >
                        {obj.label}
                      </span>
                    </div>
                );
              })}
            </div>
          )}
      </div>
    );
    
    // For ReactCrop, we need a single image element. We'll use the current one.
    const cropImageElement = (
      <img 
        ref={imgRef}
        key={`crop-${currentImageUrl}`}
        src={currentImageUrl} 
        alt="Crop this image"
        className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
      />
    );


    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in bg-gradient-to-br from-gray-900/70 via-black/40 to-gray-900/70 backdrop-blur-lg p-4 sm:p-6 rounded-2xl border border-white/10">
        <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <Spinner />
                    <p className="text-gray-300">{loadingMessage}</p>
                </div>
            )}
            
            {activeTab === 'crop' ? (
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                {cropImageElement}
              </ReactCrop>
            ) : imageDisplay }

            {displayHotspot && !isLoading && activeTab === 'retouch' && (
                <div 
                    className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                >
                    <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                </div>
            )}
        </div>
        
        <div className="w-full bg-gray-900/20 border border-white/10 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-md">
            {(['retouch', 'objects', 'crop', 'adjust', 'filters', 'background'] as Tab[]).map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                        activeTab === tab 
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
        
        <div className="w-full">
            {activeTab === 'retouch' && (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-md text-gray-400">
                        {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                            className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isLoading || !editHotspot}
                        />
                        <button 
                            type="submit"
                            className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading || !prompt.trim() || !editHotspot}
                        >
                            Generate
                        </button>
                    </form>
                </div>
            )}
            {activeTab === 'objects' && <ObjectPanel 
                objects={detectedObjects}
                isLoading={isLoading && loadingMessage.startsWith('Detecting')}
                isEditing={isLoading && !loadingMessage.startsWith('Detecting')}
                onDetect={handleDetectObjects}
                selectedObjectId={selectedObjectId}
                hoveredObjectId={hoveredObjectId}
                onSelectObject={setSelectedObjectId}
                onHoverObject={setHoveredObjectId}
                onGenerateEdit={handleGenerateObjectEdit}
            />}
            {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
            {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />}
            {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
            {activeTab === 'background' && <BackgroundPanel onApplyBackground={handleApplyBackground} isLoading={isLoading} />}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3">
            <button 
                onClick={handleUndo}
                disabled={!canUndo || isLoading}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Undo last action"
            >
                <UndoIcon className="w-5 h-5 mr-2" />
                Undo
            </button>
            <button 
                onClick={handleRedo}
                disabled={!canRedo || isLoading}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Redo last action"
            >
                <RedoIcon className="w-5 h-5 mr-2" />
                Redo
            </button>
            
            <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>

            {canUndo && (
              <button 
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onMouseLeave={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  disabled={isLoading}
                  className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Press and hold to see original image"
              >
                  <EyeIcon className="w-5 h-5 mr-2" />
                  Compare
              </button>
            )}

            <button 
                onClick={handleReset}
                disabled={!canUndo || isLoading}
                className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
              >
                Reset
            </button>
            <button 
                onClick={handleUploadNew}
                disabled={isLoading}
                className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Upload New
            </button>

            <div ref={downloadButtonRef} className="relative flex-grow sm:flex-grow-0 ml-auto">
                <button 
                    onClick={() => setIsDownloadPanelOpen(prev => !prev)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-green-800 disabled:to-green-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                >
                    Download
                    <ChevronDownIcon className={`w-5 h-5 ml-2 transition-transform ${isDownloadPanelOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDownloadPanelOpen && (
                    <DownloadPanel onDownloadCurrent={handleDownload} onUpscale={handleUpscale} />
                )}
            </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center ${currentImage ? 'items-start' : 'items-center'}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;