'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Loader2 } from 'lucide-react';
import {
  sendEmailOtp,
  completeEmailOtp,
  sendPhoneOtp,
  confirmPhoneOtp,
} from '@/lib/auth';
import { isSignInWithEmailLink } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import type { ConfirmationResult } from 'firebase/auth';

type Step = 'select' | 'email-sent' | 'phone-otp';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>('select');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [mode, setMode] = useState<'email' | 'phone'>('phone');

  // Redirect if already authenticated — role-based destination
  useEffect(() => {
    if (user) router.replace(user.role === 'TENANT' ? '/my/home' : '/dashboard');
  }, [user, router]);

  // Handle magic link completion
  useEffect(() => {
    const finish = searchParams.get('finish');
    if (!finish || !firebaseAuth) return;

    const emailLink = window.location.href;
    if (!isSignInWithEmailLink(firebaseAuth, emailLink)) return;

    setLoading(true);
    completeEmailOtp(emailLink, rememberMe)
      .then((authUser) => {
        toast.success(`Welcome back, ${authUser.name}!`);
        router.replace(authUser.role === 'TENANT' ? '/my/home' : '/dashboard');
      })
      .catch(() => {
        setError('Link expired or already used. Request a new one.');
        setLoading(false);
      });
  }, []); // eslint-disable-line

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Enter your email'); return; }
    setError('');
    setLoading(true);
    try {
      await sendEmailOtp(email.trim());
      setStep('email-sent');
      toast.success('Magic link sent! Check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) { setError('Enter a valid 10-digit Indian mobile number'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await sendPhoneOtp(`+91${phone}`, 'recaptcha-container');
      setConfirmation(result);
      setStep('phone-otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    if (!confirmation) return;
    setError('');
    setLoading(true);
    try {
      const authUser = await confirmPhoneOtp(confirmation, otp, rememberMe);
      toast.success(`Welcome, ${authUser.name}!`);
      router.replace(authUser.role === 'TENANT' ? '/my/home' : '/dashboard');
    } catch {
      setError('Incorrect OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div id="recaptcha-container" />

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-primary">Numero Uno</h1>
        <p className="text-muted-foreground text-sm mt-1">PG Management Made Simple</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {step === 'select' && (
          <>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === 'phone' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => { setMode('phone'); setError(''); }}
              >
                Phone (Tenant)
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === 'email' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => { setMode('email'); setError(''); }}
              >
                Email (Staff)
              </button>
            </div>

            {mode === 'email' ? (
              <form onSubmit={handleSendEmailOtp} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                    autoComplete="email"
                  />
                  {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  Remember me on this device
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send Magic Link
                </button>
              </form>
            ) : (
              <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Phone number</label>
                  <div className="mt-1 flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                    <span className="px-3 py-2.5 text-sm font-semibold bg-muted text-foreground">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                      placeholder="9876543210"
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-background"
                      inputMode="numeric"
                    />
                  </div>
                  {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  Remember me on this device
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Send OTP
                </button>
              </form>
            )}
          </>
        )}

        {step === 'email-sent' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-semibold text-lg">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a magic link to <strong>{email}</strong>. Tap it to sign in.
            </p>
            <button onClick={() => { setStep('select'); setError(''); }} className="text-sm text-primary underline">
              Use a different email
            </button>
          </div>
        )}

        {step === 'phone-otp' && (
          <form onSubmit={handleConfirmOtp} className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit OTP sent to <strong>+91 {phone}</strong>
              </p>
            </div>
            <div>
              <input
                type="text"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                placeholder="000000"
                className="w-full border rounded-lg px-3 py-3 text-center text-xl tracking-widest outline-none focus:ring-2 focus:ring-primary bg-background"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              {error && <p className="text-xs text-destructive mt-1 text-center">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Verify OTP
            </button>
            <button type="button" onClick={() => { setStep('select'); setOtp(''); setError(''); }} className="w-full text-sm text-muted-foreground underline">
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
