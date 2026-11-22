'use strict';
// V5 is an additive local-first layer. The V2 backup and localStorage key remain compatible.
(() => {
  if (typeof store === 'undefined' || typeof activePlan !== 'function') return;
  const el = id => document.getElementById(id);
  const notify = message => { const box = el('v5-toast'); if (!box) return; box.textContent = message; box.classList.add('visible'); clearTimeout(notify.timer); notify.timer = setTimeout(() => box.classList.remove('visible'), 2800); };
  const round = (v, n = 1) => Math.round(v * (10 ** n)) / (10 ** n);
  const safeNum = (value, min, max) => { if (value === '' || value == null) return null; const x = Number(value); return Number.isFinite(x) && x >= min && x <= max ? x : null; };
  const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(date + 'T12:00:00').getTime());
  const uniqueId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);

  // Early V4 builds labelled the second profile "Natht"; keep its ID but improve the display name.
  function ensureV5() {
    if (!data.v5 || typeof data.v5 !== 'object') data.v5 = { version: 5, sessions: {}, sleepLog: {}, createdAt: new Date().toISOString() };
    data.v5.sessions ??= {};
    data.v5.sleepLog ??= {};
    if (data.config?.name === 'Natht') data.config.name = 'Nathy';
    // Upgrade only untouched named default routines that contained fewer than five exercises.
    if (active === 'natht' && !data.v5.migratedNathyV4) {
      const old = activePlan();
      if (old[1]?.name === 'Cardio e mobilidade' && old[1].ex?.length === 4) {
        old[1] = JSON.parse(JSON.stringify(nathtPlan[1]));
      }
      if (old[3]?.name === 'Cardio e abdômen' && old[3].ex?.length === 4) {
        old[3] = JSON.parse(JSON.stringify(nathtPlan[3]));
      }
      data.v5.migratedNathyV4 = true;
      save();
    }
    return data.v5;
  }
  ensureV5();
  // Extend the visual library with curated names. Artwork is a schematic for muscle group, not a photo of exercise technique.
  if (Array.isArray(window.EXTRA_EXERCISES)) {
    const seen = new Set(catalog.map(e => e[0].toLocaleLowerCase('pt-BR')));
    for (const exercise of window.EXTRA_EXERCISES) {
      if (!seen.has(exercise[0].toLocaleLowerCase('pt-BR'))) {
        catalog.push(exercise);
        seen.add(exercise[0].toLocaleLowerCase('pt-BR'));
      }
    }
  }

  const originalSelect = selectProfile;
  selectProfile = function(id) { originalSelect(id); ensureV5(); renderSession(); renderHome(); };

  // Each session belongs to one profile and a specific day; no global timer crosses profiles.
  let clockInterval = null;
  function thisSession() { return ensureV5().sessions[selected] ?? (ensureV5().sessions[selected] = { seconds: 0, startedAt: null }); }
  function elapsed(s = thisSession()) { return Math.max(0, Math.floor(s.seconds + (s.startedAt ? (Date.now() - s.startedAt) / 1000 : 0))); }
  function formatElapsed(t) { return `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor(t % 3600 / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; }
  function renderSession() {
    const s = thisSession(), active = !!s.startedAt;
    el('session-clock').textContent = formatElapsed(elapsed(s));
    el('session-status').textContent = active ? 'Sessão em andamento' : s.seconds ? 'Sessão pausada' : 'Pronto para treinar';
    el('session-toggle').textContent = active ? 'Pausar sessão' : s.seconds ? 'Continuar sessão' : 'Iniciar sessão';
    el('session-hint').textContent = active ? 'Você pode sair da página: as marcações são salvas automaticamente.' : 'Registre cada série. Finalize o treino para adicionar ao histórico.';
  }
  el('session-toggle').onclick = () => {
    const s = thisSession();
    if (s.startedAt) { s.seconds = elapsed(s); s.startedAt = null; } else s.startedAt = Date.now();
    save(); renderSession();
  };
  el('session-reset').onclick = () => { if (!confirm('Reiniciar somente o cronômetro desta sessão? As séries não serão apagadas.')) return; ensureV5().sessions[selected] = { seconds: 0, startedAt: null }; save(); renderSession(); };
  clockInterval = setInterval(() => { if (document.visibilityState === 'visible') renderSession(); }, 1000);

  function restoreSeries(state, planned) {
    if (!Array.isArray(state.series)) state.series = [];
    const count = Math.max(1, Math.min(10, Number(planned) || 1));
    for (let i = 0; i < count; i++) {
      if (!state.series[i]) state.series[i] = { load: state.load ?? '', reps: state.reps ?? '', done: false };
    }
    if (state.series.length > count) state.series.length = count;
    return state.series;
  }
  const originalRender = render;
  render = function() {
    originalRender();
    const planDay = currentPlan[selected], d = draft();
    [...el('exercises').children].forEach((card, i) => {
      const exercise = planDay.ex[i], state = d.ex[i] ?? (d.ex[i] = {});
      if (!exercise) return;
      const series = restoreSeries(state, exercise[1]);
      const old = card.querySelector(':scope > .fields');
      if (old) old.classList.add('legacy-fields');
      const caption = document.createElement('div'); caption.className = 'sets-caption';
      caption.innerHTML = '<span>Série</span><span>Carga (kg)</span><span>Repetições</span><span>Feita</span>';
      const grid = document.createElement('div'); grid.className = 'series-grid';
      const cb = card.querySelector('.exhead input[type="checkbox"]');
      const update = () => {
        state.done = series.every(s => s.done === true);
        const completed = series.filter(s => s.done);
        if (completed.length) { const last = completed.at(-1); state.load = last.load; state.reps = last.reps; }
        cb.checked = state.done;
        d.ex[i] = state;
        save(); progress();
      };
      cb.addEventListener('change', () => { series.forEach(s => { s.done = cb.checked; }); update(); card.querySelectorAll('.series-done').forEach(x => { x.checked = cb.checked; }); });
      series.forEach((seriesState, index) => {
        const row = document.createElement('div'); row.className = 'series-row';
        const num = document.createElement('span'); num.className = 'series-number'; num.textContent = String(index + 1);
        const load = document.createElement('input'); load.type = 'number'; load.min = '0'; load.max = '1500'; load.step = '0.5'; load.inputMode = 'decimal'; load.value = seriesState.load ?? ''; load.placeholder = 'kg'; load.setAttribute('aria-label', `${exercise[0]}, série ${index+1}, carga em kg`);
        const reps = document.createElement('input'); reps.type = 'number'; reps.min = '0'; reps.max = '500'; reps.step = '1'; reps.inputMode = 'numeric'; reps.value = seriesState.reps ?? ''; reps.placeholder = 'reps'; reps.setAttribute('aria-label', `${exercise[0]}, série ${index+1}, repetições`);
        const check = document.createElement('input'); check.type = 'checkbox'; check.className = 'series-done'; check.checked = !!seriesState.done; check.setAttribute('aria-label', `${exercise[0]}, série ${index+1}, concluída`);
        load.addEventListener('change', () => { const x = safeNum(load.value, 0, 1500); if (load.value !== '' && x === null) { notify('Carga inválida.'); load.value = seriesState.load ?? ''; return; } seriesState.load = x ?? ''; update(); });
        reps.addEventListener('change', () => { const x = safeNum(reps.value, 0, 500); if (reps.value !== '' && x === null) { notify('Repetições inválidas.'); reps.value = seriesState.reps ?? ''; return; } seriesState.reps = x ?? ''; update(); });
        check.onchange = () => { seriesState.done = check.checked; update(); };
        row.append(num, load, reps, check); grid.append(row);
      });
      card.append(caption, grid);
      // Label old single-load summary for accessible fallback only; preserve its data fields for V4 compatibility.
      const prev = [...data.history].flatMap(h => h.ex || []).find(e => e.name === exercise[0] && e.done);
      if (prev) { const text = document.createElement('p'); text.className = 'last-performance'; text.textContent = `Última sessão: ${prev.load || '—'} kg · ${prev.reps || '—'} reps`; card.append(text); }
    });
    renderSession();
  };
  const oldProgress = progress;
  progress = function() {
    const p = currentPlan[selected], d = draft(), done = p.ex.filter((e, i) => {
      const s = d.ex[i]; return s?.done || s?.series?.some(x => x.done);
    }).length;
    el('progress-text').textContent = `${done} de ${p.ex.length} exercícios iniciados`;
    el('progress').style.width = `${p.ex.length ? Math.round(100 * done / p.ex.length) : 0}%`;
  };
  const originalClear = el('clear-day').onclick;
  el('clear-day').onclick = () => {
    // Use original V4 confirmation and clear routine, then reset per-series checkmarks as well.
    const before = JSON.stringify(draft());
    originalClear();
    const d = draft();
    if (JSON.stringify(d) !== before) {
      Object.values(d.ex).forEach(e => { (e.series || []).forEach(s => { s.done = false; s.reps = ''; }); });
      save(); render();
    }
  };

  el('finish').onclick = () => {
    const p = currentPlan[selected], d = draft();
    const hasAny = p.ex.some((e,i) => d.ex[i]?.done || d.ex[i]?.series?.some(s => s.done));
    if (!hasAny) { notify('Conclua ao menos uma série antes de salvar.'); return; }
    const session = thisSession();
    const record = {
      id: uniqueId(), date: new Date().toISOString(), day: p.day, name: p.name,
      seconds: elapsed(session), cardio: !!d.cardio,
      ex: p.ex.map((e,i) => {
        const s = d.ex[i] || {};
        const sets = Array.isArray(s.series) ? s.series.map(x => ({ load: Number(x.load)||0, reps: Number(x.reps)||0, done: !!x.done })) : [];
        const completed = sets.filter(x => x.done);
        const last = completed.at(-1);
        return { name: e[0], sets: e[1], target: e[2], load: last?.load ?? s.load ?? '', reps: last?.reps ?? s.reps ?? '', done: !!s.done || completed.length > 0, series: sets, completedSets: completed.length, volume: round(completed.reduce((total,x) => total + x.load * x.reps,0),1) };
      })
    };
    data.history.unshift(record);
    Object.values(d.ex).forEach(s => { s.done = false; s.reps = ''; (s.series || []).forEach(x => { x.done = false; x.reps = ''; }); });
    d.cardio = false;
    ensureV5().sessions[selected] = { seconds: 0, startedAt: null };
    save(); render(); renderHome(); notify('Treino salvo no histórico!');
  };

  renderHistory = function() {
    const root = el('history-list'); root.replaceChildren();
    if (!data.history.length) { const p = document.createElement('p'); p.className = 'note'; p.textContent = 'Seus treinos finalizados aparecerão aqui.'; root.append(p); return; }
    for (const h of data.history) {
      const box = document.createElement('article'); box.className = 'history session-history';
      const head = document.createElement('div'); head.className = 'row';
      const name = document.createElement('strong'); name.textContent = h.name + ' · ' + new Date(h.date).toLocaleDateString('pt-BR');
      const total = (h.ex || []).reduce((n,e) => n + (e.completedSets || Number(e.done || 0)),0);
      const summary = document.createElement('p'); summary.className = 'hint'; summary.textContent = `${total} séries registradas · ${h.cardio ? 'cardio realizado' : 'cardio não marcado'}${h.seconds ? ' · ' + formatElapsed(h.seconds) : ''}`;
      const del = document.createElement('button'); del.className = 'mini danger'; del.textContent = 'Excluir'; del.onclick = () => { if (!confirm('Excluir este treino do histórico?')) return; data.history = data.history.filter(x => x.id !== h.id); save(); renderHistory(); renderHome(); };
      head.append(name,del); box.append(head,summary);
      for (const e of (h.ex || []).filter(e => e.done)) {
        const line = document.createElement('p'); line.className = 'small muted';
        const actual = Array.isArray(e.series) ? e.series.filter(s => s.done).map(s => `${s.load || '—'} kg × ${s.reps || '—'}`).join(' | ') : `${e.load || '—'} kg × ${e.reps || e.target || '—'}`;
        line.textContent = e.name + ' · ' + actual; box.append(line);
      }
      root.append(box);
    }
  };

  // Extend existing measurement schema without changing the historical records.
  el('save-measure').onclick = () => {
    const date = el('measure-date').value;
    if (!validDate(date)) { notify('Informe uma data válida.'); return; }
    const entry = { id: uniqueId(), date };
    let count = 0;
    for (const field of ['weight','waist','hip','chest','arm','thigh','calf','neck']) {
      const v = el('measure-'+field).value;
      if (v === '') continue;
      const x = safeNum(v, 0.1, field === 'weight' ? 350 : 250);
      if (x == null) { notify('Revise a medida de '+field+'.'); return; }
      entry[field] = x; count++;
    }
    if (!count) { notify('Informe pelo menos uma medida.'); return; }
    data.measures.push(entry);
    for (const field of ['weight','waist','hip','chest','arm','thigh','calf','neck']) el('measure-'+field).value = '';
    if (entry.weight != null) profileConfig().weight = entry.weight;
    save(); refreshExtras(); renderMeasures(); renderHome(); notify('Medidas registradas.');
  };
  const originalMeasures = renderMeasures;
  renderMeasures = function() {
    originalMeasures();
    const sorted = [...data.measures].sort((a,b) => b.date.localeCompare(a.date));
    [...el('measure-list').children].forEach((row,i) => {
      const m = sorted[i]; if (!m?.thigh && !m?.calf && !m?.neck) return;
      const line = document.createElement('p'); line.className = 'small muted';
      line.textContent = [('thigh','Coxa'),('calf','Panturrilha'),('neck','Pescoço')].filter(([k])=>m[k] !== undefined).map(([k,label]) => `${label}: ${m[k]} cm`).join(' · ');
      row.firstElementChild?.append(line);
    });
  };

  // Manual nutrition entries now support carbohydrates and fats without rejecting old records lacking these fields.
  el('add-food').onclick = () => {
    const name = el('food-name').value.trim(), cal = safeNum(el('food-cal').value, 0, 10000), protein = safeNum(el('food-protein').value, 0, 1000);
    if (!name || cal === null || protein === null || !validDate(el('food-date').value)) { notify('Preencha alimento, kcal, proteína e data.'); return; }
    const carbs = el('food-carbs').value === '' ? null : safeNum(el('food-carbs').value,0,1000);
    const fat = el('food-fat').value === '' ? null : safeNum(el('food-fat').value,0,1000);
    if ((el('food-carbs').value && carbs === null) || (el('food-fat').value && fat === null)) { notify('Revise carboidratos e gorduras.'); return; }
    foodEntries().push({ id: uniqueId(), date:el('food-date').value, meal:el('food-meal').value, name, cal, protein, ...(carbs !== null ? { carbs } : {}), ...(fat !== null ? { fat } : {}), source:'manual' });
    for(const field of ['name','cal','protein','carbs','fat']) el('food-'+field).value = '';
    save(); renderFood(); renderHome(); notify('Alimento registrado.');
  };
  const beforeFood = renderFood;
  renderFood = function() {
    beforeFood();
    const entries = foodEntries().filter(f => f.date === (el('food-date').value || localDate()));
    [...el('food-list').querySelectorAll('.history.row')].forEach((line,i) => {
      const f = entries[i]; if (!f) return;
      const edit = document.createElement('button'); edit.className = 'mini'; edit.textContent = 'Editar'; edit.setAttribute('aria-label','Editar '+f.name);
      edit.onclick = () => {
        const detail = document.createElement('div'); detail.className = 'inline-edit';
        const inputs = {};
        const fields = [['name','Alimento','text'],['cal','kcal','number'],['protein','Proteína (g)','number'],['carbs','Carboidratos (g)','number'],['fat','Gorduras (g)','number']];
        for (const [key,label,type] of fields) {
          const div = document.createElement('label'); div.textContent = label;
          const inp = document.createElement('input'); inp.type = type; if(type==='number'){inp.min='0';inp.step='0.1';} inp.value = f[key] ?? ''; inputs[key] = inp; div.append(inp); detail.append(div);
        }
        const saveEdit = document.createElement('button'); saveEdit.className='mini primary'; saveEdit.textContent='Salvar';
        saveEdit.onclick = () => {
          const val = {};
          for(const [key] of fields){ const input=inputs[key]; if(key==='name'){val[key]=input.value.trim(); if(!val[key]) {notify('Informe o nome.');return;}} else if(input.value===''){if(key==='cal'||key==='protein'){notify('kcal e proteína são obrigatórios.');return;}} else { const x=safeNum(input.value,0,key==='cal'?10000:1000); if(x===null){notify('Verifique os números.');return;}val[key]=x;}}
          for (const key of ['carbs','fat']) if(inputs[key].value==='') delete f[key];
          Object.assign(f,val); save(); renderFood(); renderHome(); notify('Registro atualizado.');
        };
        const cancel = document.createElement('button'); cancel.className='mini'; cancel.textContent='Cancelar'; cancel.onclick=()=>detail.remove();
        detail.append(saveEdit,cancel); line.insertAdjacentElement('afterend',detail); edit.disabled = true;
      };
      line.insertBefore(edit,line.lastElementChild);
    });
  };
  const oldPreview = nutritionPreview;
  nutritionPreview = function() {
    if (el('nutrition-item').selectedIndex < 0) { el('nutrition-preview').textContent='Nenhum alimento encontrado.'; return; }
    oldPreview();
  };
  const oldNutritionAdd = el('nutrition-add').onclick;
  el('nutrition-add').onclick = () => {
    if (el('nutrition-item').selectedIndex < 0) { notify('Selecione um alimento.'); return; }
    oldNutritionAdd();
  };

  const previousHome = renderHome;
  renderHome = function() {
    previousHome();
    const weekday = new Date(), start = new Date(weekday); start.setHours(0,0,0,0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const thisWeek = data.history.filter(h => new Date(h.date) >= start).length;
    const target = Math.max(1, Number(ensureV4().goals.sessions)||5);
    el('week-sessions').textContent = `${thisWeek} / ${target}`;
    el('week-progress').style.width = `${Math.min(100,Math.round(thisWeek/target*100))}%`;
    el('week-summary').textContent = thisWeek >= target ? 'Meta semanal registrada. Priorize recuperação e consistência.' : `Faltam ${target-thisWeek} sessão(ões) para sua meta. Ajuste o plano conforme energia e recuperação.`;
    const sleep = ensureV5().sleepLog[localDate()];
    el('sleep-last').textContent = sleep == null ? 'Ainda não registrado' : `${sleep} h hoje`;
  };
  el('sleep-save').onclick = () => {
    const hours=safeNum(el('sleep-hours').value,0,24);
    if(hours===null){ notify('Informe horas entre 0 e 24.');return; }
    ensureV5().sleepLog[localDate()] = hours;
    save(); renderHome(); notify('Sono registrado.');
  };

  // Accurate local/offline indicator: offline PWA is limited to previously cached assets.
  const status = el('connection-indicator');
  const updateNetwork = () => { status.textContent = navigator.onLine ? '● Dados salvos neste dispositivo · sem sincronização' : '◌ Sem internet · registros locais disponíveis'; status.classList.toggle('offline',!navigator.onLine); };
  addEventListener('online',updateNetwork);addEventListener('offline',updateNetwork);updateNetwork();
  const theme = document.createElement('button'); theme.type='button'; theme.id='theme-toggle'; theme.className='mini theme-toggle'; theme.textContent='◐ Tema'; theme.setAttribute('aria-label','Alternar tema claro e escuro');
  const hero=document.querySelector('.hero'); hero?.append(theme);
  const applyTheme = () => document.body.classList.toggle('theme-light', localStorage.getItem('mtpro-theme-v5')==='light');
  theme.onclick = () => { localStorage.setItem('mtpro-theme-v5',document.body.classList.contains('theme-light')?'dark':'light'); applyTheme(); };
  applyTheme();
  const toast=document.createElement('div'); toast.id='v5-toast'; toast.setAttribute('role','status'); toast.className='v5-toast'; document.body.append(toast);
  const oldSwitch = switchTab;
  switchTab = function(tab) { oldSwitch(tab); if (tab==='treino') renderSession(); if(tab==='inicio') renderHome(); };
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick=()=>switchTab(b.dataset.tab));
  // Correct mobile 5-item navigation state; secondary views highlight their parent.
  const oldSwitch2 = switchTab;
  switchTab = function(tab) {
    oldSwitch2(tab);
    const primary = ({historico:'treino',biblioteca:'treino',descanso:'treino',nutricao:'alimentacao',relatorios:'evolucao',planejamento:'ajustes'})[tab] || tab;
    document.querySelectorAll('nav.nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === primary));
  };
  // Other sections must use the current override after secondary mapping.
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick=()=>switchTab(b.dataset.tab));
  ensureV5(); save(); render(); renderMeasures(); renderHome(); switchTab('inicio');
})();
