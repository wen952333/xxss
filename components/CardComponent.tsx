import React from 'react';
import { Card } from '../types';
import { getCardAssetPath } from '../utils/gameLogic';

interface CardProps {
  card: Card;
  onClick?: (e: React.MouseEvent) => void;
  selected?: boolean;
  small?: boolean;
  hidden?: boolean;
  className?: string;
}

export const CardComponent: React.FC<CardProps> = ({ card, onClick, selected, small, hidden, className }) => {
  // Determine sizing classes
  // Reduced by ~20%: 
  // Default: w-20(5rem)->w-16(4rem), h-28(7rem)->h-[90px]
  // Desktop: w-28(7rem)->w-[90px], h-40(10rem)->h-32(8rem)
  const sizeClasses = small 
    ? 'w-6 h-10 text-[10px]' 
    : (className || 'w-16 h-[90px] md:w-[90px] md:h-32 text-base md:text-xl');

  // Handle Card Back (Hidden State)
  if (hidden) {
    return (
      <div 
        className={`
          ${sizeClasses} 
          bg-blue-800 border-2 border-white rounded-lg shadow-md 
          flex items-center justify-center
          bg-opacity-90 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]
          ${className || ''}
        `}
      >
        <div className="w-full h-full border border-blue-600 rounded opacity-50"></div>
      </div>
    );
  }

  // Generate the image path based on the card data
  const imageSrc = getCardAssetPath(card);
  
  return (
    <div 
      onClick={onClick}
      className={`
        relative rounded-lg select-none cursor-pointer transition-all duration-100
        ${sizeClasses}
        ${selected ? 'ring-4 ring-yellow-400 z-30' : 'hover:ring-2 hover:ring-yellow-200 z-10 hover:z-20'}
        ${className || ''}
        shadow-lg
      `}
    >
      {/* 
        Render the SVG Image. 
        We use w-full h-full to fill the container defined by sizeClasses.
        object-contain ensures the aspect ratio is preserved.
        bg-white ensures transparency in SVGs doesn't show the background table color.
      */}
      <img 
        src={imageSrc} 
        alt={`${card.rank} of ${card.suit}`}
        className="w-full h-full object-contain rounded-lg bg-white"
        draggable={false}
      />

      {/* Selection Checkmark - Bottom Left (Overlay on top of the image) */}
      {selected && (
        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 w-6 h-6 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md border-2 border-white animate-fade-in z-40">
           <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
           </svg>
        </div>
      )}
      
      {/* Selected overlay tint */}
      {selected && (
        <div className="absolute inset-0 bg-yellow-400/20 pointer-events-none rounded-lg"></div>
      )}
    </div>
  );
};