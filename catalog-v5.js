'use strict';
// Catalog rendering is paginated for mobile performance; preserves V4 search and add-to-workout behavior.
(() => {
  if (typeof catalog === 'undefined') return;
  let count = 24;
  const get = id => document.getElementById(id);
  renderCatalog = function() {
    const filters = get('exercise-filters'); filters.replaceChildren();
    [['todos','Todos'], ...Object.entries(categoryNames)].forEach(([id,label]) => {
      const b = document.createElement('button'); b.className = 'chip' + (catalogCategory===id?' primary':''); b.textContent=label;
      b.onclick = () => { catalogCategory=id; count=24; renderCatalog(); }; filters.append(b);
    });
    const q = get('exercise-search').value.trim().toLocaleLowerCase('pt-BR');
    const filtered = catalog.filter(e => (catalogCategory==='todos'||e[1]===catalogCategory) && e.join(' ').toLocaleLowerCase('pt-BR').includes(q));
    const root = get('exercise-catalog'); root.replaceChildren();
    if (root.previousElementSibling?.classList.contains('catalog-summary')) root.previousElementSibling.remove();
    const total = document.createElement('p'); total.className='catalog-summary'; total.textContent=`${filtered.length} exercício(s) no catálogo · ilustrações por grupo muscular`; root.before(total);
    for (const e of filtered.slice(0,count)) {
      const card = document.createElement('article'); card.className='catalog-card';
      const img = document.createElement('img'); img.src=picture(e[1]); img.loading='lazy'; img.alt=`Ilustração do grupo muscular: ${e[2]}`;
      const name=document.createElement('strong'); name.textContent=e[0];
      const tags=document.createElement('div'); tags.className='hint'; tags.textContent=`${e[2]} · ${e[3]}`;
      const details=document.createElement('details'); const summary=document.createElement('summary');summary.textContent='Ver orientação';const desc=document.createElement('p');desc.textContent=e[4];details.append(summary,desc);
      const add=document.createElement('button');add.className='mini';add.textContent='+ Adicionar ao treino selecionado';
      add.onclick=()=>{const p=activePlan()[selected]; if(p.ex.some(x=>x[0]===e[0])){alert('Exercício já presente na ficha.');return;}p.ex.push([e[0],2,'10–12']);save();render();alert(e[0]+' adicionado ao treino de '+p.day+'.');};
      card.append(img,name,tags,details,add);root.append(card);
    }
    if (!filtered.length) { const p=document.createElement('p');p.className='note';p.textContent='Nenhum exercício encontrado.';root.append(p); }
    if (filtered.length > count) { const more=document.createElement('button');more.className='action';more.textContent=`Mostrar mais ${Math.min(24,filtered.length-count)} exercícios`;more.onclick=()=>{count+=24;renderCatalog();};root.after(more); } else { const other=root.nextElementSibling; if (other?.dataset?.catalogMore==='true') other.remove(); }
    // Avoid stale "Mostrar mais" buttons after consecutive search/filter actions.
    for(const item of [...root.parentElement.children]) if(item.dataset?.catalogMore==='true')item.remove();
    if(filtered.length>count){ const btn=root.nextElementSibling; if(btn?.classList.contains('action'))btn.dataset.catalogMore='true'; }
  };
  get('exercise-search').oninput=()=>{count=24;renderCatalog();};
})();
