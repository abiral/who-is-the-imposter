(() => {
  'use strict';

  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 30;
  const STORE_COUNT = 'witi.players';
  const STORE_USED = 'witi.used';

  const $ = (id) => document.getElementById(id);
  const els = {
    screens: document.querySelectorAll('.screen'),
    count: $('count'), minus: $('minus'), plus: $('plus'), start: $('start'),
    quit: $('quit'), bar: $('bar'), counter: $('counter'), playerName: $('player-name'),
    holder: $('holder'), shown: $('shown'), next: $('next'),
    starter: $('starter'), showAnswer: $('show-answer'), answer: $('answer'),
    ansImp: $('ans-imp'), ansWord: $('ans-word'), ansHint: $('ans-hint'),
    again: $('again'), menu: $('menu'), toast: $('toast'),
  };

  let words = [];
  let game = null; // { players, imposter, starter, entry, current, seen }

  // ---------- Storage (best effort) ----------
  const store = {
    get(k, fallback) {
      try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  // ---------- Unbiased crypto random ----------
  function randInt(n) {
    if (n <= 0) return 0;
    const c = window.crypto || window.msCrypto;
    if (!c || !c.getRandomValues) return Math.floor(Math.random() * n);
    const max = 0x100000000;
    const limit = max - (max % n);
    const buf = new Uint32Array(1);
    let x;
    do { c.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return x % n;
  }

  // Random word, avoiding repeats until every word has been used once.
  function pickWord() {
    let used = store.get(STORE_USED, []);
    if (!Array.isArray(used)) used = [];
    let usedSet = new Set(used);
    let pool = words.filter((w) => !usedSet.has(w.word));
    if (pool.length === 0) { used = []; pool = words.slice(); }
    const entry = pool[randInt(pool.length)];
    used.push(entry.word);
    store.set(STORE_USED, used);
    return entry;
  }

  // ---------- UI helpers ----------
  function show(id) {
    els.screens.forEach((s) => {
      if (s.id === id) s.setAttribute('data-active', '');
      else s.removeAttribute('data-active');
    });
    window.scrollTo(0, 0);
  }

  let toastTimer;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  function clampCount(n) {
    n = parseInt(n, 10);
    if (Number.isNaN(n)) n = 4;
    return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, n));
  }

  function setCount(n) {
    els.count.value = clampCount(n);
    store.set(STORE_COUNT, Number(els.count.value));
  }

  const playerLabel = (i) => `Player ${i + 1}`;

  // ---------- Game flow ----------
  function newGame(players) {
    const entry = pickWord();
    game = {
      players,
      entry,
      imposter: randInt(players),
      starter: randInt(players),
      current: 0,
      seen: false,
    };
    renderTurn();
    show('screen-reveal');
  }

  function renderTurn() {
    const { current, players } = game;
    game.seen = false;
    hideSecret();
    els.playerName.textContent = playerLabel(current);
    els.counter.textContent = `${current + 1}/${players}`;
    els.bar.style.width = `${(current / players) * 100}%`;
    els.next.disabled = true;
    els.next.textContent = 'Hold the card first';
  }

  function revealSecret() {
    if (!game) return;
    const isImp = game.current === game.imposter;
    els.shown.textContent = '';
    if (isImp) {
      els.holder.classList.add('imposter');
      els.shown.innerHTML =
        '<p class="imp-title">You are the<br>imposter</p>' +
        '<div class="imp-hint"><p class="word-label">Your hint</p><p class="word"></p></div>';
      els.shown.querySelector('.word').textContent = game.entry.hint;
    } else {
      els.holder.classList.remove('imposter');
      els.shown.innerHTML = '<p class="word-label">Your word</p><p class="word"></p>';
      els.shown.querySelector('.word').textContent = game.entry.word;
    }
    els.holder.classList.add('pressed');
    if (!game.seen) {
      game.seen = true;
      if (navigator.vibrate) { try { navigator.vibrate(isImp ? [40, 60, 40] : 25); } catch { /* ignore */ } }
    }
  }

  function hideSecret() {
    els.holder.classList.remove('pressed', 'imposter');
    els.shown.textContent = '';
    if (game && game.seen) {
      const last = game.current === game.players - 1;
      els.next.disabled = false;
      els.next.textContent = last ? 'Everyone is ready, start!' : `Done, pass to ${playerLabel(game.current + 1)}`;
    }
  }

  function nextTurn() {
    if (!game || !game.seen) return;
    if (game.current < game.players - 1) {
      game.current += 1;
      renderTurn();
    } else {
      els.bar.style.width = '100%';
      startRound();
    }
  }

  function startRound() {
    els.starter.textContent = playerLabel(game.starter);
    // restart pop animation
    els.starter.style.animation = 'none';
    void els.starter.offsetWidth;
    els.starter.style.animation = '';
    els.answer.hidden = true;
    els.showAnswer.hidden = false;
    els.ansImp.textContent = playerLabel(game.imposter);
    els.ansWord.textContent = game.entry.word;
    els.ansHint.textContent = game.entry.hint;
    show('screen-start');
  }

  // ---------- Hold-to-reveal input ----------
  let holding = false;
  function down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    holding = true;
    try { els.holder.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    revealSecret();
  }
  function up() {
    if (!holding) return;
    holding = false;
    hideSecret();
  }

  els.holder.addEventListener('pointerdown', down);
  els.holder.addEventListener('pointerup', up);
  els.holder.addEventListener('pointercancel', up);
  els.holder.addEventListener('lostpointercapture', up);
  els.holder.addEventListener('contextmenu', (e) => e.preventDefault());
  els.holder.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); holding = true; revealSecret(); }
  });
  els.holder.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); up(); }
  });
  els.holder.addEventListener('blur', up);
  document.addEventListener('visibilitychange', () => { if (document.hidden) up(); });
  window.addEventListener('blur', up);

  // ---------- Buttons ----------
  els.minus.addEventListener('click', () => setCount(Number(els.count.value) - 1));
  els.plus.addEventListener('click', () => setCount(Number(els.count.value) + 1));
  els.count.addEventListener('change', () => setCount(els.count.value));
  els.count.addEventListener('focus', () => els.count.select());

  els.start.addEventListener('click', () => {
    setCount(els.count.value);
    newGame(Number(els.count.value));
  });
  els.next.addEventListener('click', nextTurn);
  els.quit.addEventListener('click', () => {
    if (confirm('Quit this round and go back to the menu?')) { game = null; show('screen-setup'); }
  });
  els.showAnswer.addEventListener('click', () => {
    els.answer.hidden = false;
    els.showAnswer.hidden = true;
  });
  els.again.addEventListener('click', () => newGame(game ? game.players : Number(els.count.value)));
  els.menu.addEventListener('click', () => { game = null; show('screen-setup'); });

  // ---------- Boot ----------
  setCount(store.get(STORE_COUNT, 4));

  fetch('words.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      const list = Array.isArray(data) ? data : data.words;
      words = (list || []).filter((w) => w && w.word && w.hint);
      if (!words.length) throw new Error('empty');
      els.start.disabled = false;
      els.start.textContent = 'Start game';
    })
    .catch(() => {
      els.start.textContent = 'Could not load words';
      toast('Could not load the word list. Check your connection and reload.');
    });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
