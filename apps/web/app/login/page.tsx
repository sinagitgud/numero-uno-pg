'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { sendPhoneOtp, confirmPhoneOtp } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import type { ConfirmationResult } from 'firebase/auth';

type Step = 'phone' | 'otp';

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 30;

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const startOtpFlow = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) { setError('Enter a valid 10-digit Indian mobile number'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await sendPhoneOtp(`+91${phone}`, 'recaptcha-container');
      setConfirmation(result);
      setStep('otp');
      setResendCountdown(RESEND_COUNTDOWN);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await startOtpFlow();
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setError('');
    await startOtpFlow();
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    setError('');
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtpDigits(next);
    setError('');
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length !== OTP_LENGTH) { setError('Enter the 6-digit OTP'); return; }
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
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
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

            {/* Segmented OTP boxes */}
            <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  className="w-10 h-12 text-center text-xl font-bold border rounded-lg outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              ))}
            </div>

            {error && <p className="text-xs text-destructive mt-1 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || otpDigits.join('').length !== OTP_LENGTH}
              className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Verify OTP
            </button>

            {/* Resend */}
            <p className="text-center text-sm">
              {resendCountdown > 0 ? (
                <span className="text-muted-foreground">Resend OTP in {resendCountdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-primary font-medium underline"
                >
                  Resend OTP
                </button>
              )}
            </p>

            <button
              type="button"
              onClick={() => { setStep('phone'); setOtpDigits(Array(OTP_LENGTH).fill('')); setError(''); }}
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
