import React, { useState } from 'react';
import { ShieldAlert, ArrowLeft, KeyRound, Mail, Lock } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiConfig';

export default function AdminGate({ onAuthSuccess, navigateTo, showNotification }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials fields.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const resData = await response.json();

      if (resData.status === 'success') {
        const { token, user } = resData;

        if (user.role !== 'admin') {
          setError('Access Denied: Your account does not have administrator privileges.');
          return;
        }

        // Store session tokens
        localStorage.setItem('jagriti_token', token);
        localStorage.setItem('jagriti_user', JSON.stringify(user));
        
        onAuthSuccess(user);
        showNotification('Successfully authenticated administrative session.');
      } else {
        setError(resData.message || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to security nodes failed. Please verify server status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center p-6 z-[3000] font-sans">
      
      {/* Back button */}
      <button 
        onClick={() => navigateTo('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-all border-none bg-transparent cursor-pointer"
      >
        <ArrowLeft size={16} />
        <span>Return to map view</span>
      </button>

      <div className="w-full max-w-[420px] bg-white border border-slate-350/40 rounded-3xl shadow-lg p-8 flex flex-col">
        
        {/* Shield Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
            <KeyRound size={26} />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Jagriti Admin Gate</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-[280px] leading-relaxed">
            Restricted access portal. Enter authorized credentials to authenticate database console access.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2.5 items-start text-[0.68rem] text-rose-700 font-bold mb-6">
            <ShieldAlert size={15} className="shrink-0 mt-0.5 text-rose-600" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.62rem] font-black uppercase text-slate-500 tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input 
                type="email"
                placeholder="admin@jagriti.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 text-xs border border-slate-350/50 rounded-xl bg-slate-50 focus:bg-white focus:outline-indigo-600 font-bold placeholder:text-slate-400 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mb-2">
            <label className="text-[0.62rem] font-black uppercase text-slate-500 tracking-wider">Console Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 text-xs border border-slate-350/50 rounded-xl bg-slate-50 focus:bg-white focus:outline-indigo-600 font-bold placeholder:text-slate-400 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-xl cursor-pointer transition-all shadow-md mt-2 flex items-center justify-center"
          >
            {loading ? 'Verifying Identity...' : 'Authenticate Console'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2 text-[0.62rem] leading-relaxed text-slate-450 bg-slate-50 p-3.5 rounded-xl border border-slate-350/20 text-center font-bold">
          <span>For local sandbox environments, use credentials:</span>
          <span className="font-mono text-indigo-650">admin@jagriti.org / adminpassword</span>
        </div>

      </div>

    </div>
  );
}
