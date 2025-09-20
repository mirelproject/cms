const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

// Theme & Accent
const root = document.documentElement;
const themeToggle = $('#themeToggle');
const accentPick = $('#accentPick');
const storedTheme = localStorage.getItem('theme');
const storedAccent = localStorage.getItem('accent') || 'violet';
if (storedTheme) root.setAttribute('data-theme', storedTheme);
root.setAttribute('data-accent', storedAccent);
accentPick.value = storedAccent;
themeToggle.addEventListener('click', () => {
  const now = root.getAttribute('data-theme') === 'light' ? '' : 'light';
  if (now) root.setAttribute('data-theme', now); else root.removeAttribute('data-theme');
  localStorage.setItem('theme', now);
});
accentPick.addEventListener('change', () => {
  root.setAttribute('data-accent', accentPick.value);
  localStorage.setItem('accent', accentPick.value);
  toast('Warna aksen diubah');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); $('#q').focus(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggleCmdk(true); }
  if (e.key === 'Escape') toggleCmdk(false);
});

// Toasts
const toasts = $('#toasts');
function toast(msg, t=2200){
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  toasts.appendChild(el);
  setTimeout(()=>{ el.remove(); }, t);
}

// Command Palette
const cmdkBtn = $('#cmdk'); const cmdk = $('#cmdkModal'); const cmdkInput = $('#cmdkInput'); const cmdkList = $('#cmdkList');
cmdkBtn.addEventListener('click', () => toggleCmdk(true));
cmdk.addEventListener('click', (e) => { if (e.target === cmdk) toggleCmdk(false); });
function toggleCmdk(open){
  cmdk.classList[open ? 'remove' : 'add']('hidden');
  if (open){ cmdkInput.value=''; buildCmdk(''); cmdkInput.focus(); }
}
cmdkInput.addEventListener('input', () => buildCmdk(cmdkInput.value.toLowerCase().trim()));
function buildCmdk(q){
  cmdkList.innerHTML='';
  const items = (window.DATA || []).flatMap(t => [ {type:'topic', title:t.title, url:t.url},
    ...(t.steps||[]).map(s => ({type:'step', title:`${t.title} • ${s.title}`, url:`steps/${t.slug}/${s.slug}.html`})) ]);
  const filtered = !q ? items.slice(0,8) : items.filter(i => i.title.toLowerCase().includes(q)).slice(0,12);
  for(const it of filtered){
    const li = document.createElement('li'); li.setAttribute('role','option');
    li.innerHTML = `<span>${it.title}</span><small>${it.type}</small>`;
    li.addEventListener('click', ()=>{ window.location.href = it.url; });
    cmdkList.appendChild(li);
  }
}

// Main data & UI
let DATA = []; let filtered = []; let page = 1; let pageSize = 16;
const grid = $('#grid'); const tmpl = $('#card-template');
const form = $('#controls'); const inputQ = $('#q'); const selectLevel = $('#level');
const selectPageSize = $('#pageSize'); const selectSort = $('#sortBy'); const pagesUl = $('#pages'); const prevBtn = $('#prev'); const nextBtn = $('#next');
if(selectPageSize){ selectPageSize.value = '16'; }


function applySort(arr){
  const mode = (selectSort && selectSort.value) || '';
  const coll = arr.slice();
  if(mode === 'title'){
    coll.sort((a,b)=> (a.title||'').localeCompare(b.title||'', 'id'));
  } else if (mode === 'level'){
    const order = { 'Pemula': 1, 'Menengah': 2, 'Lanjutan': 3 };
    coll.sort((a,b)=> (order[a.level]||99) - (order[b.level]||99) || (a.title||'').localeCompare(b.title||'', 'id'));
  }
  return coll;
}


// Try API first (after initial seed render)
async function refreshFromAPI(){
  try{
    const res = await fetch('/api/tutorials?include=steps', {headers:{'Accept':'application/json'}});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const json = await res.json();
    if(Array.isArray(json) && json.length){
      const changed = (json.length !== DATA.length) || json.some((t,i)=>!DATA[i] || DATA[i].title!==t.title);
      DATA = json; filtered = DATA.slice(); if(changed) render();
    }
  }catch(e){ /* ignore, will rely on data.json or seed */ }
}



function slugify(s){ return (s||'').toString().toLowerCase().trim()
  .replace(/[^\w\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-'); }

function normalizeLink(item){
  const bad = (v)=> !v || v === 'undefined' || v === '/undefined' || v === '#';
  let slug = item && (item.slug || slugify(item.title||''));
  if(!slug){ return '#'; }
  // Always prefer relative page path
  const rel = `pages/${slug}.html`;
  // If item.url exists but looks wrong, ignore it
  if (item && item.url && !bad(item.url) && !/\/undefined$/.test(item.url)) {
    // ensure it's not cross-origin; if absolute, convert to relative if it points to our pages
    try{
      const u = new URL(item.url, window.location.href);
      if (u.pathname.includes('/pages/') && u.pathname.endsWith('.html')) {
        // make it relative to avoid jumping to wrong origin
        return u.pathname.replace(/^\//,'').replace(/^.*?pages\//, 'pages/');
      }
    }catch{ /* fallthrough */ }
  }
  return rel;
}
function safe(val, fallback=''){ return (val===undefined || val===null) ? fallback : val; }

  // Prefer explicit item.url (from static seed), else build from slug
  if (item && item.url) return item.url;
  if (item && item.slug) return `pages/${item.slug}.html`;
  return '#';
}
function safe(val, fallback=''){ return (val===undefined || val===null) ? fallback : val; }

async function load(){
  // 1) Render instantly from embedded seed (works on file:// and offline)
  try {
    const seed = JSON.parse($('#seed').textContent);
    DATA = seed.tutorials || [];
  } catch {}
  filtered = DATA.slice();
  render();
  toast('Siap! Gunakan Ctrl/Cmd+K untuk pencarian cepat');
  refreshFromAPI();

  // 2) Then attempt to refresh from data.json when available (online/http)
  try{
    const res = await fetch('data.json', {cache:'no-store'});
    if(res.ok){
      const json = await res.json();
      const fresh = json.tutorials || [];
      // Only re-render if different length or titles changed
      if (Array.isArray(fresh) && fresh.length){
        const changed = (fresh.length !== DATA.length) || fresh.some((t,i)=>!DATA[i] || DATA[i].title!==t.title);
        DATA = fresh; filtered = DATA.slice(); if(changed) render();
      }
    }
  }catch(err){ /* ignore when offline or file:// */ }
}

function paginate(arr, page, size){ const s = (page-1)*size; return arr.slice(s, s+size); }
function render(){
  grid.innerHTML=''; grid.setAttribute('aria-busy','true');
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if(page > totalPages) page = totalPages;
  const current = paginate(applySort(filtered), page, pageSize);
  const frag = document.createDocumentFragment();

  if(!current.length){
    const note = document.createElement('div'); note.className='card span-1';
    note.innerHTML = '<div class="card-body"><h2 class="card-title">Tidak ada hasil</h2><p class="card-desc">Coba kata kunci lain atau ubah tingkat.</p></div>';
    frag.appendChild(note);
  }else{
    for(const item of current){
      const node = tmpl.content.cloneNode(true);
      const card = node.querySelector('.card');
      const img = node.querySelector('img'); const title = node.querySelector('.card-title');
      const desc = node.querySelector('.card-desc'); const level = node.querySelector('.level');
      const tags = node.querySelector('.tags'); const link = node.querySelector('.btn');
      img.src = safe(item.image, 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=1200&auto=format&fit=crop'); img.alt = `Gambar untuk ${safe(item.title,'Tutorial')}`;
      title.textContent = safe(item.title,'(Tanpa judul)'); desc.textContent = safe(item.description,'');
      level.textContent = safe(item.level,''); const href = normalizeLink(item); link.href = href; if(href==='#'){ link.classList.add('ghost'); link.textContent='Tidak tersedia'; link.setAttribute('aria-disabled','true'); }
      if(item.size) card.classList.add(item.size);
      (item.tags||[]).forEach(t=>{ const li=document.createElement('li'); li.textContent = t; tags.appendChild(li); });

      // Tilt
      card.addEventListener('mousemove', (e)=>{
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const rx = ((y/r.height)-.5) * -6, ry = ((x/r.width)-.5) * 6;
        card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      card.addEventListener('mouseleave', ()=>{ card.style.transform = ''; });

      // Reveal on scroll
      card.style.opacity = 0; card.style.translate = '0 10px';
      const io = new IntersectionObserver(([ent])=>{
        if(ent.isIntersecting){ card.animate([{opacity:0, transform:'translateY(10px)'},{opacity:1, transform:'translateY(0)'}], {duration:400, easing:'ease-out'}); card.style.opacity=1; card.style.translate=''; io.disconnect(); }
      }, {threshold:.2}); io.observe(card);

      frag.appendChild(node);
    }
  }
  grid.appendChild(frag);

  renderPagination(totalPages);
  grid.setAttribute('aria-busy','false');
}

function renderPagination(total){
  pagesUl.innerHTML='';
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize/2));
  let end = Math.min(total, start + windowSize - 1);
  if(end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);
  for(let p=start; p<=end; p++){
    const li = document.createElement('li'); const btn = document.createElement('button');
    btn.textContent = p; if(p===page) btn.setAttribute('aria-current','page');
    btn.addEventListener('click', ()=>{ page = p; render(); });
    li.appendChild(btn); pagesUl.appendChild(li);
  }
  prevBtn.disabled = page===1; nextBtn.disabled = page===total;
}
prevBtn.addEventListener('click', ()=>{ if(page>1){ page--; render(); } });
nextBtn.addEventListener('click', ()=>{ page++; render(); });
document.addEventListener('keydown', (e)=>{
  if (e.key === 'ArrowRight') { nextBtn.click(); }
  if (e.key === 'ArrowLeft') { prevBtn.click(); }
});

function applyFilters(){
  page = 1;
  const q = (inputQ.value||'').toLowerCase().trim();
  const lvl = selectLevel.value;
  filtered = DATA.filter(it => {
    const inText = it.title.toLowerCase().includes(q) || it.description.toLowerCase().includes(q) ||
      (it.tags||[]).some(t => (t+'').toLowerCase().includes(q)) || (it.level||'').toLowerCase().includes(q);
    const levelMatch = !lvl || it.level === lvl;
    return inText && levelMatch;
  });
  render();
}
$('#year').textContent = new Date().getFullYear();
form.addEventListener('submit', e => { e.preventDefault(); applyFilters(); });
let timer; inputQ.addEventListener('input', ()=>{ clearTimeout(timer); timer = setTimeout(applyFilters, 220); });
selectLevel.addEventListener('change', applyFilters);
selectPageSize.addEventListener('change', ()=>{ pageSize = parseInt(selectPageSize.value,10)||6; page=1; render(); });
selectSort && selectSort.addEventListener('change', ()=>{ page=1; render(); });

load();
