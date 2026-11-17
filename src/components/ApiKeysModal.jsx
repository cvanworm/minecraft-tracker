import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const date = timestamp => new Date(timestamp).toLocaleDateString();

export default function ApiKeysModal({ onClose }) {
  const { user, setShowSwitchModal } = useAuth();
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('ComputerCraft');
  const [access, setAccess] = useState('read');
  const [days, setDays] = useState(30);
  const [createdKey, setCreatedKey] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const passwordLogin = user.authMethod === 'password';

  useEffect(() => {
    if (!passwordLogin) { setLoading(false); return; }
    let active = true;
    api('/api/keys').then(data => { if (active) setKeys(data.keys); })
      .catch(error => { if (active) setError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [passwordLogin]);

  async function create(event) {
    event.preventDefault(); setBusy(true); setError(''); setCreatedKey(null); setNotice('');
    try {
      const scopes = ['items:read', 'progress:read', ...(access === 'write' ? ['progress:write'] : [])];
      const { key } = await api('/api/keys', { method: 'POST', body: { name, scopes, expires_in_days: days } });
      setCreatedKey(key);
      const { token, ...metadata } = key;
      setKeys(previous => [metadata, ...previous]);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  async function revoke(id) {
    setBusy(true); setError('');
    try {
      await api(`/api/keys/${id}`, { method: 'DELETE', body: {} });
      setKeys(previous => previous.map(key => key.id === id ? { ...key, revoked_at: Date.now() } : key));
      if (createdKey?.id === id) setCreatedKey(null);
      setNotice('Key revoked. It can no longer access the tracker.');
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  async function copy(value) {
    try { await navigator.clipboard.writeText(value); setNotice('Copied.'); }
    catch { setNotice('Select the text and copy it manually.'); }
  }

  return <div className="fixed inset-0 z-50 bg-black/85 flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
    <section role="dialog" aria-modal="true" aria-label="API keys" className="mc-panel p-4 sm:p-6 w-full max-w-2xl my-auto text-xs">
      <div className="flex justify-between gap-3 mb-4 items-center">
        <h2 className="font-minecraft text-[#ffff55] text-sm">API KEYS</h2>
        <button onClick={onClose} className="mc-btn p-2" aria-label="Close API keys">CLOSE</button>
      </div>
      {error && <p role="alert" className="text-[#ff8888] bg-[#331111] p-3 mb-3">{error}</p>}
      {notice && <p role="status" className="text-[#55ffff] mb-3">{notice}</p>}
      {!passwordLogin ? <div>
        <p className="mb-3">Sign in with the shared password to create or revoke keys. An API key cannot create more keys or switch player names.</p>
        <button className="mc-btn-emerald p-3" onClick={() => { onClose(); setShowSwitchModal(true); }}>PASSWORD SIGN IN</button>
      </div> : <>
        <p className="text-[#aaaaaa] mb-4">Create a separate key for each computer. Keys are shown once and all updates are attributed to {user.username}.</p>
        <form onSubmit={create} className="mc-slot p-3 space-y-3 mb-4">
          <label className="block">Key name<input className="mc-input w-full p-2 mt-1" value={name} onChange={e => setName(e.target.value)} required maxLength={80} /></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label>Permissions<select className="mc-input w-full p-2 mt-1" value={access} onChange={e => setAccess(e.target.value)}>
              <option value="read">Read items & progress</option><option value="write">Read & update progress</option>
            </select></label>
            <label>Expires in<select className="mc-input w-full p-2 mt-1" value={days} onChange={e => setDays(Number(e.target.value))}>
              {[7, 30, 90, 365].map(n => <option key={n} value={n}>{n} days</option>)}
            </select></label>
          </div>
          <button disabled={busy || loading} type="submit" className="mc-btn-emerald px-4 py-2 disabled:opacity-50">CREATE API KEY</button>
        </form>
        {createdKey && <div className="border-2 border-[#55ffff] bg-[#102626] p-3 mb-4">
          <p className="text-[#55ffff] mb-2">Copy this key now. It will not be shown again after closing this panel.</p>
          <code className="block break-all select-all bg-black p-3 text-white">{createdKey.token}</code>
          <button className="mc-btn mt-2 p-2" onClick={() => copy(createdKey.token)}>COPY KEY</button>
        </div>}
        <h3 className="font-minecraft text-[10px] text-[#ffff55] mb-2">YOUR KEYS</h3>
        {loading ? <p>Loading keys…</p> : !keys.length ? <p className="text-[#aaaaaa] mb-4">No API keys yet.</p> : <ul className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {keys.map(key => <li key={key.id} className="mc-slot p-3 flex gap-3 justify-between items-center">
            <div className="min-w-0">
              <p className="text-white break-words">{key.name}</p>
              <p className="text-[#aaaaaa] text-[10px] mt-1">{key.prefix}… · {key.scopes.includes('progress:write') ? 'Read & update' : 'Read only'}</p>
              <p className="text-[#aaaaaa] text-[10px]">{key.revoked_at ? 'Revoked' : key.expires_at < Date.now() ? 'Expired' : `Expires ${date(key.expires_at)}`} · {key.last_used_at ? `Last used ${date(key.last_used_at)}` : 'Never used'}</p>
            </div>
            {!key.revoked_at && <button disabled={busy} onClick={() => revoke(key.id)} className="mc-btn p-2 text-[#ff8888]">REVOKE</button>}
          </li>)}
        </ul>}
      </>}
      <div className="mc-slot p-3 text-[11px] text-[#aaaaaa] leading-relaxed">
        <p className="text-[#55ffff] mb-2">ComputerCraft HTTP</p>
        <p>Send <code className="text-white">Authorization: Bearer YOUR_API_KEY</code> with every request.</p>
        <p className="mt-2">Base URL: <code className="text-white break-all">{location.origin}/api/v1</code></p>
        <p>GET /items · GET /progress · PATCH /progress/stone</p>
        <p className="mt-2">Updates use JSON, for example <code className="text-white">{'{"is_completed":true}'}</code>.</p>
      </div>
    </section>
  </div>;
}
