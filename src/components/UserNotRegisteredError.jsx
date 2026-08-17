import React from 'react';
import { useAuth } from '@/lib/AuthContext';

const UserNotRegisteredError = () => {
  const { logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-slate-100/80">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-amber-50 text-amber-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Erişim Engellendi</h1>
          <p className="text-slate-500 text-sm mb-6">
            Girdiğiniz e-posta adresi Güneş English School sisteminde kayıtlı görünmüyor. Lütfen yöneticinizle iletişime geçin.
          </p>
          <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 text-left border border-slate-100">
            <p className="font-semibold text-slate-700">Yapabileceğiniz işlemler:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Doğru hesapla giriş yaptığınızdan emin olun.</li>
              <li>Okul yönetimiyle iletişime geçerek e-posta adresinizin tanımlanmasını isteyin.</li>
              <li>Farklı bir hesapla tekrar giriş yapmayı deneyin.</li>
            </ul>
          </div>
          <button
            onClick={logout}
            className="w-full mt-6 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all text-sm shadow-sm"
          >
            Farklı Hesapla Giriş Yap
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;
