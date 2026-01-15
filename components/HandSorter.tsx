import React, { useState, useEffect } from 'react';
import { Card, HandFormation } from '../types';
import { CardComponent } from './CardComponent';
import { getSmartRecommendations } from '../utils/gameLogic';

interface HandSorterProps {
  cards: Card[];
  onConfirm: (formation: HandFormation) => void;
  onExit: () => void;
  onNextRound: (formation: HandFormation) => void;
}

type RowType = 'front' | 'middle' | 'back';

export const HandSorter: React.FC<HandSorterProps> = ({ cards, onConfirm, onExit, onNextRound }) => {
  const [front, setFront] = useState<Card[]>([]);
  const [middle, setMiddle] = useState<Card[]>([]);
  const [back, setBack] = useState<Card[]>([]);
  
  // Smart Sort State
  const [recommendations, setRecommendations] = useState<HandFormation[]>([]);
  const [recIndex, setRecIndex] = useState(0);
  
  // Selection State
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Init
  useEffect(() => {
    if (cards.length === 13) {
      // Calculate recommendations once on load
      const recs = getSmartRecommendations(cards);
      setRecommendations(recs);
      
      // Apply first recommendation or default sort
      if (recs.length > 0) {
        applyFormation(recs[0]);
      } else {
        const sorted = [...cards].sort((a, b) => a.rank - b.rank);
        setFront(sorted.slice(0, 3));
        setMiddle(sorted.slice(3, 8));
        setBack(sorted.slice(8, 13));
      }
      setSelectedCardIds(new Set());
    }
  }, [cards]);

  const applyFormation = (f: HandFormation) => {
    setFront(f.front);
    setMiddle(f.middle);
    setBack(f.back);
    setSelectedCardIds(new Set());
  };

  const toggleCardSelection = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation(); 
    const newSelection = new Set(selectedCardIds);
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId);
    } else {
      newSelection.add(cardId);
    }
    setSelectedCardIds(newSelection);
  };

  const moveSelectedToRow = (targetRowName: RowType) => {
    if (selectedCardIds.size === 0) return;

    const separateCards = (list: Card[]) => {
      const selected: Card[] = [];
      const remaining: Card[] = [];
      list.forEach(card => {
        if (selectedCardIds.has(card.id)) {
          selected.push(card);
        } else {
          remaining.push(card);
        }
      });
      return { selected, remaining };
    };

    const f = separateCards(front);
    const m = separateCards(middle);
    const b = separateCards(back);

    const allSelectedCards = [...f.selected, ...m.selected, ...b.selected];

    setFront(f.remaining);
    setMiddle(m.remaining);
    setBack(b.remaining);

    if (targetRowName === 'front') setFront(prev => [...prev, ...allSelectedCards]);
    else if (targetRowName === 'middle') setMiddle(prev => [...prev, ...allSelectedCards]);
    else if (targetRowName === 'back') setBack(prev => [...prev, ...allSelectedCards]);

    setSelectedCardIds(new Set());
  };

  const handleSmartSort = () => {
    if (recommendations.length === 0) return;
    
    // Cycle index
    const nextIndex = (recIndex + 1) % recommendations.length;
    setRecIndex(nextIndex);
    applyFormation(recommendations[nextIndex]);
  };

  const handleSubmit = () => {
    if (front.length !== 3 || middle.length !== 5 || back.length !== 5) {
      alert("请确保：前墩3张，中墩5张，后墩5张");
      return;
    }
    onNextRound({ front, middle, back });
  };

  const getCurrentFormation = (): HandFormation => ({ front, middle, back });

  const renderRow = (rowName: RowType, cardsArr: Card[], label: string, isLast: boolean = false) => (
    <div className="flex-1 w-full flex flex-col min-h-0">
      <div 
        onClick={() => moveSelectedToRow(rowName)}
        className={`
          relative flex-1 flex items-center w-full cursor-pointer
          border-t-2 ${isLast ? 'border-b-2' : ''} border-emerald-500
          bg-emerald-900/20 backdrop-blur-sm
          transition-colors duration-200
          hover:bg-emerald-800/40
          justify-start pl-4 md:pl-8 pr-4
        `}
      >
        <div className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-0 pointer-events-none">
           <span className="text-emerald-300/10 text-4xl md:text-8xl font-black uppercase tracking-tighter select-none">{label}</span>
        </div>
        
        {selectedCardIds.size > 0 && (
           <div className="absolute inset-0 flex items-center justify-end pr-8 pointer-events-none z-0">
             <span className="text-emerald-400/30 text-2xl font-bold animate-pulse">点击移动到此处</span>
           </div>
        )}

        <div className="flex justify-start items-center -space-x-8 md:-space-x-12 lg:-space-x-16 h-full w-full z-10 overflow-visible py-2">
          {cardsArr.map((card) => (
            <CardComponent 
              key={card.id} 
              card={card} 
              selected={selectedCardIds.has(card.id)}
              onClick={(e) => toggleCardSelection(e as any, card.id)}
              // Reduced height to 76% (approx 20% smaller than 96%)
              className="h-[76%] aspect-[5/7] shadow-2xl text-lg md:text-4xl"
            />
          ))}
        </div>
        
        <div className={`absolute right-2 top-2 text-xs font-bold px-2 py-1 rounded ${cardsArr.length === (rowName === 'front' ? 3 : 5) ? 'bg-emerald-600 text-white' : 'bg-red-900/50 text-red-200'}`}>
           {cardsArr.length} / {rowName === 'front' ? 3 : 5}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full relative">
      
      {/* Top Buttons - Short names as requested */}
      <div className="shrink-0 w-full bg-emerald-900 border-b-0 p-2 flex justify-center gap-3 shadow-lg z-30">
        <button 
          onClick={handleSubmit}
          className="flex-1 max-w-[120px] py-2 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded shadow border-b-4 border-amber-700 active:border-b-0 active:mt-1 text-sm whitespace-nowrap"
        >
          提交
        </button>
        
        <button 
          onClick={handleSmartSort}
          className="flex-1 max-w-[120px] py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow border-b-4 border-blue-800 active:border-b-0 active:mt-1 text-sm whitespace-nowrap relative"
        >
          理牌
          {recommendations.length > 1 && (
            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-400"></span>
            </span>
          )}
        </button>
        
        <button 
          onClick={() => {
             onConfirm(getCurrentFormation());
             setTimeout(onExit, 500);
          }}
          className="flex-1 max-w-[120px] py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow border-b-4 border-red-800 active:border-b-0 active:mt-1 text-sm whitespace-nowrap"
        >
          退出
        </button>
      </div>

      <div className="flex-1 flex flex-col w-full bg-emerald-800 overflow-hidden relative">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
        
        <div className="z-10 w-full h-full flex flex-col">
           {renderRow('front', front, 'Front')}
           {renderRow('middle', middle, 'Middle')}
           {renderRow('back', back, 'Back', true)}
        </div>
      </div>
    </div>
  );
};