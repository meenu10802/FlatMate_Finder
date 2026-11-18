import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { passwordStrength } from '../lib/passwordStrength.js';
import PasswordStrength from '../components/ui/PasswordStrength.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Eyebrow from '../components/ui/Eyebrow.jsx';
import DemoMatchCard from '../components/matches/DemoMatchCard.jsx';

/** Shared form for Login and Register. */
export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    setFormError('');
    if (isRegister && values.password && passwordStrength(values.password).level === 'weak') {
      setFieldErrors({ password: 'Make your password at least Medium strength' });
      return;
    }
    setSubmitting(true);
    try {
      const user = isRegister
        ? await register(values)
        : await login({ email: values.email, password: values.password });
      const from = location.state?.from?.pathname;
      navigate(!user.hasProfile ? '/onboarding' : from || '/browse', { replace: true });
    } catch (err) {
      const fe = err.details?.fieldErrors;
      if (fe) setFieldErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0]])));
      else setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-2 lg:py-14">
      <section className="flex flex-col justify-center py-6 lg:px-10">
        <Eyebrow>{isRegister ? 'Step 1 of 2 · Account' : 'Welcome back'}</Eyebrow>
        <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl">
          {isRegister ? (
            <>Let's find your <em>people</em>.</>
          ) : (
            <>Good to see you <em>again</em>.</>
          )}
        </h1>
        <p className="mt-4 text-neutral-500">
          {isRegister
            ? 'Create an account, then tell us how you live. Takes about two minutes.'
            : 'Log in to see your matches and messages.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-10 max-w-md space-y-5" noValidate>
          {isRegister && (
            <Input label="Your name" autoComplete="name" placeholder="Priya Sharma" value={values.name} onChange={set('name')} error={fieldErrors.name} required />
          )}
          <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={values.email} onChange={set('email')} error={fieldErrors.email} required />
          <div className="space-y-3">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              value={values.password}
              onChange={set('password')}
              error={fieldErrors.password}
              hint={isRegister && !values.password ? 'At least 8 characters' : undefined}
              required
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="rounded-full p-1.5 text-neutral-500 hover:text-black dark:hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            {isRegister && <PasswordStrength password={values.password} />}
          </div>

          {formError && (
            <p role="alert" className="rounded-2xl border border-black bg-white px-4 py-3 text-sm font-medium dark:border-white dark:bg-neutral-950">
              {formError}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
            {!submitting && <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />}
          </Button>

          <p className="text-sm text-neutral-500">
            {isRegister ? 'Already have an account? ' : 'New here? '}
            <Link to={isRegister ? '/login' : '/register'} className="font-medium text-black underline decoration-neutral-300 underline-offset-4 hover:decoration-black dark:text-white">
              {isRegister ? 'Log in' : 'Create an account'}
            </Link>
          </p>
        </form>
      </section>

      <aside className="grain relative hidden min-h-[640px] overflow-hidden rounded-[40px] bg-black text-white lg:block" aria-hidden="true">
        <div className="bg-dots-inverse absolute inset-0 opacity-70" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Flatmate Finder</p>
          <div className="flex justify-center">
            <DemoMatchCard className="rotate-[-3deg] motion-safe:animate-float" />
          </div>
          <p className="font-display text-4xl leading-tight">
            Good flatmates aren't found.<br />
            <em className="text-neutral-400">They're matched.</em>
          </p>
        </div>
      </aside>
    </main>
  );
}
