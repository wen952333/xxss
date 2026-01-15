import React from 'react';

interface StartScreenProps {
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  
  const Seat = ({ position, label, onClick }: { position: string, label: string, onClick: () => void }) => (
    <div 
      onClick={onClick}
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
             <span className="text-emerald-300/60 text-[10px] md:text-xs font-mono mt-1">底分: {stake}</span>
           </div>
       </div>

       {/* Seats Positions */}
       <Seat position="-top-5 md:-top-6" label="北" onClick={onStart} />
       <Seat position="-bottom-5 md:-bottom-6" label="南" onClick={onStart} />
       <Seat position="-left-5 md:-left-6" label="西" onClick={onStart} />
       <Seat position="-right-5 md:-right-6" label="东" onClick={onStart} />
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
            <PokerTable id={1} name="初级场 001" stake="100" />
            <PokerTable id={2} name="高级场 002" stake="5000" />
         </div>
      </div>
    </div>
  );
};