import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { messageFrom } from '../api.js';
import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';
import { btnPrimary, inputCls } from '../ui.js';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(messageFrom(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Log in to your account">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <FormField label="Email" htmlFor="email">
          <input id="email" type="email" required autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Password" htmlFor="password">
          <input id="password" type="password" required autoComplete="current-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormField>
        <button type="submit" className={`${btnPrimary} w-full`} disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        No account?{' '}
        <Link to="/signup" className="font-medium text-indigo-600 hover:underline">Sign up</Link>
      </p>
    </AuthCard>
  );
}
