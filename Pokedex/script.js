/* script.js — Pokédex completo */

// ========== CONSTANTES E SELEÇÃO DE ELEMENTOS ==========
// Configurações da API e limites
const LIMIT = 24, API = "https://pokeapi.co/api/v2/pokemon";

// Seleção de todos os elementos DOM necessários
const list = document.getElementById("list"),        // Grid da lista de pokémons
  msg = document.getElementById("message"),          // Elemento de mensagens
  prev = document.getElementById("prevBtn"),         // Botão anterior
  next = document.getElementById("nextBtn"),         // Botão próximo
  info = document.getElementById("pageInfo"),        // Informações da página
  search = document.getElementById("searchInput"),   // Campo de busca
  btnSearch = document.getElementById("searchBtn"),  // Botão de busca
  btnClear = document.getElementById("clearSearchBtn"), // Botão limpar busca
  btnFav = document.getElementById("favoritesToggle"), // Botão favoritos
  modal = document.getElementById("modal"),          // Modal de detalhes
  modalC = document.getElementById("modalContent"),  // Conteúdo do modal
  closeM = document.getElementById("closeModal");    // Botão fechar modal

// ========== VARIÁVEIS GLOBAIS ==========
let current = `${API}?limit=${LIMIT}&offset=0`,  // URL atual da API
  showingFavs = false;                           // Flag para modo favoritos

// Carrega favoritos do localStorage ou array vazio
let favs = JSON.parse(localStorage.getItem("pokedex_favorites") || "[]");

// ========== FUNÇÕES UTILITÁRIAS ==========

// Exibe mensagens na interface
const msgShow = (t, e = false) => {
  msg.hidden = false;
  msg.textContent = t;
  msg.style.background = e ? "#fee2e2" : "#fffbe6"; // Vermelho para erro, amarelo para info
};

// Oculta mensagens da interface
const msgHide = () => (msg.hidden = true);

// Retorna a melhor imagem disponível para o pokémon
const bestImg = d =>
  d?.sprites?.other?.["official-artwork"]?.front_default ||  // Imagem oficial primeiro
  d?.sprites?.front_default ||                                // Sprite padrão como fallback
  "https://via.placeholder.com/150?text=No+Image";           // Placeholder se não houver imagem

// Salva a lista de favoritos no localStorage
const saveFavs = () => localStorage.setItem("pokedex_favorites", JSON.stringify(favs));

// ========== FUNÇÕES DE RENDERIZAÇÃO ==========

// Cria um card individual para um pokémon
const createCard = p => {
  const c = document.createElement("article");
  c.className = "card";
  
  // Botão de favorito
  const b = document.createElement("button");
  b.className = "fav";
  b.innerHTML = favs.includes(p.id) ? "❤️" : "🤍"; // Coração cheio ou vazio
  b.onclick = e => (e.stopPropagation(), toggleFav(p.id, b)); // Evita bubble-up
  c.append(b);

  // Imagem do pokémon
  const i = document.createElement("img");
  i.src = bestImg(p);
  i.alt = p.name;
  i.loading = "lazy"; // Otimização de performance
  i.onerror = () => (i.src = "https://via.placeholder.com/150?text=No+Image");
  c.append(i);

  // Nome do pokémon
  const n = document.createElement("div");
  n.className = "name";
  n.textContent = p.name;
  c.append(n);

  // ID/número do pokémon
  const m = document.createElement("div");
  m.className = "meta";
  m.textContent = `#${p.id}`;
  c.append(m);

  // Abre modal ao clicar no card
  c.onclick = () => showDetails(p);
  return c;
};

// Função principal que busca e exibe pokémons
async function fetchAndShow(url = current) {
  showingFavs = false;
  btnFav.textContent = "Mostrar Favoritos";
  const u = new URL(url);
  u.searchParams.set("limit", LIMIT);
  current = u.toString();
  localStorage.setItem("pokedex_lastUrl", current); // Salva última URL para persistência
  msgShow("Carregando pokémons...");
  list.innerHTML = ""; // Limpa lista atual

  try {
    const r = await fetch(current, { cache: "no-store" });
    const d = await r.json();
    // Busca detalhes completos de cada pokémon na lista
    const all = await Promise.all(d.results.map(x => fetch(x.url).then(r => r.json())));
    render(all, d.next, d.previous);
    msgHide();
  } catch {
    msgShow("Erro ao carregar pokémons.", true);
  }
}

// Renderiza a lista de pokémons na interface
function render(poks, nextUrl, prevUrl) {
  list.innerHTML = "";
  if (!poks?.length) return msgShow("Nenhum resultado.");
  msgHide();
  poks.forEach(p => list.append(createCard(p))); // Cria card para cada pokémon
  
  // Configura estados dos botões de paginação
  next.disabled = !nextUrl;
  prev.disabled = !prevUrl;
  next.dataset.url = nextUrl || "";
  prev.dataset.url = prevUrl || "";

  // Calcula e exibe informações da página
  const off = new URL(current).searchParams.get("offset") || 0;
  const page = Math.floor(off / LIMIT) + 1;
  const total = Math.ceil(1281 / LIMIT); // Total aproximado de pokémons
  info.textContent = `Página ${page} de ${total} — ${poks.length} pokémons`;
}

// Exibe modal com detalhes completos do pokémon
function showDetails(p) {
  const types = (p.types || []).map(t => t.type.name).join(", ");
  modalC.innerHTML = `
    <div class="details">
      <img src="${bestImg(p)}" alt="${p.name}">
      <div class="info">
        <h2 style="text-transform:capitalize">${p.name} <small>#${p.id}</small></h2>
        <p><b>Tipo(s):</b> ${types}</p>
        <p><b>Altura:</b> ${(p.height / 10).toFixed(2)} m</p>
        <p><b>Peso:</b> ${(p.weight / 10).toFixed(2)} kg</p>
        <button id="favBtnM">${favs.includes(p.id) ? "Remover dos Favoritos" : "Favoritar"}</button>
      </div>
    </div>`;
  
  // Configura evento do botão de favorito no modal
  document.getElementById("favBtnM").onclick = () => {
    toggleFav(p.id);
    showDetails(p); // Atualiza modal
    showingFavs ? showFavs() : fetchAndShow(current); // Atualiza lista se necessário
  };
  modal.hidden = false;
}

// ========== EVENTOS DO MODAL ==========
// Fecha modal ao clicar no X
closeM.onclick = () => (modal.hidden = true);

// Fecha modal ao clicar fora do conteúdo
modal.onclick = e => e.target === modal && (modal.hidden = true);

// ========== GERENCIAMENTO DE FAVORITOS ==========

// Alterna estado de favorito de um pokémon
function toggleFav(id, el) {
  const i = favs.indexOf(id);
  i === -1 ? favs.push(id) : favs.splice(i, 1); // Adiciona ou remove
  saveFavs();
  if (el) el.innerHTML = favs.includes(id) ? "❤️" : "🤍"; // Atualiza ícone
}

// Exibe apenas os pokémons favoritados
async function showFavs() {
  showingFavs = true;
  btnFav.textContent = "Mostrar Todos";
  if (!favs.length) return render([], null, null), msgShow("Nenhum favorito.");
  msgShow("Carregando favoritos...");
  // Busca dados completos de cada favorito
  const res = await Promise.all(favs.map(id => fetch(`${API}/${id}`).then(r => r.json())));
  render(res, null, null);
  msgHide();
}

// ========== FUNCIONALIDADE DE BUSCA ==========

// Busca pokémon por nome
async function searchName(name) {
  if (!name.trim()) return fetchAndShow(`${API}?limit=${LIMIT}&offset=0`); // Volta para lista geral se vazio
  msgShow("Buscando...");
  try {
    const r = await fetch(`${API}/${name.toLowerCase().trim()}`);
    if (!r.ok) return render([], null, null), msgShow(`Nenhum resultado para "${name}"`);
    const p = await r.json();
    render([p]); // Renderiza apenas o pokémon encontrado
    msgHide();
  } catch {
    msgShow("Erro na busca.", true);
  }
}

// ========== CONFIGURAÇÃO DE EVENTOS ==========

/* Eventos - CORRIGIDOS */
// Navegação entre páginas
next.onclick = () => next.dataset.url && fetchAndShow(next.dataset.url);
prev.onclick = () => prev.dataset.url && fetchAndShow(prev.dataset.url);

// Controles de busca
btnSearch.onclick = () => searchName(search.value);
btnClear.onclick = () => {
  search.value = "";
  search.focus(); // Adicionado foco no campo após limpar
  fetchAndShow(`${API}?limit=${LIMIT}&offset=0`);
};

// Alternar entre favoritos e lista completa
btnFav.onclick = () => (showingFavs ? fetchAndShow(current) : showFavs());

// EVENTOS DE TECLADO CORRIGIDOS
// Busca ao pressionar Enter
search.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault(); // Previne comportamento padrão
    searchName(search.value);
  }
});

// Adicionado evento de input para melhor resposta
search.addEventListener('input', (e) => {
  // Opcional: busca automática enquanto digita (descomente se quiser)
  // if (e.target.value.length >= 3) {
  //   searchName(e.target.value);
  // }
});

// Foco automático no campo de busca ao carregar a página
search.focus();

// ========== INICIALIZAÇÃO DA APLICAÇÃO ==========
/* Inicialização */
(function init() {
  // Carrega última URL visitada ou página inicial
  const last = localStorage.getItem("pokedex_lastUrl") || `${API}?limit=${LIMIT}&offset=0`;
  fetchAndShow(last);
})();