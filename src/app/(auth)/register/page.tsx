'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, Lock, User, UserPlus, Check, X } from 'lucide-react';
import OAuthButtons from '@/components/OAuthButtons';
import FormInput from '@/components/ui/FormInput';
import { useFormValidation, createValidationRules } from '@/hooks/useFormValidation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validationRules = useMemo(
    () => ({
      name: createValidationRules.name(true, 100),
      email: createValidationRules.email(true),
      password: createValidationRules.password(6),
      confirmPassword: createValidationRules.confirmPassword(() => password),
    }),
    [password]
  );

  const { getFieldError, handleBlur, validateAllFields, validateField, touched } =
    useFormValidation<{
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
    }>(validationRules);

  // Password strength indicators
  const passwordChecks = useMemo(
    () => ({
      length: password.length >= 6,
      hasMatch: password.length > 0 && confirmPassword.length > 0 && password === confirmPassword,
    }),
    [password, confirmPassword]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isValid = validateAllFields({ name, email, password, confirmPassword });
    if (!isValid) return;

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Re-validate confirm password when password changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
    // Re-validate confirm password if it's been touched
    if (touched.confirmPassword && confirmPassword) {
      setTimeout(() => validateField('confirmPassword', confirmPassword), 0);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (error) setError(null);
  };

  if (success) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We&apos;ve sent you a confirmation link to <strong>{email}</strong>
        </p>
        <button
          onClick={() => router.push('/login')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create an account</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Get started with KanbanPro</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <FormInput
          id="name"
          type="text"
          label="Full Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          onBlur={() => handleBlur('name', name)}
          error={getFieldError('name')}
          icon={<User className="h-5 w-5" />}
          placeholder="John Doe"
          autoComplete="name"
        />

        <FormInput
          id="email"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          onBlur={() => handleBlur('email', email)}
          error={getFieldError('email')}
          icon={<Mail className="h-5 w-5" />}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <div className="space-y-2">
          <FormInput
            id="password"
            type="password"
            label="Password"
            value={password}
            onChange={handlePasswordChange}
            onBlur={() => handleBlur('password', password)}
            error={getFieldError('password')}
            icon={<Lock className="h-5 w-5" />}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          {/* Password strength indicator */}
          {password.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`flex items-center gap-1 ${passwordChecks.length ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}
              >
                {passwordChecks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                6+ characters
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <FormInput
            id="confirmPassword"
            type="password"
            label="Confirm Password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            onBlur={() => handleBlur('confirmPassword', confirmPassword)}
            error={getFieldError('confirmPassword')}
            icon={<Lock className="h-5 w-5" />}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          {/* Password match indicator */}
          {confirmPassword.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`flex items-center gap-1 ${passwordChecks.hasMatch ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}
              >
                {passwordChecks.hasMatch ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                Passwords match
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <UserPlus className="h-5 w-5" />
              Create Account
            </>
          )}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
        </div>
      </div>

      <OAuthButtons />

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
