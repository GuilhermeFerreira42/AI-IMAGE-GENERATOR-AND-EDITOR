import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatInput } from './components/ChatInput';
import { ChatMessageComponent } from './components/ChatMessage';
import { ImageModal } from './components/ImageModal';
import { callGeminiApi } from './services/geminiService';
import type { ChatMessage, GenerationOptions, RequestPayload, ImageFile, ResponseType } from './types';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
        const savedMessages = localStorage.getItem('chatHistory');
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          // Revoke any lingering blob URLs from previous sessions on load
          parsedMessages.forEach((msg: ChatMessage) => {
            if (msg.role === 'user' && msg.imagePreviewUrls) {
                msg.imagePreviewUrls.forEach(url => {
                    // It's safe to call this even if it's not a blob URL
                    URL.revokeObjectURL(url);
                });
            }
          });
          setMessages(parsedMessages.filter((msg: ChatMessage) => !msg.isLoading));
        }
    } catch(e) {
        console.error("Failed to parse chat history from localStorage", e);
        localStorage.removeItem('chatHistory');
    }
  }, []);

  useEffect(() => {
    // We only save messages that aren't in a loading state
    const savableMessages = messages.filter(msg => !msg.isLoading);
    if(savableMessages.length > 0) {
        localStorage.setItem('chatHistory', JSON.stringify(savableMessages));
    } else {
        localStorage.removeItem('chatHistory');
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filesToImageFiles = (files: File[]): Promise<ImageFile[]> => {
    const promises = files.map(file => {
      return new Promise<ImageFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = (reader.result as string).split(',')[1];
          resolve({ base64: result, mimeType: file.type });
        };
        reader.onerror = (error) => reject(error);
      });
    });
    return Promise.all(promises);
  };
  
  const processRequest = useCallback(async (
    requestPayload: RequestPayload,
    userMessageId: string,
    existingBotMessageId?: string
  ) => {
    setIsLoading(true);

    const botMessageId = existingBotMessageId || (Date.now() + 1).toString();
    const loadingBotMessage: ChatMessage = {
      id: botMessageId,
      role: 'bot',
      isLoading: true,
      userMessageId,
    };

    if (existingBotMessageId) {
        setMessages(prev => prev.map(msg => msg.id === existingBotMessageId ? loadingBotMessage : msg));
    } else {
        setMessages(prev => [...prev, loadingBotMessage]);
    }
    
    try {
      const response = await callGeminiApi(requestPayload);
      
      const successBotMessage: ChatMessage = {
        id: botMessageId,
        role: 'bot',
        generatedImages: response.images,
        text: response.text,
        userMessageId,
      };

      setMessages(prev => prev.map(msg => msg.id === botMessageId ? successBotMessage : msg));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      const errorBotMessage: ChatMessage = {
        id: botMessageId,
        role: 'bot',
        error: errorMessage,
        userMessageId,
      };
      setMessages(prev => prev.map(msg => msg.id === botMessageId ? errorBotMessage : msg));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async (prompt: string, files: File[], options: GenerationOptions) => {
    const userMessageId = Date.now().toString();
    const imagePreviewUrls = files.map(file => URL.createObjectURL(file));

    const imageFiles = await filesToImageFiles(files);

    const responseType: ResponseType = files.length > 1 ? 'text' : 'image';

    const requestPayload: RequestPayload = {
      prompt,
      images: imageFiles,
      options,
      responseType,
    };

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: prompt,
      imagePreviewUrls,
      requestPayload,
    };

    setMessages(prev => [...prev, userMessage]);
    await processRequest(requestPayload, userMessageId);

    // CRITICAL FIX: Do not revoke object URLs immediately after submission.
    // This can cause instability and reloading in sandboxed environments.
    // Cleanup is handled by the initial useEffect hook.
    // imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
  }, [processRequest]);

  const handleRetry = useCallback((userMessageId: string) => {
      const userMessage = messages.find(msg => msg.id === userMessageId);
      const botMessage = messages.find(msg => msg.userMessageId === userMessageId);
      if (userMessage?.requestPayload && botMessage) {
        processRequest(userMessage.requestPayload, userMessageId, botMessage.id);
      } else {
        console.error("Could not find messages to retry for userMessageId:", userMessageId);
      }
  }, [messages, processRequest]);
  
  const handleEdit = useCallback((userMessageId: string, newPrompt: string) => {
      let originalRequestPayload: RequestPayload | undefined;

      // Update the user message first
      setMessages(prev => prev.map(msg => {
          if (msg.id === userMessageId) {
            originalRequestPayload = msg.requestPayload;
            return {
                ...msg,
                text: newPrompt,
                requestPayload: { ...msg.requestPayload!, prompt: newPrompt }
            };
          }
          return msg;
      }));

      // Find the bot message associated and trigger a new request
      const botMessage = messages.find(msg => msg.userMessageId === userMessageId);
      if (originalRequestPayload && botMessage) {
          const newRequestPayload: RequestPayload = { ...originalRequestPayload, prompt: newPrompt };
          processRequest(newRequestPayload, userMessageId, botMessage.id);
      } else {
        console.error("Could not find messages to edit for userMessageId:", userMessageId);
      }

  }, [messages, processRequest]);
  
  const handleImageClick = (base64Image: string) => {
    setZoomedImageUrl(`data:image/png;base64,${base64Image}`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans">
      <header className="p-4 border-b border-gray-700 bg-gray-800 shadow-md">
        <h1 className="text-xl font-bold text-center text-white">AI Image Generator & Editor</h1>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 mt-20">
              <h2 className="text-2xl font-semibold">Start creating or editing images</h2>
              <p className="mt-2">Use the input below to generate an image from text, or attach an image to edit it.</p>
              <p className="mt-1 text-sm">Attach multiple images to ask questions about them.</p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessageComponent key={msg.id} message={msg} onRetry={handleRetry} onEdit={handleEdit} onImageClick={handleImageClick} />
          ))}
          <div ref={chatEndRef} />
        </div>
      </main>

      <footer className="sticky bottom-0">
        <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
      </footer>
      
      {zoomedImageUrl && <ImageModal imageUrl={zoomedImageUrl} onClose={() => setZoomedImageUrl(null)} />}
    </div>
  );
};

export default App;