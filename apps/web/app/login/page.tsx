'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { sendPhoneOtp, confirmPhoneOtp } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import type { ConfirmationResult } from 'firebase/auth';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) { setError('Enter a valid 10-digit Indian mobile number'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await sendPhoneOtp(`+91${phone}`, 'recaptcha-container');
      setConfirmation(result);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    if (!confirmation) return;
    setError('');
    setLoading(true);
    try {
      const authUser = await confirmPhoneOtp(confirmation, otp, rememberMe);
      toast.success(`Welcome, ${authUser.name}!`);
      if (authUser.isPendingApproval) {
        router.replace('/pending');
      } else if (authUser.role === 'TENANT') {
        router.replace('/tenant');
      } else {
        router.replace('/dashboard');
      }
    } catch (err: any) {
      setError('Incorrect OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      {/* Invisible recaptcha container */}
      <div id="recaptcha-container" />

      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-primary">Numero Uno</h1>
        <p className="text-muted-foreground text-sm mt-1">PG Management Made Simple</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Mobile number</label>
              <div className="mt-1 flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <span className="px-3 py-2.5 text-sm font-semibold bg-muted text-foreground">+91</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                  placeholder="9876543210"
                  className="flex-1 px-3 py-2.5 text-sm outline-none bg-background"
                  inputMode="numeric"
                  autoFocus
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
              disabled={loading || phone.length !== 10}
              className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Send OTP
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
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
                autoFocus
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
            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              className="w-full text-sm text-muted-foreground underline"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
