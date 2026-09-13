'use client';
import { useState } from 'react';
import { supabaseBrowser } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#100E0C', color: '#F4EEE0', fontFamily: 'sans-serif', padding: 24,
    }}>
      <div style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.16em', color: '#C79A4B', textTransform: 'uppercase', marginBottom: 10 }}>
          Baralho de Reflexões
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, marginBottom: 24 }}>Entrar</h1>

        {sent ? (
          <p style={{ color: 'rgba(244,238,224,0.75)' }}>
            Enviamos um link mágico para <b>{email}</b>. Abra seu e-mail e clique no link para entrar.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email" required placeholder="seu@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(244,238,224,0.2)',
                background: 'rgba(244,238,224,0.06)', color: '#F4EEE0', fontSize: 15, marginBottom: 14,
              }}
            />
            <button type="submit" style={{
              width: '100%', padding: '12px 14px', borderRadius: 22, border: 'none',
              background: '#C79A4B', color: '#241D10', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>
              Enviar link de acesso
            </button>
            {error && <p style={{ color: '#D97757', marginTop: 12, fontSize: 13 }}>{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
