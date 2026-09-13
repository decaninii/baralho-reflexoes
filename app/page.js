'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_THEMES, FEATURED_ID } from '../lib/themes';
import { supabaseBrowser } from '../lib/supabaseClient';

// Temas liberados sem assinatura (teste do produto antes de pagar)
const FREE_THEME_IDS = [FEATURED_ID, 'estoicismo', 'motivacional'];

function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function Home() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [user, setUser] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [favorites, setFavorites] = useState(new Set()); // chaves "themeId:idx"
  const [currentThemeId, setCurrentThemeId] = useState(FEATURED_ID);
  const [manualIndex, setManualIndex] = useState({});
  const [showMedium, setShowMedium] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deepOpen, setDeepOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyImg, setStoryImg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const canvasRef = useRef(null);
  const speakingRef = useRef(false);

  // --- Sessão + assinatura + favoritos ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!user) { setIsSubscribed(false); setFavorites(new Set()); return; }
    supabase.from('subscriptions').select('status').eq('user_id', user.id).single()
      .then(({ data }) => setIsSubscribed(data?.status === 'active'));
    supabase.from('favorites').select('theme_id, phrase_idx').eq('user_id', user.id)
      .then(({ data }) => setFavorites(new Set((data || []).map(f => `${f.theme_id}:${f.phrase_idx}`))));
  }, [user, supabase]);

  function getTheme(id) { return ALL_THEMES.find(t => t.id === id); }
  function isLocked(themeId) { return !FREE_THEME_IDS.includes(themeId) && !isSubscribed; }
  function getCurrentIndex(theme) {
    if (manualIndex[theme.id] !== undefined) return manualIndex[theme.id];
    return dayOfYear() % theme.phrases.length;
  }
  function getCurrentPhrase(theme) {
    const idx = getCurrentIndex(theme);
    return { idx, ...theme.phrases[idx] };
  }

  const theme = getTheme(currentThemeId);
  const phrase = getCurrentPhrase(theme);
  const displayColor = (theme.featured && phrase.themeColor) ? phrase.themeColor : theme.color;
  const favKey = `${currentThemeId}:${phrase.idx}`;
  const isFav = favorites.has(favKey);

  function selectTheme(id) {
    if (isLocked(id)) { setStoryOpen(false); showToast('Esse tema é exclusivo da assinatura'); return; }
    setCurrentThemeId(id);
    setShowMedium(false);
    setSidebarOpen(false);
  }
  function navPhrase(dir) {
    const len = theme.phrases.length;
    const cur = getCurrentIndex(theme);
    setManualIndex(m => ({ ...m, [theme.id]: (cur + dir + len) % len }));
    setShowMedium(false);
  }
  function navRandom() {
    const len = theme.phrases.length;
    setManualIndex(m => ({ ...m, [theme.id]: Math.floor(Math.random() * len) }));
    setShowMedium(false);
  }

  async function toggleFav() {
    if (!user) { window.location.href = '/login'; return; }
    const next = new Set(favorites);
    if (next.has(favKey)) {
      next.delete(favKey);
      await supabase.from('favorites').delete()
        .match({ user_id: user.id, theme_id: currentThemeId, phrase_idx: phrase.idx });
      showToast('Removido dos favoritos');
    } else {
      next.add(favKey);
      await supabase.from('favorites').insert({
        user_id: user.id, theme_id: currentThemeId, phrase_idx: phrase.idx,
      });
      showToast('Salvo nos favoritos');
    }
    setFavorites(next);
  }

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 1800);
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) { showToast('Áudio não suportado neste navegador'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR'; u.rate = 0.98;
    speechSynthesis.speak(u);
  }

  function drawStory() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const [r, g, b] = hexToRgb(displayColor);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, `rgb(${Math.min(r + 40, 255)},${Math.min(g + 40, 255)},${Math.min(b + 40, 255)})`);
    bg.addColorStop(0.55, `rgb(${Math.round(r * 0.35)},${Math.round(g * 0.32)},${Math.round(b * 0.3)})`);
    bg.addColorStop(1, '#0F0D0B');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    function glow(x, y, radius, alpha) {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    }
    glow(W * 0.15, H * 0.18, 420, 0.55);
    glow(W * 0.85, H * 0.82, 480, 0.45);

    ctx.fillStyle = 'rgba(244,238,224,0.18)';
    ctx.font = '900 220px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('“', W / 2, H * 0.34);

    ctx.fillStyle = '#F4EEE0';
    ctx.font = '600 64px Georgia, serif';
    wrapText(ctx, phrase.short, W / 2, H * 0.46, W * 0.78, 78);

    const themeName = (theme.featured && phrase.themeName) ? phrase.themeName : theme.name;
    ctx.font = '600 30px sans-serif';
    ctx.fillStyle = `rgb(${Math.min(r + 60, 255)},${Math.min(g + 60, 255)},${Math.min(b + 60, 255)})`;
    ctx.fillText(themeName.toUpperCase(), W / 2, H * 0.70);

    ctx.font = 'italic 34px Georgia, serif';
    ctx.fillStyle = 'rgba(244,238,224,0.75)';
    ctx.fillText('Baralho de Reflexões', W / 2, H * 0.92);

    setStoryImg(canvas.toDataURL('image/png'));
  }
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '', lines = [];
    for (const w of words) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxWidth && line !== '') { lines.push(line); line = w + ' '; }
      else line = test;
    }
    lines.push(line);
    const startY = y - (lines.length - 1) * lineHeight / 2;
    lines.forEach((l, i) => ctx.fillText(l.trim(), x, startY + i * lineHeight));
  }

  async function handleShare() {
    drawStory();
    setStoryOpen(true);
  }
  async function downloadStory() {
    const canvas = canvasRef.current;
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'frase-do-dia.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; } catch { /* fallback abaixo */ }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = 'frase-do-dia.png'; a.href = url; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    }, 'image/png');
  }

  async function handleUpgrade() {
    if (!user) { window.location.href = '/login'; return; }
    const res = await fetch('/api/create-subscription', { method: 'POST' });
    const data = await res.json();
    if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    else showToast('Não foi possível iniciar a assinatura');
  }

  return (
    <div id="app" style={{ '--theme-color': displayColor }}>
      <div className="topbar">
        {user ? (
          <>
            {!isSubscribed && <button onClick={handleUpgrade}>Assinar</button>}
            <span style={{ opacity: 0.5 }}>{user.email}</span>
          </>
        ) : (
          <a href="/login">Entrar</a>
        )}
      </div>

      <div id="sidebar" className={sidebarOpen ? 'open' : ''}>
        <div className="sidebar-head">
          <div className="brandmark">Baralho de Reflexões</div>
          <button id="sidebarClose" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <div id="themeList">
          {ALL_THEMES.map(t => (
            <div
              key={t.id}
              className={`theme-item ${t.id === currentThemeId ? 'active' : ''} ${t.featured ? 'featured' : ''}`}
              onClick={() => selectTheme(t.id)}
            >
              <span className="dot" style={{ background: t.color }}></span>
              {t.featured ? '★ ' : ''}{t.name}
              {isLocked(t.id) && <span className="lockBadge"> 🔒</span>}
            </div>
          ))}
        </div>
        <div id="favTrigger" onClick={() => setFavOpen(true)}>♥ Meus favoritos</div>
      </div>
      {sidebarOpen && <div id="sidebarBackdrop" className="show" onClick={() => setSidebarOpen(false)} />}

      <div id="stage">
        <div className="blob blob1" />
        <div className="blob blob2" />
        <div className="blob blob3" />
        <button id="menuToggle" onClick={() => setSidebarOpen(true)}>☰</button>
        <div id="stageLabel">
          <b>{theme.featured ? '★ ' + theme.name : theme.name}</b> ·{' '}
          {theme.featured && phrase.themeName ? `de ${phrase.themeName}` : 'reflexão'}
          <span className="navctrl">
            <button onClick={() => navPhrase(-1)}>‹</button>
            <span style={{ opacity: 0.6 }}>{phrase.idx + 1}/{theme.phrases.length}</span>
            <button onClick={() => navPhrase(1)}>›</button>
            <button className="shuffle" onClick={navRandom}>🎲</button>
          </span>
        </div>

        <div className="phraseCard">
          <div id="shortText" onClick={() => setShowMedium(s => !s)}>{phrase.short}</div>
          <div id="mediumText" className={showMedium ? 'show' : ''}>{phrase.medium}</div>
        </div>

        <div className="stageActions">
          <button className="actbtn" onClick={() => speak(phrase.short)}><span className="glyph">🔊</span>ouvir</button>
          <button className={`actbtn ${isFav ? 'on' : ''}`} onClick={toggleFav}>
            <span className="glyph">{isFav ? '♥' : '♡'}</span>salvar
          </button>
          <button className="actbtn" onClick={handleShare}><span className="glyph">↗</span>compartilhar</button>
          <button className="actbtn" onClick={() => setDeepOpen(true)}><span className="glyph">＋</span>aprofundar</button>
        </div>
      </div>

      {deepOpen && (
        <div className="overlay show">
          <div className="sheet">
            <button className="sheet-close" onClick={() => setDeepOpen(false)}>✕</button>
            <h2>{phrase.short}</h2>
            <div className="source">
              {phrase.author ? `${phrase.author}${phrase.context ? ' · ' + phrase.context : ''}` : 'Reflexão do dia'}
            </div>
            {phrase.long.map((p, i) => <p key={i}>{p}</p>)}
            <div className="questionBox">{phrase.question}</div>
            <button className="listenbtn" onClick={() => speak(phrase.medium + ' ' + phrase.long.join(' ') + ' ' + phrase.question)}>
              🔊 ouvir reflexão
            </button>
          </div>
        </div>
      )}

      {favOpen && (
        <div className="overlay show">
          <div className="sheet">
            <button className="sheet-close" onClick={() => setFavOpen(false)}>✕</button>
            <h2>Meus favoritos</h2>
            {!user && <p className="emptyfav">Entre na sua conta para salvar e ver favoritos.</p>}
            {user && favorites.size === 0 && <p className="emptyfav">Nenhuma frase salva ainda.</p>}
            {user && Array.from(favorites).map(key => {
              const [tid, idxStr] = key.split(':');
              const t = getTheme(tid);
              const p = t.phrases[parseInt(idxStr)];
              return (
                <div key={key} className="favitem" onClick={() => { setFavOpen(false); setManualIndex(m => ({ ...m, [tid]: parseInt(idxStr) })); selectTheme(tid); setDeepOpen(true); }}>
                  <div className="ftext">"{p.short}"</div>
                  <div className="fmeta">{t.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {storyOpen && (
        <div className="overlay show">
          <div className="sheet" style={{ maxWidth: 380, textAlign: 'center' }}>
            <button className="sheet-close" onClick={() => setStoryOpen(false)}>✕</button>
            <h2>Post para Stories</h2>
            <canvas ref={canvasRef} width={1080} height={1920} style={{ display: 'none' }} />
            {storyImg && <img src={storyImg} alt="Frase do dia" style={{ width: '100%', maxWidth: 260, borderRadius: 14 }} />}
            <div style={{ marginTop: 16 }}>
              <button className="listenbtn" onClick={downloadStory}>⬇ Compartilhar / baixar</button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && <div className="toast show">{toastMsg}</div>}
    </div>
  );
}
