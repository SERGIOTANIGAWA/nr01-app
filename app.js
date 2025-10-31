// NR-01 App Sequencial — Tanigawa Institute
(function () {
  'use strict';

  const { SUPA_URL, SUPA_ANON_KEY } = window.NR01_CONFIG || {};
  const needKey = !SUPA_ANON_KEY || SUPA_ANON_KEY === 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE';

  const el = (id) => document.getElementById(id);
  const $token = el('token');
  const $title = el('moduleTitle');
  const $qs = el('questions');
  const $prev = el('prev');
  const $next = el('next');
  const $msg = el('msg');
  const $bar = el('progress');
  const $btnRec = el('btnRecuperar');
  const $recNome = el('rec_nome');
  const $recEmail = el('rec_email');

  const MODS = [
    { code:'D01', name:'(1/8) Diagnóstico Psicossocial e Percepção de Risco', qs:['D01Q01','D01Q02','D01Q03','D01Q04','D01Q05','D01Q06','D01Q07','D01Q08','D01Q09'] },
    { code:'D02', name:'(2/8) Condições de Trabalho e Ergonomia',              qs:['D02Q01','D02Q02','D02Q03','D02Q04','D02Q05','D02Q06','D02Q07','D02Q08','D02Q09'] },
    { code:'D03', name:'(3/8) Carga de Trabalho e Jornada',                      qs:['D03Q01','D03Q02','D03Q03','D03Q04','D03Q05','D03Q06','D03Q07','D03Q08','D03Q09'] },
    { code:'D04', name:'(4/8) Clima e Apoio Organizacional',                      qs:['D04Q01','D04Q02','D04Q03','D04Q04','D04Q05','D04Q06','D04Q07','D04Q08','D04Q09'] },
    { code:'D05', name:'(5/8) Saúde Emocional e Fadiga',                          qs:['D05Q01','D05Q02','D05Q03','D05Q04','D05Q05','D05Q06','D05Q07','D05Q08','D05Q09'] },
    { code:'D06', name:'(6/8) Capacitação e EPIs',                                qs:['D06Q01','D06Q02','D06Q03','D06Q04','D06Q05','D06Q06','D06Q07','D06Q08','D06Q09'] },
    { code:'D07', name:'(7/8) Segurança Psicológica e Respeito',                  qs:['D07Q01','D07Q02','D07Q03','D07Q04','D07Q05','D07Q06','D07Q07','D07Q08','D07Q09'] },
    { code:'D08', name:'(8/8) Satisfação, Liderança e Comunicação',               qs:['D08Q01','D08Q02','D08Q03','D08Q04','D08Q05','D08Q06','D08Q07','D08Q08','D08Q09'] },
  ];

  let step = 0;
  const values = {};

  function getTokenFromURL() {
    try { return (new URL(window.location.href)).searchParams.get('token') || ''; }
    catch { return ''; }
  }
  function setProgress() { $bar.style.width = Math.round((step / MODS.length) * 100) + '%'; }

  function sel(name, current) {
    const s = document.createElement('select');
    s.name = name;
    ['Selecione','1 - Discordo','2 - Discordo','3 - Neutro','4 - Concordo','5 - Concordo Totalmente']
      .forEach((t,i)=>{
        const o=document.createElement('option');
        o.value = i===0? '': String(i);
        o.textContent = t;
        if(String(current||'')===o.value) o.selected=true;
        s.appendChild(o);
      });
    s.addEventListener('change',()=>{
      values[name]= Number(s.value||0);
      $next.disabled = !ready();
    });
    return s;
  }
  function ready(){ return MODS[step].qs.every(c => (values[c] && values[c]>=1 && values[c]<=5)); }

  let ENUNCIADOS = {};
  async function loadEnunciadosOnce(){
    if(Object.keys(ENUNCIADOS).length) return;
    if(needKey){ console.warn('Anon key ausente. Passe ?key=CHAVE ou edite o index.html'); return; }
    try{
      const url = new URL(`${SUPA_URL}/rest/v1/perguntas`);
      url.searchParams.set('select','codigo,enunciado,texto');
      url.searchParams.set('order','codigo.asc');
      const res = await fetch(url.toString(), { headers:{ apikey: SUPA_ANON_KEY, Authorization:`Bearer ${SUPA_ANON_KEY}` } });
      if(!res.ok){ console.warn('Falha perguntas:', await res.text()); return; }
      const rows = await res.json();
      ENUNCIADOS = rows.reduce((acc,r)=>{ acc[r.codigo]= r.enunciado || r.texto || ''; return acc; },{});
    }catch(e){ console.error('Erro carregando enunciados', e); }
  }

  async function render(){
    await loadEnunciadosOnce();
    const mod = MODS[step];
    $title.textContent = mod.name;
    $qs.innerHTML='';
    mod.qs.forEach(code=>{
      const div = document.createElement('div');
      div.className='q';
      const lab = document.createElement('label');
      const texto = ENUNCIADOS[code] || 'selecione sua resposta';
      lab.textContent = `${code} — ${texto}`;
      div.appendChild(lab);
      div.appendChild(sel(code, values[code]));
      $qs.appendChild(div);
    });
    $prev.disabled = (step===0);
    $next.textContent = 'Enviar módulo ▶';
    $msg.textContent='';
    setProgress();
    $next.disabled = !ready();
  }

  async function postStep(){
    const token = ($token.value||'').trim();
    if(!token){ $msg.innerHTML='<span class="err">Informe o token.</span>'; return; }
    if(needKey){ $msg.innerHTML='<span class="err">Falta a anon key. Edite o index.html ou use ?key=...</span>'; return; }

    const mod = MODS[step];
    const payload = mod.qs.map(code=>({code, value: values[code]}));

    try{
      const res = await fetch(`${SUPA_URL}/rest/v1/rpc/submit_response_step`,{
        method:'POST',
        headers:{ apikey: SUPA_ANON_KEY, Authorization:`Bearer ${SUPA_ANON_KEY}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ p_token: token, p_codigo: mod.code, p_answers: payload })
      });
      const txt = await res.text();
      if(!res.ok){
        console.error('Falha RPC', res.status, txt);
        $msg.innerHTML = '<span class="err">❌ Erro ao enviar. Verifique o token e tente novamente.</span>';
        return;
      }
      $msg.innerHTML = '<span class="ok">✅ Módulo enviado com sucesso.</span>';
      if(step < MODS.length-1){
        step++; render(); window.scrollTo({top:0,behavior:'smooth'});
      }else{
        try{
          await fetch(`${SUPA_URL}/rest/v1/rpc/concluir_token`,{
            method:'POST',
            headers:{ apikey: SUPA_ANON_KEY, Authorization:`Bearer ${SUPA_ANON_KEY}`, 'Content-Type':'application/json' },
            body: JSON.stringify({ p_token: token })
          }).catch(()=>{});
        }catch{}
        $title.textContent = 'Concluído: todos os módulos enviados.';
        $qs.innerHTML=''; $prev.disabled=true; $next.disabled=true;
      }
    }catch(e){ console.error('Erro fetch', e); $msg.innerHTML = '<span class="err">❌ Erro de conexão. Tente novamente.</span>'; }
  }

  async function recuperarAcesso(nome, email){
    try{
      const res = await fetch(`${SUPA_URL}/rest/v1/rpc/emitir_token_por_email`, {
        method: 'POST',
        headers: { apikey: SUPA_ANON_KEY, Authorization: `Bearer ${SUPA_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_nome: nome, p_email: email })
      });
      const txt = await res.text();
      if(!res.ok){ throw new Error(txt); }
      const token = (txt || '').replace(/\"/g,'');
      window.location.href = `index.html?token=${encodeURIComponent(token)}`;
    }catch(e){ console.error(e); $msg.innerHTML = '<span class="err">Não foi possível emitir o token. Contate o RH.</span>'; }
  }

  $prev.addEventListener('click', ()=>{ if(step>0){ step--; render(); }});
  $next.addEventListener('click', postStep);
  $btnRec.addEventListener('click', ()=>{
    const nome = ($recNome.value||'').trim();
    const email = ($recEmail.value||'').trim();
    if(!nome || !email){ $msg.innerHTML = '<span class="err">Informe nome e e‑mail.</span>'; return; }
    recuperarAcesso(nome, email);
  });

  const urlToken = getTokenFromURL();
  if(urlToken) $token.value = urlToken;
  render();
})();