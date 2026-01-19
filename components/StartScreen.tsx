import React, { useState } from 'react';
import { Seat } from '../types';

interface StartScreenProps {
  onStart: (seat: Seat, roomId: number) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  // Store both the selected room/table ID and the seat
  const [selection, setSelection] = useState<{ roomId: number; seat: Seat } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStartGame = () => {
    if (selection) {
      setLoading(true);
      // Simulate checking for "at least 2 players" or initialization
      setTimeout(() => {
        onStart(selection.seat, selection.roomId);
        setLoading(false);
      }, 500);
    }
  };
  
  const SeatButton = ({ roomId, position, label, seatValue }: { roomId: number, position: string, label: string, seatValue: Seat }) => {
    // Check if this specific seat in this specific room is selected
    const isSelected = selection?.roomId === roomId && selection?.seat === seatValue;
    
    return (
        <div 
          onClick={() => setSelection({ roomId, seat: seatValue })}
          className={`absolute ${position} flex flex-col items-center justify-center cursor-pointer group transition-all duration-300 z-20 ${isSelected ? 'scale-110' : 'hover:scale-110'}`}
        >
           {/* Chair / Avatar Placeholder */}
           <div className={`
                w-12 h-12 md:w-14 md:h-14 rounded-full border-4 shadow-lg flex items-center justify-center transition-colors relative
                ${isSelected 
                    ? 'bg-red-500 border-red-600 shadow-red-500/50' 
                    : 'bg-white border-slate-300 group-hover:border-blue-500'
                }
           `}>
              <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`}>
                {label}
              </span>
           </div>
        </div>
      );
  };

  const PokerTable = ({ id, name, stake }: { id: number, name: string, stake: string }) => (
    <div className="relative w-64 h-40 md:w-80 md:h-48 bg-[#5d4037] rounded-xl shadow-2xl flex items-center justify-center mx-6 my-8 border-[6px] border-[#3e2723]">
       {/* Table Felt Gradient */}
       <div className="absolute inset-1 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-lg shadow-inner border border-emerald-900/30 flex flex-col items-center justify-center overflow-hidden">
           
           {/* Center Decoration */}
           <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-emerald-400/10 flex items-center justify-center">
              <span className="text-emerald-900/20 text-4xl md:text-5xl">♠</span>
           </div>
           
           {/* Table Info */}
           <div className="absolute flex flex-col items-center">
             <span className="text-emerald-100/90 font-serif font-bold tracking-widest text-base md:text-lg drop-shadow-md">{name}</span>
             <span className="text-emerald-300/60 text-[10px] md:text-xs font-mono mt-1">底分: {stake}</span>
           </div>
       </div>

       {/* Seats Positions - Pass the Table ID (roomId) to each seat */}
       <SeatButton roomId={id} position="-top-5 md:-top-7" label="北" seatValue={Seat.North} />
       <SeatButton roomId={id} position="-bottom-5 md:-bottom-7" label="南" seatValue={Seat.South} />
       <SeatButton roomId={id} position="-left-5 md:-left-7" label="西" seatValue={Seat.West} />
       <SeatButton roomId={id} position="-right-5 md:-right-7" label="东" seatValue={Seat.East} />
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col items-center bg-gray-100 relative overflow-y-auto">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>

      <div className="z-10 w-full max-w-6xl flex flex-col items-center py-10 px-4">
         <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-slate-700 tracking-tight">游戏大厅</h2>
            <p className="text-slate-400 text-xs md:text-sm mt-2 font-medium">
               {selection ? "点击下方按钮开始匹配" : "请选择空闲座位 (红色代表已选)"}
            </p>
         </div>
         
         <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-24 w-full">
            <PokerTable id={1} name="房间 1" stake="100" />
            <PokerTable id={2} name="房间 2" stake="5000" />
         </div>

         {/* Start Button Area */}
         <div className="mt-12 w-full max-w-xs h-16 relative">
            {selection && (
                <button 
                  onClick={handleStartGame}
                  disabled={loading}
                  className="w-full h-full bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold rounded-full shadow-xl transform transition hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 animate-bounce"
                >
                  {loading ? '准备牌局中...' : '开始游戏'}
                  {!loading && <span className="text-2xl">➔</span>}
                </button>
            )}
            {!selection && (
                 <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm bg-slate-200/50 rounded-full border border-slate-300 border-dashed">
                    请先点击桌子旁的座位
                 </div>
            )}
         </div>
      </div>
    </div>
  );
};