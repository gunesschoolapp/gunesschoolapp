import React, { useState } from 'react';
import { Sun, Mail, Lock, Chrome, KeyRound } from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

export default function Login() {
  const [activeTab, setActiveTab] = useState('google'); // 'google' or 'email'
  const [emailMode, setEmailMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      let firebaseUser;
      if (Capacitor.isNativePlatform()) {
        // Native Google Sign-In via Capawesome
        try {
          await GoogleSignIn.initialize({
            clientId: '438062176512-e4iqdc3g40uv02jd5rmk2i153hd0c43d.apps.googleusercontent.com'
          });
        } catch (initErr) {
          console.log('Google Sign-In already initialized or failed to init:', initErr);
        }
        const result = await GoogleSignIn.signIn({});
        if (!result.idToken) {
          throw new Error('Google giriş kimliği (ID Token) alınamadı.');
        }
        const credential = GoogleAuthProvider.credential(result.idToken);
        const userCredential = await signInWithCredential(auth, credential);
        firebaseUser = userCredential.user;
      } else {
        // Web Browser Google Sign-In via Firebase SDK
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const userCredential = await signInWithPopup(auth, provider);
        firebaseUser = userCredential.user;
      }
      window.location.href = '/';
    } catch (err) {
      console.error('Google login error:', err);
      let msg = err.message || 'Google ile giriş yapılırken bir hata oluştu.';
      if (msg.includes('user-cancelled') || msg.includes('popup-closed-by-user')) {
        msg = 'Giriş işlemi iptal edildi.';
      } else if (msg.includes('No credentials available')) {
        msg = 'Cihazınızda tanımlı bir Google hesabı (Gmail) bulunamadı. Lütfen önce cihaz ayarlarına girerek bir Google hesabı ekleyin ve tekrar deneyin.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Lütfen e-posta ve şifrenizi girin.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      window.location.href = '/';
    } catch (err) {
      console.error('Email login error:', err);
      let msg = 'E-posta veya şifre hatalı.';
      if (err.code === 'auth/user-not-found') {
        msg = 'Bu e-posta adresine ait bir kullanıcı bulunamadı. Lütfen önce kaydolun.';
      } else if (err.code === 'auth/wrong-password') {
        msg = 'Şifre hatalı. Lütfen tekrar deneyin.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Geçersiz e-posta formatı.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }
    if (password.length < 6) {
      setError('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Şifreler uyuşmuyor.');
      return;
    }
    try {
      setLoading(true);
      setError(null);

      await createUserWithEmailAndPassword(auth, email.trim(), password);
      window.location.href = '/';
    } catch (err) {
      console.error('Email sign up error:', err);
      let msg = err.message || 'Kayıt oluşturulurken bir hata oluştu.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Bu e-posta adresiyle zaten bir hesap oluşturulmuş. Giriş yapmayı deneyin.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Geçersiz e-posta formatı.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000024] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#dfae5f]/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#000052]/40 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Güneş English School"
            className="w-24 h-24 rounded-3xl shadow-[0_0_35px_rgba(223,174,95,0.2)] mx-auto mb-4 object-cover border border-[#dfae5f]/20"
          />
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-[#dfae5f] via-white to-[#dfae5f] bg-clip-text text-transparent">
            Güneş English School
          </h1>
          <p className="text-[#dfae5f]/70 text-xs uppercase tracking-wider font-semibold mt-2">
            Yönetim & İletişim Portalı
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-[#00003b]/50 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl p-8">
          {/* Tab Selector */}
          <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-white/5 mb-6">
            <button
              onClick={() => { setActiveTab('google'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === 'google'
                  ? 'bg-[#dfae5f] text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Chrome className="w-4 h-4" />
              Google ile Giriş
            </button>
            <button
              onClick={() => { setActiveTab('email'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === 'email'
                  ? 'bg-[#dfae5f] text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4" />
              E-posta / Şifre
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl text-xs text-center leading-relaxed">
              {error}
            </div>
          )}

          {activeTab === 'google' ? (
            <div className="text-center py-4">
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Okul sisteminde kayıtlı olan Gmail hesabınızla tek tıkla güvenli giriş yapabilirsiniz.
              </p>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl border border-white/10 bg-slate-950 hover:bg-slate-900 hover:border-[#dfae5f]/30 transition-all font-bold text-sm shadow-inner group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#dfae5f]/20 border-t-[#dfae5f] rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google ile Giriş Yap
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={emailMode === 'login' ? handleEmailLogin : handleEmailSignUp} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="E-posta Adresi"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#dfae5f] focus:ring-1 focus:ring-[#dfae5f] transition-all text-sm"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  placeholder="Şifre"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#dfae5f] focus:ring-1 focus:ring-[#dfae5f] transition-all text-sm"
                />
              </div>

              {emailMode === 'signup' && (
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    placeholder="Şifre Tekrar"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#dfae5f] focus:ring-1 focus:ring-[#dfae5f] transition-all text-sm"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-[#dfae5f] to-[#cf9e4f] hover:from-[#cf9e4f] hover:to-[#bf8e3f] text-slate-950 font-black transition-all text-sm shadow-lg shadow-[#dfae5f]/10 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                ) : emailMode === 'login' ? (
                  'Giriş Yap'
                ) : (
                  'Kayıt Ol'
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode(emailMode === 'login' ? 'signup' : 'login');
                    setError(null);
                  }}
                  className="text-xs text-[#dfae5f] hover:text-[#cf9e4f] font-semibold transition-colors"
                >
                  {emailMode === 'login'
                    ? 'İlk kez mi giriş yapıyorsunuz? Kaydolun'
                    : 'Zaten bir hesabınız var mı? Giriş Yapın'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

