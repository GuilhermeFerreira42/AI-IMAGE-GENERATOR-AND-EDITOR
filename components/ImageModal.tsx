import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from './icons/XIcon';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    setZoom(prevZoom => {
      const newZoom = prevZoom - e.deltaY * zoomFactor * 0.1;
      return Math.max(0.5, Math.min(newZoom, 5)); // Clamp zoom between 0.5x and 5x
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    // We calculate the starting position relative to the current translation
    startPosRef.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const newX = e.clientX - startPosRef.current.x;
    const newY = e.clientY - startPosRef.current.y;
    setTranslate({ x: newX, y: newY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
        onClick={onClose}
        title="Close (Esc)"
      >
        <XIcon className="w-8 h-8" />
      </button>
      <div 
        className="w-full h-full flex items-center justify-center p-4 overflow-hidden"
        onWheel={handleWheel}
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking on the image container
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Stop dragging if mouse leaves the area
      >
        <img
          src={imageUrl}
          alt="Zoomed view"
          draggable={false} // Prevent native browser image dragging
          className={`max-w-[90vw] max-h-[90vh] object-contain ${isDragging ? '' : 'transition-transform duration-150'}`}
          style={{ 
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})`,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
           }}
        />
      </div>
    </div>
  );
};
