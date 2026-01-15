import React, { useState } from 'react';
import { User } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const action = isRegister ? 'register' : 'login';
      const payload = isRegister 
        ? { action, phone, nickname, password }
        : { action, phone, password };

      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      if (isRegister) {
        setIsRegister(false);
        setError('注册成功，请登录');
        setPassword('');
      } else {
        onLoginSuccess(data.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex bg-gray-100 p-1">
          <button 
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${!isRegister ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            onClick={() => { setIsRegister(false); setError(''); }}
          >
            登录
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${isRegister ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            onClick={() => { setIsRegister(true); setError(''); }}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-center text-gray-800">
            {isRegister ? '创建新账户' : '欢迎回来'}
          </h2>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">手机号</label>
            <input 
              type="text" 
              required
              className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
              placeholder="请输入手机号"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">昵称</label>
              <input 
                type="text" 
                required
                className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                placeholder="游戏中显示的名称"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">密码 (6位以上)</label>
            <input 
              type="password" 
              required
              minLength={6}
              className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
              placeholder="请输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="text-red-500 text-sm text-center font-medium">{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg transition disabled:opacity-50 mt-2"
          >
            {loading ? '处理中...' : (isRegister ? '立即注册' : '登录')}
          </button>

          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 text-sm hover:text-gray-600"
          >
            取消
          </button>
        </form>
      </div>
    </div>
  );
};