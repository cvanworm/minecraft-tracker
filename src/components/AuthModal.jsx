import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const { user, isAuthenticated, setupRequired, authError, login, loginWithKey, setup, switchUser, showSwitchModal, setShowSwitchModal } = useAuth();
  const [initialCodes] = useState(() => Object.fromEntries(new URLSearchParams(window.location.hash.slice(1))));
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [setupToken, setSetupToken] = useState(initialCodes.setup ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const readSetupCode = () => {
      const code = new URLSearchParams(window.location.hash.slice(1)).get('setup');
      if (code) {
        setSetupToken(code);
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
    readSetupCode();
    window.addEventListener('hashchange', readSetupCode);
    return () => window.removeEventListener('hashchange', readSetupCode);
  }, []);
  const currentMode = setupRequired ? 'setup' : showSwitchModal && user?.authMethod === 'password' ? 'player' : mode;
  if (isAuthenticated && !showSwitchModal) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    const result = await (currentMode === 'setup' ? setup({ username, password, setupToken })
      : currentMode === 'player' ? switchUser(username)
      : currentMode === 'key' ? loginWithKey(apiKey.trim()) : login(password, username));
    setBusy(false);
    if (!result.success) setError(result.error);
    else { setPassword(''); setApiKey(''); setSetupToken(''); }
  }
  function choose(next) { setMode(next); setPassword(''); setApiKey(''); setError(''); }

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 overflow-y-auto">
    <div className="w-full max-w-md mc-panel p-6 text-slate-100 my-auto">
      <h1 className="font-minecraft text-sm text-[#ffff55] mb-2">{currentMode === 'setup' ? 'SET SHARED PASSWORD' : currentMode === 'player' ? 'SWITCH PLAYER' : 'MINECRAFT ALL-ITEMS'}</h1>
      <p className="font-pixel text-xs text-[#aaaaaa] mb-4 leading-relaxed">
        {currentMode === 'setup' ? 'Use the one-time setup code from the server to set your group’s shared password and choose your player name.'
          : currentMode === 'key' ? 'Use an API key to open the tracker with that key’s permissions.'
          : currentMode === 'player' ? 'Choose the player name for this session. Existing API keys keep their original player name.' : 'Enter the shared password and your Minecraft player name to join the hunt.'}
      </p>
      {!setupRequired && currentMode !== 'player' && <div className="flex gap-2 mb-4 text-[10px]">
        <button className={mode === 'login' ? 'mc-btn-emerald p-2' : 'mc-btn p-2'} onClick={() => choose('login')}>SHARED PASSWORD</button>
        <button className={mode === 'key' ? 'mc-btn-emerald p-2' : 'mc-btn p-2'} onClick={() => choose('key')}>API KEY</button>
      </div>}
      {(error || authError) && <p role="alert" className="p-3 mb-3 text-xs text-[#ff8888] bg-[#331111] border border-black">{error || authError}</p>}
      <form onSubmit={submit} className="space-y-3 text-xs">
        {currentMode === 'setup' && <label className="block">Setup code
          <input type="password" autoComplete="off" value={setupToken} onChange={e => setSetupToken(e.target.value)} required className="mc-input w-full p-2 mt-1" />
        </label>}
        {currentMode === 'key' ? <label className="block">API key
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} autoComplete="off" required placeholder="mct_…" className="mc-input w-full p-2 mt-1" />
        </label> : <>
          <label className="block">Player name
            <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" pattern="[A-Za-z0-9_]{3,32}" minLength={3} maxLength={32} required className="mc-input w-full p-2 mt-1" />
          </label>
          {currentMode !== 'player' && <label className="block">Shared password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={currentMode === 'login' ? 'current-password' : 'new-password'} minLength={currentMode === 'login' ? 1 : 12} maxLength={256} required className="mc-input w-full p-2 mt-1" />
          </label>}
          {currentMode === 'setup' && <p className="text-[10px] text-[#aaaaaa]">Use at least 12 characters. Share this password with trusted players. Only its salted hash is stored.</p>}
        </>}
        <button disabled={busy} type="submit" className="mc-btn-emerald w-full p-3 disabled:opacity-50">{busy ? 'PLEASE WAIT…' : currentMode === 'setup' ? 'SET SHARED PASSWORD' : currentMode === 'player' ? 'SWITCH PLAYER' : 'SIGN IN'}</button>
        {showSwitchModal && <button type="button" className="mc-btn w-full p-2" onClick={() => setShowSwitchModal(false)}>CANCEL</button>}
      </form>
    </div>
  </div>;
}
