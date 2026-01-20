
import React, { useState, useEffect } from 'react';
import { Seat } from '../types';

interface StartScreenProps {
  onStart: (seat: Seat, roomId: number) => void;
  waitingMessage?: string | null;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, waitingMessage }) => {
  const [selection, setSelection] = useState<{ roomId: number; seat: Seat } | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-retry if waiting (simple polling mechanism)
  useEffect(() => {
      let interval: any;
      if (waitingMessage && selection) {
          // Poll every 3 seconds
          interval = setInterval(() => {
             onStart(selection.seat, selection.roomId);
          }, 3000);
      }
      return () => clearInterval(interval);
  }, [waitingMessage, selection, onStart]);

  const handleSeatClick = (seat: Seat, roomId: number) => {
    setSelection({ roomId, seat });
    setLoading(true);
    // Slight delay for visual feedback
    setTimeout(() => {
      onStart(seat, roomId);
      setLoading(false);
    }, 200);
  };

  const handleResetDB = async () => {
    if(!confirm('确定要重置所有游戏数据吗？房间将被清空。')) return;
    try {
        const res = await fetch('/api/setup-db');
        if(res.ok) alert('重置成功，请重新开始游戏');
        else alert('重置失败');
    } catch(e) { alert('网络错误'); }
  };
  
  const SeatButton = ({ roomId, position, label, seatValue }: { roomId: number, position: string, label: string, seatValue: Seat }) => (
    <div 
      onClick={() => handleSeatClick(seatValue, roomId)}
      className={`absolute ${position} flex flex-col items-center justify-center cursor-pointer group transition-all duration-300 hover:scale-110 z-20`}
    >
       {/* Chair / Avatar Placeholder */}
       <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 border-4 border-slate-300 shadow-lg flex items-center justify-center group-hover:border-blue-500 group-hover:shadow-blue-500/30 transition-colors relative bg-white">
          <span className="font-bold text-sm text-slate-500 group-hover:text-blue-600">{label}</span>
          
          {/* Plus Icon for "Add" */}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] md:text-xs border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity">
            +
          </div>
       </div>
    </div>
  );

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
             <span className="text-emerald-200/60 text-xs">底注: ${stake}</span>
             
             {/* Loading / Waiting Status */}
             {loading && selection?.roomId === id && (
                 <div className="mt-2 text-yellow-300 text-xs animate-pulse">连接中...</div>
             )}
             {waitingMessage && selection?.roomId === id && (
                 <div className="mt-2 text-yellow-300 text-[10px] bg-black/20 px-2 py-1 rounded max-w-[150px] text-center">
                    {waitingMessage}
                 </div>
             )}
           </div>
       </div>

       {/* Seats Positions */}
       <SeatButton roomId={id} position="-top-5 md:-top-6" label="北" seatValue={Seat.North} />
       <SeatButton roomId={id} position="-bottom-5 md:-bottom-6" label="南" seatValue={Seat.South} />
       <SeatButton roomId={id} position="-left-5 md:-left-6" label="西" seatValue={Seat.West} />
       <SeatButton roomId={id} position="-right-5 md:-right-6" label="东" seatValue={Seat.East} />
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col items-center bg-gray-100 relative overflow-y-auto">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>

      <div className="z-10 w-full max-w-6xl flex flex-col items-center py-10 px-4">
         <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-slate-700 tracking-tight">游戏大厅</h2>
            <p className="text-slate-400 text-xs md:text-sm mt-2 font-medium">请选择空闲座位开始匹配</p>
         </div>
         
         <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-24 w-full">
            <PokerTable id={1} name="房间 1" stake="100" />
            <PokerTable id={2} name="房间 2" stake="5000" />
         </div>
      </div>
      
      {/* Debug/Reset Tool */}
      <button 
        onClick={handleResetDB} 
        className="absolute bottom-4 right-4 text-xs text-slate-400 hover:text-red-500 opacity-50 hover:opacity-100 transition"
      >
         重置/初始化数据
      </button>
    </div>
  );
};
