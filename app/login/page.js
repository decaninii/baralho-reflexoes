'use client';
import { useState } from 'react';
import { supabaseBrowser } from '../../lib/supabaseClient';
import { THEMES } from '../../lib/themes';

export default function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [preferredThemeIds, setPreferredThemeIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    const supabase = supabaseBrowser();
    if (!supabase) { setError('App ainda não configurado (variáveis do Supabase ausentes).'); setLoading(false); return; }

    if (mode === 'signup') {
      if (preferredThemeIds.length === 0) {
        setError('Escolha pelo menos um tema.'); setLoading(false); return;
      }
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, birth_date: birthDate, preferred_theme_ids: preferredThemeIds } },
      });
      setLoading(false);
      if (error) { setError(error.message); return; }
      if (data.session) {
        window.location.href = '/';
      } else {
        setMessage('Conta criada! Verifique seu e-mail para confirmar antes de entrar.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      window.location.href = '/';
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#100E0C', color: '#F4EEE0', fontFamily: 'sans-serif', padding: 24,
    }}>
      <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.16em', color: '#C79A4B', textTransform: 'uppercase', marginBottom: 10 }}>
          Minuto de Reflexão
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, marginBottom: 6 }}>
          {mode === 'signup' ? 'Criar conta' : 'Entrar'}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(244,238,224,0.5)', marginBottom: 20 }}>
          {mode === 'signup' ? (
            <>Já tem conta? <button type="button" onClick={() => { setMode('signin'); setError(''); setMessage(''); }} style={linkBtn}>Entrar</button></>
          ) : (
            <>Ainda não tem conta? <button type="button" onClick={() => { setMode('signup'); setError(''); setMessage(''); }} style={linkBtn}>Criar conta</button></>
          )}
        </p>

        <form onSubmit={handleSubmit}>
          <input type="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" required minLength={6} placeholder="senha (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />

          {mode === 'signup' && (
            <>
              <input type="text" required placeholder="seu nome" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
              <label style={labelStyle}>Data de nascimento</label>
              <input type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={inputStyle} />
              <label style={labelStyle}>Temas que mais te interessam (escolha um ou mais)</label>
              <div style={checkGrid}>
                {THEMES.map(t => (
                  <label key={t.id} style={checkItem(preferredThemeIds.includes(t.id))}>
                    <input
                      type="checkbox"
                      checked={preferredThemeIds.includes(t.id)}
                      onChange={() => setPreferredThemeIds(prev =>
                        prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                      )}
                      style={{ marginRight: 8 }}
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px 14px', borderRadius: 22, border: 'none',
            background: loading ? '#8A6A26' : '#C79A4B', color: '#241D10', fontWeight: 600, fontSize: 14,
            cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 4,
          }}>
            {loading && <span style={spinnerStyle} />}
            {loading ? 'Só um instante...' : (mode === 'signup' ? 'Criar conta' : 'Entrar')}
          </button>
          {error && <p style={{ color: '#D97757', marginTop: 12, fontSize: 13 }}>{error}</p>}
          {message && <p style={{ color: '#8FA07E', marginTop: 12, fontSize: 13 }}>{message}</p>}
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const linkBtn = { background: 'none', border: 'none', color: '#C79A4B', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, padding: 0 };
const labelStyle = { display: 'block', textAlign: 'left', fontSize: 12, color: 'rgba(244,238,224,0.5)', marginBottom: 6 };
const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(244,238,224,0.2)',
  background: 'rgba(244,238,224,0.06)', color: '#F4EEE0', fontSize: 15, marginBottom: 12,
};
const spinnerStyle = {
  width: 14, height: 14, border: '2px solid rgba(36,29,16,0.4)', borderTopColor: '#241D10',
  borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block',
};
const checkGrid = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14, textAlign: 'left',
};
function checkItem(active) {
  return {
    display: 'flex', alignItems: 'center', fontSize: 13, padding: '9px 10px', borderRadius: 8,
    border: `1px solid ${active ? '#C79A4B' : 'rgba(244,238,224,0.15)'}`,
    background: active ? 'rgba(199,154,75,0.12)' : 'rgba(244,238,224,0.04)',
    color: '#F4EEE0', cursor: 'pointer',
  };
}
