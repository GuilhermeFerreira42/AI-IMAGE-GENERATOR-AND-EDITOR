import React, { useState } from 'react';
import type { ChatMessage } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { EditIcon } from './icons/EditIcon';
import { RetryIcon } from './icons/RetryIcon';

interface ChatMessageProps {
  message: ChatMessage;
  onRetry: (userMessageId: string) => void;
  onEdit: (messageId: string, newPrompt: string) => void;
  onImageClick: (base64Image: string) => void;
}

const UserMessage: React.FC<{ message: ChatMessage, onEdit: (messageId: string, newPrompt: string) => void }> = ({ message, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editText.trim() && editText.trim() !== message.text) {
      onEdit(message.id, editText.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="flex justify-end mb-4 group">
      <div className="mr-2 py-3 px-4 bg-blue-600 rounded-xl max-w-lg lg:max-w-2xl text-white relative">
        {!isEditing ? (
          <>
            {message.text && <p className="text-md whitespace-pre-wrap">{message.text}</p>}
            {message.imagePreviewUrls && message.imagePreviewUrls.length > 0 && (
              <div className={`mt-2 grid gap-2 ${message.imagePreviewUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {message.imagePreviewUrls.map((url, index) => (
                    <img key={index} src={url} alt={`User upload ${index + 1}`} className="rounded-lg max-h-40" />
                ))}
              </div>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="absolute -left-8 top-1/2 -translate-y-1/2 bg-gray-700 text-gray-300 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit prompt"
            >
              <EditIcon className="w-4 h-4" />
            </button>
          </>
        ) : (
          <form onSubmit={handleEditSubmit}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-blue-700 text-white p-2 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={Math.max(2, editText.split('\n').length)}
              autoFocus
            />
            <div className="flex justify-end mt-2 space-x-2">
              <button type="button" onClick={() => setIsEditing(false)} className="text-xs px-3 py-1 rounded bg-gray-600">Cancel</button>
              <button type="submit" className="text-xs px-3 py-1 rounded bg-blue-500 font-semibold">Save</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const BotMessage: React.FC<{ message: ChatMessage, onRetry: (userMessageId: string) => void, onImageClick: (base64Image: string) => void }> = ({ message, onRetry, onImageClick }) => {
  const handleDownload = (base64Image: string, index: number) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64Image}`;
    link.download = `generated-image-${message.id}-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex justify-start mb-4">
      <div className="ml-2 py-3 px-4 bg-gray-700 rounded-xl max-w-lg lg:max-w-2xl text-white">
        {message.isLoading && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
            <span className="text-sm">Generating...</span>
          </div>
        )}
        {message.error && (
          <div className="flex items-center space-x-3">
             <p className="text-red-400">{message.error}</p>
             {message.userMessageId && (
                <button
                    onClick={() => onRetry(message.userMessageId!)}
                    className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                    title="Retry"
                >
                    <RetryIcon className="w-4 h-4" />
                </button>
             )}
          </div>
        )}
        {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
        {message.generatedImages && (
          <div className={`grid gap-4 ${message.generatedImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {message.generatedImages.map((img, index) => (
              <div key={index} className="relative group">
                <img 
                    src={`data:image/png;base64,${img}`} 
                    alt={`Generated image ${index + 1}`} 
                    className="rounded-lg cursor-zoom-in"
                    onClick={() => onImageClick(img)}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(img, index); }}
                  className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Download HQ"
                >
                  <DownloadIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message, onRetry, onEdit, onImageClick }) => {
  if (message.role === 'user') {
    return <UserMessage message={message} onEdit={onEdit} />;
  }
  return <BotMessage message={message} onRetry={onRetry} onImageClick={onImageClick} />;
};