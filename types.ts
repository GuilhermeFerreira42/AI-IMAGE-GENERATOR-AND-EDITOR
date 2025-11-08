export type MessageRole = 'user' | 'bot';

export interface ImageFile {
  base64: string;
  mimeType: string;
}

export type ResponseType = 'image' | 'text';

export interface RequestPayload {
  prompt: string;
  images: ImageFile[];
  options: GenerationOptions;
  responseType: ResponseType;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text?: string;

  // For user messages
  imagePreviewUrls?: string[];
  isEditing?: boolean;
  requestPayload?: RequestPayload; // The exact request sent

  // For bot messages
  generatedImages?: string[];
  isLoading?: boolean;
  error?: string;
  userMessageId?: string; // Link to the user message that triggered this bot message
}


export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type VariationCount = 1 | 2 | 4;

export interface GenerationOptions {
    aspectRatio: AspectRatio;
    variations: VariationCount;
    negativePrompt: string;
}
