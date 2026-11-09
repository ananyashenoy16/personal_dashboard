import React, { useState } from 'react';
import { Flower2, Heart, Sparkles, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { api } from './api';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [importLocal, setImportLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST', body: JSON.stringify({ name, email, password }),
      });
      onAuthenticated(result.user, importLocal);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function googleSuccess(credentialResponse) {
    setBusy(true); setError('');
    try {
      const result = await api('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential: credentialResponse.credential }) });
      onAuthenticated(result.user, importLocal);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <main className="auth-screen">
    <section className="auth-card">
      <div className="auth-flower"><Flower2 size={27}/></div>
      <span className="eyebrow"><Sparkles size={13}/> YOUR OWN LITTLE CORNER</span>
      <h1>{mode === 'register' ? 'Make space for you.' : 'Welcome back, lovely.'}</h1>
      <p className="auth-subtitle">A gentle home for your habits, memories, work wins and little goals.</p>
      <div className="auth-tabs"><button className={mode === 'login' ? 'selected' : ''} onClick={() => {setMode('login');setError('')}} type="button">Sign in</button><button className={mode === 'register' ? 'selected' : ''} onClick={() => {setMode('register');setError('')}} type="button">Create account</button></div>
      <form onSubmit={submit} className="auth-form">
        {mode === 'register' && <label><span><UserRound size={15}/> Your name</span><input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="What should we call you?" required maxLength={80}/></label>}
        <label><span><Mail size={15}/> Email address</span><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label>
        <label><span><LockKeyhole size={15}/> Password</span><input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} minLength={mode === 'register' ? 8 : 1} required/></label>
        <label className="import-option"><input type="checkbox" checked={importLocal} onChange={e=>setImportLocal(e.target.checked)}/><span>Import the data currently saved in this browser (optional)</span></label>
        {error && <div role="alert" className="auth-error">{error}</div>}
        <button className="primary-btn auth-submit" type="submit" disabled={busy}>{busy ? 'One moment…' : mode === 'register' ? 'Create my space' : 'Enter my space'} <Heart size={15}/></button>
      </form>
      {googleClientId ? <><div className="auth-or"><span/>or continue with Google<span/></div><div className="google-login"><GoogleOAuthProvider clientId={googleClientId}><GoogleLogin onSuccess={googleSuccess} onError={()=>setError('Google sign-in could not be completed. Please try again.')} width="300"/></GoogleOAuthProvider></div></> : <p className="google-hint">Google sign-in can be enabled after adding your Google OAuth client ID to the environment files.</p>}
      <div className="auth-privacy"><Heart size={14}/> Your account is private. Sign in to access your saved space on your devices.</div>
    </section>
    <div className="auth-decoration decor-left">✿</div><div className="auth-decoration decor-right">♡</div>
  </main>;
}
