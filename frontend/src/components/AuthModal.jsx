import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Phone, Eye, EyeOff, ShieldCheck, Check } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiConfig';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync mode when modal state or initialMode prop changes
  React.useEffect(() => {
    if (isOpen) {
      setIsSignUp(initialMode === 'signup');
    }
  }, [isOpen, initialMode]);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [gender, setGender] = useState('Female');
  const [mobileNumber, setMobileNumber] = useState('');
  
  // OTP States
  const [mobileOtp, setMobileOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  
  const [demoMobileOtp, setDemoMobileOtp] = useState(''); // Shown in UI for testing ease

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setName('');
    setSurname('');
    setGender('Female');
    setMobileNumber('');
    setMobileOtp('');
    setEmailOtp('');
    setMobileOtpSent(false);
    setEmailOtpSent(false);
    setDemoMobileOtp('');
    setError('');
    setSuccessMsg('');
  };

  const handleSendMobileOtp = async () => {
    if (!mobileNumber) {
      setError('Please enter a mobile number first');
      return;
    }
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/otp/mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMobileOtpSent(true);
        setDemoMobileOtp(data.otp); // Save demo OTP to show as quick simulation tool
        setSuccessMsg('Mobile verification code sent!');
      } else {
        setError(data.message || 'Failed to send mobile verification code');
      }
    } catch (err) {
      setError('Network error sending mobile OTP');
    }
  };

  const handleSendEmailOtp = async () => {
    if (!email) {
      setError('Please enter an email address first');
      return;
    }
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/otp/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setEmailOtpSent(true);
        setSuccessMsg('Verification code sent to your email address!');
      } else {
        setError(data.message || 'Failed to send email verification code');
      }
    } catch (err) {
      setError('Network error sending email OTP');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const url = isSignUp 
      ? `${API_BASE_URL}/api/auth/signup` 
      : `${API_BASE_URL}/api/auth/signin`;

    const payload = isSignUp
      ? { username, name, surname, gender, mobileNumber, email, password, mobileOtp, emailOtp }
      : { email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        localStorage.setItem('jagriti_token', data.token);
        localStorage.setItem('jagriti_user', JSON.stringify(data.user));
        
        setSuccessMsg(isSignUp ? 'Registration successful!' : 'Signed in successfully!');
        setTimeout(() => {
          onAuthSuccess(data.user);
          onClose();
          resetForm();
        }, 1000);
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Connection to security gateway failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        {/* Close Button */}
        <button 
          onClick={() => { onClose(); resetForm(); }}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full hover:bg-slate-50 transition-colors border-none bg-transparent"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 mx-auto mb-2">
            <ShieldCheck size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            {isSignUp ? 'Create Safe Account' : 'Gateway Verification'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            {isSignUp 
              ? 'Join Jagriti safety network to report active safety reports' 
              : 'Sign in to confirm safety logs or tip submissions'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-xs font-semibold mb-4 text-center">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl p-3 text-xs font-semibold mb-4 text-center flex items-center justify-center gap-1.5 animate-pulse">
            <Check size={14} /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp ? (
            /* SIGN UP FLOW */
            <>
              {/* Username */}
              <div>
                <label className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <User size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. anant99"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {/* Name & Surname */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Anant"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">Surname</label>
                  <input
                    type="text"
                    required
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="e.g. Patel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Mobile Number & OTP Verification */}
              <div>
                <label className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">Mobile Number</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-slate-400">
                      <Phone size={14} />
                    </span>
                    <input
                      type="tel"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="e.g. +919876543210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendMobileOtp}
                    className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer border-none"
                  >
                    Send OTP
                  </button>
                </div>
                {mobileOtpSent && (
                  <div className="mt-2 space-y-1">
                    <input
                      type="text"
                      required
                      value={mobileOtp}
                      onChange={(e) => setMobileOtp(e.target.value)}
                      placeholder="Enter 6-digit Mobile OTP"
                      className="w-full bg-slate-50 border border-emerald-300 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                    {demoMobileOtp && (
                      <span className="text-[0.6rem] text-emerald-600 font-bold block mt-0.5">
                        💡 Demo Code (SMS Sandbox): <span className="font-mono bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">{demoMobileOtp}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Email Address & OTP Verification */}
              <div>
                <label className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">Email Address (Gmail)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-slate-400">
                      <Mail size={14} />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@gmail.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer border-none"
                  >
                    Send OTP
                  </button>
                </div>
                {emailOtpSent && (
                  <div className="mt-2">
                    <input
                      type="text"
                      required
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      placeholder="Enter 6-digit Gmail OTP"
                      className="w-full bg-slate-50 border border-emerald-300 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                    <span className="text-[0.6rem] text-slate-400 block mt-0.5 font-semibold">
                      Please check your Gmail inbox (and Spam folders if needed) for the code.
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* SIGN IN FLOW */
            <>
              {/* Email */}
              <div>
                <label className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">Email Address</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            </>
          )}

          {/* Password (used by both login & signup) */}
          <div>
            <label className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Lock size={14} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer border-none ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isSignUp ? (
              'Verify & Create Account'
            ) : (
              'Verify & Sign In'
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccessMsg('');
            }}
            className="text-xs font-semibold text-cyan-600 hover:text-cyan-500 transition-colors border-none bg-transparent cursor-pointer"
          >
            {isSignUp ? 'Already registered? Sign In' : 'First time reporting? Create Account'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
