/* =====================================================================
   LYGLLYZ TABACARIA — LÓGICA
   (abas Produtos/A Loja, categorias, busca, carrinho, WhatsApp,
    placeholders de imagem gerados em SVG)
   Edite os dados em config.js.
   ===================================================================== */

(function () {
  "use strict";

  const fmt = (n) => "R$ " + n.toFixed(2).replace(".", ",");
  const catMap = Object.fromEntries(CONFIG.categorias.map((c) => [c.key, c]));
  const findProduct = (id) => CONFIG.produtos.find((p) => p.id === id);
  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // aplica destaques e promoções definidos no config.js aos produtos
  (CONFIG.destaques || []).forEach((id) => {
    const p = findProduct(id);
    if (p) p.destaque = true;
  });
  Object.entries(CONFIG.promocoes || {}).forEach(([id, de]) => {
    const p = findProduct(id);
    if (p && de > p.preco) p.precoDe = de;
  });

  /* ---------- PLACEHOLDER DE IMAGEM (SVG, sem internet) ---------- */
  function placeholder(p) {
    const cat = (catMap[p.cat]?.nome || "").toUpperCase();
    // quebra o nome em até 2 linhas
    const words = p.nome.split(" ");
    let l1 = "", l2 = "";
    words.forEach((w) => {
      if ((l1 + " " + w).trim().length <= 16 && !l2) l1 = (l1 + " " + w).trim();
      else l2 = (l2 + " " + w).trim();
    });
    const nameLines = [l1, l2].filter(Boolean);
    const nameSvg = nameLines
      .map(
        (line, i) =>
          `<text x='300' y='${265 + i * 38}' font-family='Arial,sans-serif' font-size='28' font-weight='700' text-anchor='middle' fill='#eaf5e6'>${esc(line)}</text>`
      )
      .join("");

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='450'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stop-color='#162012'/>
          <stop offset='1' stop-color='#1c1030'/>
        </linearGradient>
        <radialGradient id='r' cx='0.5' cy='0.36' r='0.6'>
          <stop offset='0' stop-color='#46d62c' stop-opacity='0.34'/>
          <stop offset='1' stop-color='#46d62c' stop-opacity='0'/>
        </radialGradient>
      </defs>
      <rect width='600' height='450' fill='url(#g)'/>
      <rect width='600' height='450' fill='url(#r)'/>
      <g transform='translate(300 150)' fill='none' stroke='#46d62c' stroke-width='6' stroke-linecap='round' stroke-linejoin='round' opacity='0.9'>
        <path d='M-46 6 q-10 -34 22 -40 q22 -4 30 14 q26 -2 40 16 q14 18 4 38 q-12 22 -40 18 q-30 -2 -40 -22'/>
        <circle cx='10' cy='-12' r='8' fill='#9b30ff' stroke='none'/>
        <path d='M28 36 q22 14 14 36'/>
        <path d='M-46 6 q-22 6 -26 26' />
      </g>
      <text x='300' y='225' font-family='Arial,sans-serif' font-size='18' letter-spacing='5' text-anchor='middle' fill='#7bed5a'>${esc(cat)}</text>
      ${nameSvg}
      <text x='300' y='415' font-family='Arial,sans-serif' font-size='15' letter-spacing='3' text-anchor='middle' fill='#9b30ff'>FOTO EM BREVE</text>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  const imgFor = (p) => p.img && p.img.trim() ? p.img : placeholder(p);
  // versão miniatura (~360px, pasta img/th/) — muito mais leve de decodificar na grade/ícones
  const thumbURL = (src) => {
    if (!src || src.startsWith("data:")) return src;
    const i = src.lastIndexOf("/");
    return i < 0 ? "img/th/" + src : src.slice(0, i) + "/th/" + src.slice(i + 1);
  };
  const thumbFor = (p) => thumbURL(imgFor(p));

  /* ---------- ESTADO ---------- */
  let activeCat = "todos";
  let search = "";
  let cart = loadCart();

  const $ = (id) => document.getElementById(id);
  const $tabs = $("tabs"),
    $grid = $("grid"),
    $empty = $("emptyMsg"),
    $search = $("search"),
    $cart = $("cart"),
    $cartItems = $("cartItems"),
    $cartEmpty = $("cartEmpty"),
    $cartTotal = $("cartTotal"),
    $cartCount = $("cartCount"),
    $cartOverlay = $("cartOverlay"),
    $checkout = $("checkout");

  /* ---------- TROCA DE VIEW (Produtos / A Loja) ---------- */
  function showView(view) {
    document.querySelectorAll(".view").forEach((v) =>
      v.classList.toggle("is-active", v.dataset.view === view)
    );
    document.querySelectorAll(".nav-tab").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.view === view)
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  // só os controles (nav, botões, links) trocam de view — NÃO as <section class="view">
  document.querySelectorAll("[data-view]:not(.view)").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      showView(el.dataset.view);
    })
  );

  /* ---------- ABAS DE CATEGORIA ---------- */
  function renderTabs() {
    const tabs = [{ key: "todos", nome: "Tudo" }, ...CONFIG.categorias];
    $tabs.innerHTML = tabs
      .map(
        (c) =>
          `<button class="tab${c.key === activeCat ? " is-active" : ""}" data-cat="${c.key}">${esc(c.nome)}</button>`
      )
      .join("");
    $tabs.querySelectorAll(".tab").forEach((btn) =>
      btn.addEventListener("click", () => {
        activeCat = btn.dataset.cat;
        renderTabs();
        renderGrid();
      })
    );
  }

  /* ---------- CARD DE PRODUTO (reutilizável) ---------- */
  function cardHTML(p, i) {
    const cat = catMap[p.cat] || { nome: p.cat };
    const novo = isNovidade(p);
    const off =
      p.precoDe && p.precoDe > p.preco
        ? Math.round((1 - p.preco / p.precoDe) * 100)
        : 0;
    const flag = off
      ? `<span class="card-badge-off">-${off}%</span>`
      : novo
      ? `<span class="card-flag">Novidade</span>`
      : "";
    return `
      <article class="card reveal" style="--d:${(i % 6) * 0.02}s">
        <div class="card-media" data-open="${p.id}" title="Ver detalhes">
          <img class="card-media-bg" src="${thumbFor(p)}" alt="" aria-hidden="true" loading="lazy" decoding="async">
          <span class="card-cat">${esc(cat.nome)}</span>
          ${flag}
          <img class="card-media-fg" src="${thumbFor(p)}" alt="${esc(p.nome)}" loading="lazy" decoding="async">
        </div>
        <div class="card-body">
          <h3 class="card-name">${esc(p.nome)}</h3>
          <p class="card-desc">${esc(p.desc || "")}</p>
          <div class="card-foot">
            <span class="card-prices">
              ${off ? `<span class="card-price-de">${fmt(p.precoDe)}</span>` : ""}
              <span class="card-price">${fmt(p.preco)}</span>
            </span>
            <button class="card-add" data-add="${p.id}" aria-label="Adicionar ${esc(p.nome)}">+</button>
          </div>
        </div>
      </article>`;
  }
  function wireCards(host) {
    if (!host) return;
    host.querySelectorAll("[data-add]").forEach((btn) =>
      btn.addEventListener("click", () => addToCart(btn.dataset.add))
    );
    host.querySelectorAll("[data-open]").forEach((el) =>
      el.addEventListener("click", () => openProduct(el.dataset.open))
    );
  }

  /* ---------- GRADE DE PRODUTOS ---------- */
  function renderGrid() {
    const term = search.trim().toLowerCase();
    const list = CONFIG.produtos.filter((p) => {
      const okCat = activeCat === "todos" || p.cat === activeCat;
      const okTerm =
        !term ||
        p.nome.toLowerCase().includes(term) ||
        (p.desc || "").toLowerCase().includes(term) ||
        (catMap[p.cat]?.nome || "").toLowerCase().includes(term);
      return okCat && okTerm;
    });

    $empty.hidden = list.length > 0;
    if (list.length === 0) {
      $empty.textContent = search.trim()
        ? "Nenhum produto encontrado nessa busca. 🦎"
        : "🚧 Em breve novidades por aqui…";
    }
    $grid.innerHTML = list.map((p, i) => cardHTML(p, i)).join("");
    wireCards($grid);
    revealCards();
  }

  /* ---------- DESTAQUES + PROMOÇÕES (página inicial) ---------- */
  function renderDestaques() {
    const host = $("destaqueGrid");
    if (!host) return;
    const list = CONFIG.produtos
      .filter((p) => p.destaque || isNovidade(p))
      .slice(0, 8);
    host.innerHTML = list.map((p, i) => cardHTML(p, i)).join("");
    wireCards(host);
    revealCards();
  }
  function renderPromos() {
    const host = $("promoGrid"),
      section = $("promoSection");
    if (!host) return;
    const list = CONFIG.produtos.filter((p) => p.precoDe && p.precoDe > p.preco);
    if (section) section.hidden = list.length === 0;
    host.innerHTML = list.map((p, i) => cardHTML(p, i)).join("");
    wireCards(host);
    revealCards();
  }

  /* produto é "novidade" se a descrição mencionar (case-insensitive) */
  const isNovidade = (p) => /novidade/i.test(p.desc || "");

  /* revela os cards conforme entram na tela (IntersectionObserver) */
  let cardObserver = null;
  function revealCards() {
    const cards = document.querySelectorAll(".card.reveal:not(.in)");
    if (!("IntersectionObserver" in window)) {
      cards.forEach((c) => c.classList.add("in"));
      return;
    }
    if (!cardObserver) {
      cardObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              cardObserver.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px 18% 0px", threshold: 0 }
      );
    }
    cards.forEach((c) => cardObserver.observe(c));
  }

  /* ---------- ÍCONES SVG DAS CATEGORIAS ---------- */
  const CAT_ICONS = {
    _default: '<circle cx="12" cy="12" r="9"/>',
    todos:
      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    seda: '<rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>',
    piteira:
      '<rect x="3" y="9" width="18" height="6" rx="3"/><line x1="9" y1="9.5" x2="9" y2="14.5"/><line x1="15" y1="9.5" x2="15" y2="14.5"/>',
    vidro: '<line x1="8" y1="3" x2="16" y2="3"/><path d="M10 3v12a2 2 0 0 0 4 0V3"/>',
    bong: '<line x1="9" y1="3" x2="15" y2="3"/><path d="M10.5 3v5l-4.2 9.2A2 2 0 0 0 8.1 20h7.8a2 2 0 0 0 1.8-2.8L13.5 8V3"/>',
    isqueiro:
      '<path d="M12 3c2.2 3 4 5 4 8a4 4 0 0 1-8 0c0-2 1-3.2 2.2-4.2C11 9 11.5 6.5 12 3z"/>',
    macarico:
      '<path d="M12 2c1.6 2.5 3 4.2 3 6.6a3 3 0 0 1-6 0C9 6.2 10.4 4.5 12 2z"/><rect x="9" y="15.5" width="6" height="5.5" rx="1.2"/>',
    case:
      '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5.5A2 2 0 0 1 10 3.5h4a2 2 0 0 1 2 2V7"/><line x1="3" y1="12" x2="21" y2="12"/>',
    kit:
      '<rect x="4" y="9" width="16" height="12" rx="1.5"/><line x1="12" y1="9" x2="12" y2="21"/><path d="M12 9C11 6.5 9.5 5 8 6s.5 3 4 3z"/><path d="M12 9c1-2.5 2.5-4 4-3s-.5 3-4 3z"/>',
    cinzeiro:
      '<path d="M3.5 11h17l-1.8 5.5A2 2 0 0 1 16.8 18H7.2a2 2 0 0 1-1.9-1.5z"/><line x1="9.5" y1="11" x2="10.5" y2="8"/>',
    cuia: '<path d="M3.5 10h17a8.5 8.5 0 0 1-17 0z"/><line x1="12" y1="18.5" x2="12" y2="21"/>',
    bandeja:
      '<rect x="3" y="8" width="18" height="9" rx="2"/><line x1="3.5" y1="12.5" x2="20.5" y2="12.5"/>',
    moco:
      '<rect x="5" y="4" width="14" height="16" rx="2"/><line x1="5" y1="9" x2="19" y2="9"/><circle cx="12" cy="14.5" r="1.5"/>',
    slick:
      '<rect x="6" y="8" width="12" height="12" rx="2.5"/><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8"/>',
    tabaco:
      '<path d="M11 20.5A7.5 7.5 0 0 1 3.5 13C3.5 7.8 7.8 3.5 13 3.5c3 0 7.5 1 7.5 1s-1 12-9.5 16z"/><line x1="13" y1="8" x2="8" y2="15.5"/>',
    tesoura:
      '<circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><line x1="20" y1="4" x2="8.4" y2="15.6"/><line x1="14.5" y1="14.5" x2="20" y2="20"/><line x1="8.4" y1="8.4" x2="12" y2="12"/>',
    bag:
      '<path d="M6 7h12l1 12.5a1.2 1.2 0 0 1-1.2 1.3H6.2A1.2 1.2 0 0 1 5 19.5z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/>',
  };
  function catIcon(key) {
    const inner = CAT_ICONS[key] || CAT_ICONS._default;
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  }

  /* ---------- CATEGORIAS EM DESTAQUE + ATALHOS ---------- */
  function categoryCounts() {
    const counts = {};
    CONFIG.produtos.forEach((p) => (counts[p.cat] = (counts[p.cat] || 0) + 1));
    return counts;
  }
  function selectCategory(key) {
    activeCat = key;
    search = "";
    if ($search) $search.value = "";
    renderTabs();
    renderGrid();
    const grid = $("grid");
    if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function renderCatTiles() {
    const host = $("catTiles");
    if (!host) return;
    const counts = categoryCounts();
    host.innerHTML = CONFIG.categorias
      .filter((c) => counts[c.key])
      .map(
        (c) => `
        <button class="cat-tile" data-cat="${c.key}">
          <span class="cat-ic">${c.icon || "🦎"}</span>
          <span class="cat-nm">${esc(c.nome)}</span>
          <span class="cat-ct">${counts[c.key]} ${counts[c.key] === 1 ? "item" : "itens"}</span>
        </button>`
      )
      .join("");
    host.querySelectorAll(".cat-tile").forEach((b) =>
      b.addEventListener("click", () => selectCategory(b.dataset.cat))
    );
  }
  function renderCatMenu() {
    const host = $("catMenu");
    if (!host) return;
    const counts = categoryCounts();
    const items = [{ key: "todos", nome: "Tudo", icon: "🦎" }].concat(
      CONFIG.categorias.filter((c) => counts[c.key])
    );
    host.innerHTML =
      `<p class="cat-menu-head">Categorias</p>` +
      items
        .map((c) => {
          const n = c.key === "todos" ? CONFIG.produtos.length : counts[c.key];
          return `<button class="cat-menu-item${c.key === activeCat ? " is-active" : ""}" data-cat="${c.key}" role="menuitem">
            <span class="cmi-ic">${catIcon(c.key)}</span>
            <span class="cmi-nm">${esc(c.nome)}</span>
            <span class="cmi-ct">${n}</span>
          </button>`;
        })
        .join("");
    host.querySelectorAll(".cat-menu-item").forEach((b) =>
      b.addEventListener("click", () => {
        closeCatMenu();
        showView("produtos");
        selectCategory(b.dataset.cat);
      })
    );
  }
  function openCatMenu() {
    const menu = $("catMenu"),
      btn = $("catMenuBtn");
    if (!menu || !btn) return;
    renderCatMenu();
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  }
  function closeCatMenu() {
    const menu = $("catMenu"),
      btn = $("catMenuBtn");
    if (!menu || !btn) return;
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }

  function renderFooterCats() {
    const host = $("footerCats");
    if (!host) return;
    const counts = categoryCounts();
    const cats = CONFIG.categorias.filter((c) => counts[c.key]).slice(0, 6);
    host.innerHTML = cats
      .map((c) => `<a href="#grid" data-cat-link="${c.key}">${esc(c.nome)}</a>`)
      .join("");
    host.querySelectorAll("[data-cat-link]").forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        showView("produtos");
        selectCategory(a.dataset.cat);
      })
    );
  }

  /* ---------- POP-UP DE PRODUTO ---------- */
  const $prodModal = $("prodModal"),
    $prodOverlay = $("prodOverlay");
  let currentProductId = null;

  let galleryImgs = [];
  let galleryIdx = 0;

  function showGalleryImg(i) {
    if (!galleryImgs.length) return;
    galleryIdx = (i + galleryImgs.length) % galleryImgs.length;
    $("prodImg").src = galleryImgs[galleryIdx];
    $("prodThumbs")
      .querySelectorAll(".prod-thumb")
      .forEach((t, n) => t.classList.toggle("active", n === galleryIdx));
  }

  function openProduct(id) {
    const p = findProduct(id);
    if (!p) return;
    currentProductId = id;
    const cat = catMap[p.cat] || { nome: p.cat };

    // galeria: usa imgs[] se existir, senão a foto única
    galleryImgs =
      p.imgs && p.imgs.length ? p.imgs.slice() : [imgFor(p)];
    galleryIdx = 0;

    const thumbs = $("prodThumbs");
    const multi = galleryImgs.length > 1;
    if (multi) {
      thumbs.hidden = false;
      thumbs.innerHTML = galleryImgs
        .map(
          (src, i) =>
            `<img class="prod-thumb${i === 0 ? " active" : ""}" src="${thumbURL(src)}" data-idx="${i}" alt="">`
        )
        .join("");
      thumbs.querySelectorAll(".prod-thumb").forEach((t) =>
        t.addEventListener("click", () => showGalleryImg(+t.dataset.idx))
      );
    } else {
      thumbs.hidden = true;
      thumbs.innerHTML = "";
    }
    $("prodPrev").hidden = !multi;
    $("prodNext").hidden = !multi;

    $("prodImg").src = galleryImgs[0];
    $("prodImg").alt = p.nome;
    $("prodCat").textContent = cat.nome;
    $("prodFlag").hidden = !isNovidade(p);
    $("prodName").textContent = p.nome;
    $("prodDesc").textContent = p.desc || "Sem descrição.";
    $("prodPrice").textContent = fmt(p.preco);
    $prodModal.hidden = false;
    $prodOverlay.hidden = false;
  }
  function closeProduct() {
    $prodModal.hidden = true;
    $prodOverlay.hidden = true;
    currentProductId = null;
  }

  /* ---------- CARRINHO ---------- */
  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem("lygllyz_cart")) || {};
    } catch {
      return {};
    }
  }
  const saveCart = () =>
    localStorage.setItem("lygllyz_cart", JSON.stringify(cart));

  function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
    saveCart();
    renderCart();
    flashCount();
    showToast(findProduct(id));
  }
  function changeQty(id, d) {
    cart[id] = (cart[id] || 0) + d;
    if (cart[id] <= 0) delete cart[id];
    saveCart();
    renderCart();
  }
  function removeItem(id) {
    delete cart[id];
    saveCart();
    renderCart();
  }

  const cartEntries = () =>
    Object.keys(cart)
      .map((id) => ({ p: findProduct(id), q: cart[id] }))
      .filter((e) => e.p);
  const cartTotal = () =>
    cartEntries().reduce((s, e) => s + e.p.preco * e.q, 0);
  const cartCount = () => cartEntries().reduce((s, e) => s + e.q, 0);

  function renderCart() {
    const entries = cartEntries();
    const count = cartCount();
    $cartCount.textContent = count;
    $cartCount.hidden = count === 0;
    $checkout.disabled = count === 0;
    $cartEmpty.style.display = count === 0 ? "block" : "none";

    $cartItems.innerHTML = entries
      .map(
        (e) => `
        <div class="cart-item">
          <div class="ci-icon"><img src="${thumbFor(e.p)}" alt=""></div>
          <div class="ci-info">
            <div class="ci-name">${esc(e.p.nome)}</div>
            <div class="ci-price">${fmt(e.p.preco)} · subtotal ${fmt(e.p.preco * e.q)}</div>
          </div>
          <div class="ci-qty">
            <button data-dec="${e.p.id}">−</button>
            <span>${e.q}</span>
            <button data-inc="${e.p.id}">+</button>
          </div>
          <button class="ci-remove" data-rm="${e.p.id}" aria-label="Remover">🗑️</button>
        </div>`
      )
      .join("");

    $cartItems.querySelectorAll("[data-inc]").forEach((b) =>
      b.addEventListener("click", () => changeQty(b.dataset.inc, 1))
    );
    $cartItems.querySelectorAll("[data-dec]").forEach((b) =>
      b.addEventListener("click", () => changeQty(b.dataset.dec, -1))
    );
    $cartItems.querySelectorAll("[data-rm]").forEach((b) =>
      b.addEventListener("click", () => removeItem(b.dataset.rm))
    );

    $cartTotal.textContent = fmt(cartTotal());

    // título do carrinho com contador de itens (só na etapa de itens)
    if ($checkoutForm.hidden) {
      $cartTitle.textContent =
        count > 0
          ? `Seu Pedido · ${count} ${count > 1 ? "itens" : "item"}`
          : "Seu Pedido";
    }
  }

  function flashCount() {
    $cartCount.style.transform = "scale(1.4)";
    setTimeout(() => ($cartCount.style.transform = ""), 180);
  }

  /* ---------- TOAST (pop-up item adicionado) ---------- */
  const $toast = $("toast");
  let toastTimer = null,
    toastHide = null;
  function showToast(p) {
    if (!p || !$toast) return;
    $("toastImg").src = thumbFor(p);
    $("toastName").textContent = p.nome;
    clearTimeout(toastHide);
    $toast.hidden = false;
    requestAnimationFrame(() => $toast.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 2800);
  }
  function hideToast() {
    if (!$toast) return;
    $toast.classList.remove("show");
    toastHide = setTimeout(() => ($toast.hidden = true), 350);
  }
  function openCart() {
    showStep("items");
    $cart.classList.add("is-open");
    $cart.setAttribute("aria-hidden", "false");
    $cartOverlay.hidden = false;
  }
  function closeCart() {
    $cart.classList.remove("is-open");
    $cart.setAttribute("aria-hidden", "true");
    $cartOverlay.hidden = true;
  }

  /* ---------- WHATSAPP ---------- */
  function buildWhatsMessage(d) {
    let msg = "🦎 *NOVO PEDIDO — Lygllyz Tabacaria* 🦎\n\n";
    msg += `👤 *Cliente:* ${d.nome}\n\n`;

    msg += "🛒 *Itens:*\n";
    cartEntries().forEach((e) => {
      msg += `• ${e.q}x ${e.p.nome} — ${fmt(e.p.preco * e.q)}\n`;
    });

    const sub = cartTotal();
    let frete = 0;
    if (d.entrega === "entrega") {
      frete =
        d.regiao === "aracruz" ? taxaEntrega() : cityPrice(d.cidade) || 0;
    }
    msg += `\n*Subtotal:* ${fmt(sub)}\n`;

    if (d.entrega === "entrega") {
      msg += `🛵 *Entrega:* ${d.endereco}, nº ${d.numero}`;
      if (d.complemento) msg += ` (${d.complemento})`;
      msg += "\n";
      if (d.regiao === "aracruz") {
        msg += `🛵 *Taxa de entrega (Aracruz):* ${fmt(frete)}\n`;
      } else {
        msg += `📍 *Cidade:* ${d.cidade}\n`;
        msg += `🛵 *Taxa de entrega (${d.cidade}):* ${fmt(frete)}\n`;
      }
    } else {
      msg += "🏪 *Retirada na loja*\n";
    }

    msg += `*TOTAL: ${fmt(sub + frete)}*\n\n`;

    msg += `💳 *Pagamento:* ${d.pagamento}`;
    if (d.pagamento === "Dinheiro" && d.troco) msg += ` — troco para ${d.troco}`;
    msg += "\n";

    if (d.obs) msg += `📝 *Obs:* ${d.obs}\n`;

    if (CONFIG.mensagemRodape) msg += `\n${CONFIG.mensagemRodape}`;
    return msg;
  }
  function whatsLink(text) {
    const num = (CONFIG.whatsapp || "").replace(/\D/g, "");
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  }

  /* ---------- CHECKOUT (etapa dentro do carrinho) ---------- */
  const $stepItems = $("stepItems"),
    $checkoutForm = $("checkoutForm"),
    $checkoutItems = $("checkoutItems"),
    $checkoutTotal = $("checkoutTotal"),
    $checkoutError = $("checkoutError"),
    $enderecoWrap = $("enderecoWrap"),
    $trocoWrap = $("trocoWrap"),
    $cartBack = $("cartBack"),
    $cartTitle = $("cartTitle");

  const SAVE_KEY = "lygllyz_cliente";

  function showStep(step) {
    const checkout = step === "checkout";
    $stepItems.hidden = checkout;
    $checkoutForm.hidden = !checkout;
    $cartBack.hidden = !checkout;
    if (checkout) {
      $cartTitle.textContent = "Finalizar";
    } else {
      const c = cartCount();
      $cartTitle.textContent =
        c > 0 ? `Seu Pedido · ${c} ${c > 1 ? "itens" : "item"}` : "Seu Pedido";
    }
  }

  function openCheckout() {
    if (cartCount() === 0) return;
    // resumo
    $checkoutItems.innerHTML = cartEntries()
      .map(
        (e) =>
          `<div class="ck-line"><span>${esc(e.q)}x ${esc(e.p.nome)}</span><span>${fmt(e.p.preco * e.q)}</span></div>`
      )
      .join("");
    updateCheckoutTotals();
    $checkoutError.hidden = true;

    // restaura dados salvos do cliente
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
      if (saved.nome) $("f-nome").value = saved.nome;
      if (saved.endereco) $("f-endereco").value = saved.endereco;
      if (saved.numero) $("f-numero").value = saved.numero;
      if (saved.complemento) $("f-complemento").value = saved.complemento;
    } catch {}

    fillCidades();
    toggleEndereco();
    toggleTroco();
    toggleSemNumero();
    showStep("checkout");
    $checkoutForm.scrollTop = 0;
  }
  function backToItems() {
    $checkoutError.hidden = true;
    showStep("items");
  }

  function getEntrega() {
    const el = $checkoutForm.querySelector('input[name="entrega"]:checked');
    return el ? el.value : "entrega";
  }
  function getPagamento() {
    const el = $checkoutForm.querySelector('input[name="pagamento"]:checked');
    return el ? el.value : "Pix";
  }
  const taxaEntrega = () => Number(CONFIG.taxaEntrega) || 0;
  const fretesFora = Array.isArray(CONFIG.fretesFora) ? CONFIG.fretesFora : [];
  function getRegiao() {
    const el = $checkoutForm.querySelector('input[name="regiao"]:checked');
    return el ? el.value : "aracruz";
  }
  const getCidade = () => $("f-cidade").value;
  function cityPrice(nome) {
    const c = fretesFora.find((f) => f.nome === nome);
    return c ? Number(c.preco) : null;
  }
  // retira -> 0 ; Aracruz -> número ; fora SEM cidade -> null ; fora COM cidade -> preço
  function freteValor() {
    if (getEntrega() !== "entrega") return 0;
    if (getRegiao() === "aracruz") return taxaEntrega();
    const c = getCidade();
    return c ? cityPrice(c) : null;
  }

  function updateCheckoutTotals() {
    const sub = cartTotal();
    $("checkoutSubtotal").textContent = fmt(sub);
    const f = freteValor();
    const row = $("checkoutFreteRow");
    if (f === 0) {
      // retirada na loja
      row.hidden = true;
      $checkoutTotal.textContent = fmt(sub);
    } else if (f === null) {
      // fora de Aracruz, ainda sem cidade escolhida
      row.hidden = false;
      $("checkoutFrete").textContent = "Selecione a cidade";
      $checkoutTotal.textContent = fmt(sub) + " + entrega";
    } else {
      // Aracruz
      row.hidden = false;
      $("checkoutFrete").textContent = fmt(f);
      $checkoutTotal.textContent = fmt(sub + f);
    }
  }
  function fillCidades() {
    const sel = $("f-cidade");
    if (sel.options.length > 1) return; // já preenchido
    fretesFora.forEach((f) => {
      const o = document.createElement("option");
      o.value = f.nome;
      o.textContent = `${f.nome} — ${fmt(Number(f.preco))}`;
      sel.appendChild(o);
    });
  }
  function toggleRegiao() {
    $("cidadeWrap").hidden = !(getEntrega() === "entrega" && getRegiao() === "fora");
    updateCheckoutTotals();
  }
  function toggleEndereco() {
    $enderecoWrap.hidden = getEntrega() !== "entrega";
    toggleRegiao();
  }
  function toggleTroco() {
    $trocoWrap.hidden = getPagamento() !== "Dinheiro";
  }
  function toggleSemNumero() {
    const chk = $("f-semnumero").checked;
    const num = $("f-numero");
    num.disabled = chk;
    if (chk) num.value = "";
  }

  function submitOrder(ev) {
    ev.preventDefault();
    const semNumero = $("f-semnumero").checked;
    const d = {
      nome: $("f-nome").value.trim(),
      entrega: getEntrega(),
      regiao: getRegiao(),
      cidade: getCidade(),
      endereco: $("f-endereco").value.trim(),
      numero: semNumero ? "S/N" : $("f-numero").value.trim(),
      complemento: $("f-complemento").value.trim(),
      pagamento: getPagamento(),
      troco: $("f-troco").value.trim(),
      obs: $("f-obs").value.trim(),
    };

    // validação
    if (!d.nome) return showError("Por favor, informe seu nome.");
    if (d.entrega === "entrega" && !d.endereco)
      return showError("Informe a rua e o bairro da entrega.");
    if (d.entrega === "entrega" && !d.numero)
      return showError("Informe o número da casa (ou marque “Sem número”).");
    if (d.entrega === "entrega" && d.regiao === "fora" && !d.cidade)
      return showError("Escolha a cidade/localidade da entrega.");
    if (cartCount() === 0) return showError("Seu carrinho está vazio.");

    // salva dados do cliente pra próxima vez
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          nome: d.nome,
          endereco: d.endereco,
          numero: semNumero ? "" : d.numero,
          complemento: d.complemento,
        })
      );
    } catch {}

    window.open(whatsLink(buildWhatsMessage(d)), "_blank");
    backToItems();
    closeCart();
  }
  function showError(msg) {
    $checkoutError.textContent = msg;
    $checkoutError.hidden = false;
  }

  /* ---------- CONTATO ---------- */
  function fillContact() {
    const num = (CONFIG.whatsapp || "").replace(/\D/g, "");
    const wlink = `https://wa.me/${num}`;
    const set = (id, fn) => {
      const el = $(id);
      if (el) fn(el);
    };
    set("link-whats", (el) => {
      el.href = wlink;
      el.textContent = CONFIG.telefone || "WhatsApp";
    });
    set("link-email", (el) => {
      el.href = "mailto:" + CONFIG.email;
      el.textContent = CONFIG.email;
    });
    set("link-insta", (el) => {
      const h = (CONFIG.instagram || "").replace(/^@/, "");
      el.href = "https://instagram.com/" + h;
      el.textContent = CONFIG.instagram;
    });
    set("txt-endereco", (el) => (el.textContent = CONFIG.endereco));
    set("txt-horario", (el) => (el.textContent = CONFIG.horario));
    set("btn-duvida", (el) => {
      el.href = whatsLink(
        "Olá! Tenho uma dúvida sobre os produtos da Lygllyz Tabacaria. 🦎"
      );
    });
    set("floatWhats", (el) => {
      el.href = whatsLink("Olá, Lygllyz Tabacaria! 👋");
    });
    set("footer-whats", (el) => {
      el.href = whatsLink("Olá, Lygllyz Tabacaria! 👋");
    });
    const ano = $("ano");
    if (ano) ano.textContent = new Date().getFullYear();
  }

  /* ---------- EVENTOS ---------- */
  $("cartBtn").addEventListener("click", openCart);
  $("toastBtn").addEventListener("click", () => {
    hideToast();
    openCart();
  });
  $("cartClose").addEventListener("click", closeCart);
  $cartOverlay.addEventListener("click", closeCart);

  // carrinho -> etapa de finalização (dentro do mesmo carrinho)
  $checkout.addEventListener("click", openCheckout);
  $cartBack.addEventListener("click", backToItems);
  $checkoutForm.addEventListener("submit", submitOrder);
  $checkoutForm
    .querySelectorAll('input[name="entrega"]')
    .forEach((r) => r.addEventListener("change", toggleEndereco));
  $checkoutForm
    .querySelectorAll('input[name="pagamento"]')
    .forEach((r) => r.addEventListener("change", toggleTroco));
  $checkoutForm
    .querySelectorAll('input[name="regiao"]')
    .forEach((r) => r.addEventListener("change", toggleRegiao));
  $("f-cidade").addEventListener("change", updateCheckoutTotals);
  $("f-semnumero").addEventListener("change", toggleSemNumero);

  // pop-up de produto
  $("prodClose").addEventListener("click", closeProduct);
  $prodOverlay.addEventListener("click", closeProduct);
  $("prodPrev").addEventListener("click", () => showGalleryImg(galleryIdx - 1));
  $("prodNext").addEventListener("click", () => showGalleryImg(galleryIdx + 1));
  $("prodAdd").addEventListener("click", () => {
    if (currentProductId) addToCart(currentProductId);
    closeProduct();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProduct();
      closeCart();
    }
    // setas navegam a galeria quando o pop-up está aberto
    if (!$prodModal.hidden && galleryImgs.length > 1) {
      if (e.key === "ArrowLeft") showGalleryImg(galleryIdx - 1);
      if (e.key === "ArrowRight") showGalleryImg(galleryIdx + 1);
    }
  });
  $search.addEventListener("input", (e) => {
    search = e.target.value;
    renderGrid();
  });

  /* ---------- TRAVA ANTI-ZOOM NO MOBILE (segurança p/ iOS Safari) ----------
     O iOS ignora "user-scalable=no" e em alguns casos o touch-action do CSS.
     Aqui bloqueamos: (1) zoom por toque-duplo rápido, (2) zoom por pinça
     (2+ dedos) e (3) os gestos nativos de zoom do WebKit. O toque/scroll
     normal de um dedo continua funcionando. */

  // (1) toque-duplo rápido (< 350ms) — o clique do toque único segue normal
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 350) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false }
  );

  // (2) pinça: cancela só o movimento com 2+ dedos (pinça de zoom).
  // OBS: e.scale só existe no Safari/iOS — no Android é undefined, então
  // NÃO podemos usar "e.scale !== 1" como condição (bloquearia todo o scroll
  // de um dedo no Android). Aqui só barramos quando há mais de um toque.
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1 || (typeof e.scale === "number" && e.scale !== 1))
        e.preventDefault();
    },
    { passive: false }
  );

  // (3) gestos nativos de zoom do WebKit (Safari iOS)
  ["gesturestart", "gesturechange", "gestureend"].forEach((evt) =>
    document.addEventListener(evt, (e) => e.preventDefault())
  );

  /* ---------- TEMA CLARO / ESCURO ---------- */
  const themeBtn = $("themeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const cur =
        document.documentElement.getAttribute("data-theme") === "light"
          ? "light"
          : "dark";
      const next = cur === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("lygllyz_theme", next);
      } catch (e) {}
    });
  }

  /* ---------- POP-UP DE BOAS-VINDAS (reaparece após 1h da última visita) ---------- */
  const $welcome = $("welcomeModal");
  const $welcomeOverlay = $("welcomeOverlay");
  if ($welcome && $welcomeOverlay) {
    const WELCOME_KEY = "lygllyz_welcome_last";
    const UMA_HORA = 60 * 60 * 1000; // 1 hora em ms
    const closeWelcome = () => {
      $welcome.hidden = true;
      $welcomeOverlay.hidden = true;
    };
    const openWelcome = () => {
      $welcome.hidden = false;
      $welcomeOverlay.hidden = false;
    };

    let lastSeen = 0;
    try {
      lastSeen = parseInt(localStorage.getItem(WELCOME_KEY), 10) || 0;
    } catch (e) {}

    // mostra se nunca viu OU se já passou 1h desde a última vez
    if (Date.now() - lastSeen >= UMA_HORA) {
      openWelcome();
      try {
        localStorage.setItem(WELCOME_KEY, String(Date.now()));
      } catch (e) {}
    }

    $("welcomeClose").addEventListener("click", closeWelcome);
    $welcomeOverlay.addEventListener("click", closeWelcome);
    $("welcomeContinue").addEventListener("click", closeWelcome);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeWelcome();
    });
  }

  // atalho "Ver tudo" da seção de categorias
  const catAllBtn = document.querySelector("[data-cat-all]");
  if (catAllBtn)
    catAllBtn.addEventListener("click", () => selectCategory("todos"));

  // menu de categorias (ícone de 3 pontos no topo)
  const $catMenuBtn = $("catMenuBtn");
  if ($catMenuBtn) {
    $catMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = $catMenuBtn.getAttribute("aria-expanded") === "true";
      open ? closeCatMenu() : openCatMenu();
    });
    // fecha ao clicar fora do menu
    document.addEventListener("click", (e) => {
      const menu = $("catMenu");
      if (!menu || menu.hidden) return;
      if (!menu.contains(e.target) && e.target !== $catMenuBtn)
        closeCatMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCatMenu();
    });
  }

  /* ---------- INIT ---------- */
  const $prodCount = $("prodCount");
  if ($prodCount) $prodCount.textContent = CONFIG.produtos.length;
  renderTabs();
  renderFooterCats();
  renderDestaques();
  renderPromos();
  renderGrid();
  renderCart();
  fillContact();
})();
