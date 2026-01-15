import React, { useState } from 'react';
import { User } from '../types';

interface CreditModalProps {
  currentUser: User;
  onClose: () => void;
  onUpdateCredits: (newBalance: number) => void;
}

export const CreditModal: React.FC<CreditModalProps> = ({ currentUser, onClose, onUpdateCredits }) => {
  const [searchPhone, setSearchPhone] = useState('');
  const [targetUser, setTargetUser] = useState<{ nickname: string, phone: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleSearch = async () => {
    if (!searchPhone) return;
    setLoading(true);
    setMsg({ text: '', type: '' });
    setTargetUser(null);
    
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', phone: searchPhone })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        if (data.user.phone === currentUser.phone) {
             setMsg({ text: '不能给自己转账', type: 'error' });
        } else {
             setTargetUser(data.user);
        }
      } else {
        setMsg({ text: '未找到该用户', type: 'error' });
      }
    } catch (e) {
      setMsg({ text: '搜索失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!targetUser || !amount) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'transfer', 
          fromPhone: currentUser.phone, 
          toPhone: targetUser.phone, 
          amount: amount 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: '转账成功!', type: 'success' });
        onUpdateCredits(data.newBalance);
        setAmount('');
        setTargetUser(null);
        setSearchPhone('');
      } else {
        setMsg({ text: data.error || '转账失败', type: 'error' });
      }
    } catch (e) {
      setMsg({ text: '网络错误', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
            <h2 className="font-bold text-lg">积分管理</h2>
            <button onClick={onClose} className="text-white/80 hover:text-white">✕</button>
        </div>
        
        <div className="p-6 flex flex-col gap-4">
            <div className="bg-emerald-50 p-3 rounded border border-emerald-100 text-center">
                <div className="text-xs text-emerald-600 font-bold uppercase">当前积分</div>
                <div className="text-2xl font-black text-emerald-700">{currentUser.credits}</div>
            </div>

            {/* Search */}
            <div className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  placeholder="搜索对方手机号"
                  value={searchPhone}
                  onChange={e => setSearchPhone(e.target.value)}
                />
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-gray-800 text-white px-4 py-2 rounded text-sm font-bold hover:bg-gray-700"
                >
                  {loading ? '...' : '搜索'}
                </button>
            </div>

            {/* Result & Transfer */}
            {targetUser && (
                <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-4 animate-fade-in">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-800 font-bold">
                            {targetUser.nickname[0]}
                        </div>
                        <div>
                            <div className="font-bold text-gray-800">{targetUser.nickname}</div>
                            <div className="text-xs text-gray-500">{targetUser.phone}</div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500">赠送数量</label>
                        <input 
                            type="number" 
                            className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-emerald-500"
                            placeholder="输入积分数量"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                        <button 
                            onClick={handleTransfer}
                            disabled={loading || !amount}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded shadow-md mt-2 disabled:opacity-50"
                        >
                            确认转账
                        </button>
                    </div>
                </div>
            )}

            {msg.text && (
                <div className={`text-center text-sm font-bold p-2 rounded ${msg.type === 'error' ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                    {msg.text}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};