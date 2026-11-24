import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { messageFrom } from '../api.js';
import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';
import { btnPrimary, inputCls } from '../ui.js';

export default function Signup() {
  const { user, loading, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', organizationName: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: ['Passwords do not match'] });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await signup(form.email, form.password, form.organizationName);
      navigate('/');
    } catch (err) {
      setErrors(err.fieldErrors || {});
      if (!err.fieldErrors || Object.keys(err.fieldErrors).length === 0) setFormError(messageFrom(err));
      setSubmitting(false);
    }
  }

  const err = (f) => errors[f]?.[0];

  return (
    <AuthCard title="Create your account" subtitle="Set up your organization in seconds">
      <form onSubmit={onSubmit} className="space-y-4">
        {formError && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
        <FormField label="Organization name" htmlFor="org" error={err('organizationName')}>
          <input id="org" required placeholder="My Test Store" className={inputCls} value={form.organizationName} onChange={set('organizationName')} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={err('email')}>
          <input id="email" type="email" required autoComplete="email" className={inputCls} value={form.email} onChange={set('email')} />
        </FormField>
        <FormField label="Password" htmlFor="password" hint="At least 8 characters" error={err('password')}>
          <input id="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} value={form.password} onChange={set('password')} />
        </FormField>
        <FormField label="Confirm password" htmlFor="confirm" error={err('confirmPassword')}>
          <input id="confirm" type="password" required autoComplete="new-password" className={inputCls} value={form.confirmPassword} onChange={set('confirmPassword')} />
        </FormField>
        <button type="submit" className={`${btnPrimary} w-full`} disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:underline">Log in</Link>
      </p>
    </AuthCard>
  );
}
