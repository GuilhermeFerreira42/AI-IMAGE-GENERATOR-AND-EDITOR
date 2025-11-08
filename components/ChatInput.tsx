import React, { useState, useRef } from 'react';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { SendIcon } from './icons/SendIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ASPECT_RATIOS, VARIATION_OPTIONS, MAX_FILE_SIZE_BYTES, ACCEPTED_IMAGE_TYPES } from '../constants';
import type { AspectRatio, GenerationOptions, VariationCount } from '../types';

interface ChatInputProps {
  onSubmit: (prompt: string, files: File[], options: GenerationOptions) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [options, setOptions] = useState<GenerationOptions>({
    aspectRatio: '1:1',
    variations: 1,
    negativePrompt: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = (selectedFiles: FileList | null) => {
    if (selectedFiles) {
      const newFiles: File[] = [];
      const newUrls: string[] = [];
      for (const file of Array.from(selectedFiles)) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          alert(`Invalid file type: ${file.name}. Please select a JPEG, PNG, or WEBP file.`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          alert(`File is too large: ${file.name}. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`);
          continue;
        }
        newFiles.push(file);
        newUrls.push(URL.createObjectURL(file));
      }
      setFiles(prev => [...prev, ...newFiles]);
      setPreviewUrls(prev => [...prev, ...newUrls]);
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isOver: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isOver);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files) {
      handleFilesChange(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearAllFiles = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviewUrls([]);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onSubmit(prompt.trim(), files, options);
    setPrompt('');
    clearAllFiles();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
    }
  };
  
  const showGenerationOptions = files.length <= 1;

  return (
    <div
      className={`p-4 bg-gray-800 border-t border-gray-700 transition-colors ${isDragging ? 'bg-gray-700' : ''}`}
      onDragEnter={(e) => handleDragEvents(e, true)}
      onDragLeave={(e) => handleDragEvents(e, false)}
      onDragOver={(e) => handleDragEvents(e, true)}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto relative">
        {isDragging && <div className="pointer-events-none absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center"><p className="text-white text-lg font-semibold">Drop image(s) here</p></div>}
        
        {previewUrls.length > 0 && (
          <div className="mb-2 flex space-x-2 overflow-x-auto pb-2">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative w-24 h-24 flex-shrink-0">
                <img src={url} alt={`Preview ${index}`} className="rounded-md object-cover w-full h-full" />
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full flex items-center justify-center"
                  title="Remove image"
                >
                  <XCircleIcon className="w-6 h-6"/>
                </button>
              </div>
            ))}
          </div>
        )}

        {showGenerationOptions && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Aspect Ratio</label>
              <select
                value={options.aspectRatio}
                onChange={(e) => setOptions({ ...options, aspectRatio: e.target.value as AspectRatio })}
                className="w-full bg-gray-700 text-white p-2 rounded-md text-sm"
              >
                {ASPECT_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Variations</label>
              <select
                value={options.variations}
                onChange={(e) => setOptions({ ...options, variations: parseInt(e.target.value, 10) as VariationCount })}
                className="w-full bg-gray-700 text-white p-2 rounded-md text-sm"
              >
                {VARIATION_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
                <label className="text-xs text-gray-400 block mb-1">Negative Prompt</label>
                <input
                    type="text"
                    value={options.negativePrompt}
                    onChange={(e) => setOptions({ ...options, negativePrompt: e.target.value })}
                    placeholder="e.g., blurry, text, watermark"
                    className="w-full bg-gray-700 text-white p-2 rounded-md text-sm placeholder-gray-500"
                />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-end">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
                files.length === 0 ? "Describe the image you want to create..." :
                files.length === 1 ? "Describe how you want to edit the image..." :
                "Ask something about the uploaded images..."
            }
            className="w-full bg-gray-700 text-white p-3 pr-24 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '200px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
          <div className="absolute right-2 bottom-2 flex items-center space-x-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-white">
              <PaperclipIcon />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              multiple
              onChange={(e) => handleFilesChange(e.target.files)}
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="bg-blue-600 text-white p-2 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              <SendIcon />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
