// REGISTRO DO SERVICE WORKER (ADICIONE NO TOPO DO SCRIPT.JS)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registrado com sucesso:', registration);
      })
      .catch(error => {
        console.log('Falha ao registrar o Service Worker:', error);
      });
  });
}


document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO ---
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwcmr19n7P5UpB_JilCz8t4Z8w7rwo6KankLXO_0cW26FcIFWKxOXBi-_yy5VOFvS-LDA/exec';

    // --- ESTADO GLOBAL ---
    let loggedInUser = null;
    let fullShoppingList = [];
    let categories = new Set();

    // --- SELETORES DE ELEMENTOS DOM ---
    const dom = {
        appContainer: document.querySelector('.app-container'), authContainer: document.getElementById('auth-container'),
        loginForm: document.getElementById('login-form'), registerForm: document.getElementById('register-form'),
        showRegister: document.getElementById('show-register'), showLogin: document.getElementById('show-login'),
        currentUserDisplay: document.getElementById('currentUserDisplay'), logoutBtn: document.getElementById('logoutBtn'),
        loading: document.getElementById('loading'), checkoutBtn: document.getElementById('checkoutBtn'),
        categoryFilter: document.getElementById('categoryFilter'), archiveFilter: document.getElementById('archiveFilter'),
        showPurchasedToggle: document.getElementById('showPurchasedToggle'), pendingList: document.getElementById('pending-list'),
        purchasedSection: document.getElementById('purchased-section'), purchasedList: document.getElementById('purchased-list'),
        archiveControls: document.getElementById('archive-controls'), archiveBtn: document.getElementById('archiveBtn'),
        mainListTitle: document.getElementById('main-list-title'), addItemBtn: document.getElementById('addItemBtn'),
        modal: document.getElementById('addItemModal'), closeBtn: document.querySelector('.close-btn'),
        addItemForm: document.getElementById('addItemForm'), itemName: document.getElementById('itemName'),
        itemQuantity: document.getElementById('itemQuantity'), itemUnit: document.getElementById('itemUnit'),
        itemCategory: document.getElementById('itemCategory'), totalsContainer: document.getElementById('totals-container')
    };

    // --- LÓGICA DE AUTENTICAÇÃO ---
    function handleLogin(e) { e.preventDefault(); const u = dom.loginForm.querySelector('#login-username').value.trim(); const p = dom.loginForm.querySelector('#login-password').value; if (!u || !p) { alert("Preencha usuário e senha."); return; } postData({ action: 'loginUser', payload: { username: u, password: p } }).then(r => { if (r && r.status === 'success') { loggedInUser = r.payload; localStorage.setItem('shoppingUser', JSON.stringify(loggedInUser)); showApp(); } }); }
    function handleRegister(e) { e.preventDefault(); const u = dom.registerForm.querySelector('#register-username').value.trim(); const p = dom.registerForm.querySelector('#register-password').value; if (!u || !p) { alert("Preencha usuário e senha."); return; } postData({ action: 'registerUser', payload: { username: u, password: p } }).then(r => { if (r && r.status === 'success') { alert('Usuário cadastrado com sucesso! Agora, faça o login.'); toggleAuthForms(); dom.registerForm.reset(); } }); }
    function handleLogout() { if (confirm('Tem certeza que deseja sair?')) { localStorage.removeItem('shoppingUser'); loggedInUser = null; location.reload(); } }
    function checkLoginStatus() { const u = localStorage.getItem('shoppingUser'); if (u) { loggedInUser = JSON.parse(u); showApp(); } else { showAuth(); } }
    function showApp() { dom.authContainer.style.display = 'none'; dom.appContainer.style.display = 'block'; if (dom.currentUserDisplay) dom.currentUserDisplay.textContent = `Olá, ${loggedInUser.username}`; if (dom.logoutBtn) dom.logoutBtn.style.display = 'inline-block'; initializeAppListeners(); fetchData(); }
    function showAuth() { dom.authContainer.style.display = 'flex'; dom.appContainer.style.display = 'none'; }
    function toggleAuthForms(e) { if (e) e.preventDefault(); const l = dom.loginForm.style.display !== 'none'; dom.loginForm.style.display = l ? 'none' : 'flex'; dom.registerForm.style.display = l ? 'flex' : 'none'; }

    // --- FUNÇÕES DE API ---
    async function postData(payload) { showLoading(true); let r = null; try { const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', cache: 'no-cache', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) }); r = await response.json(); if (r.status !== 'success') throw new Error(r.message); if (!payload.action.includes('User')) await fetchData(); } catch (error) { console.error("Erro:", error); alert(`Ocorreu um erro: ${error.message}`); } finally { showLoading(false); return r; } }
    async function fetchData() { showLoading(true); try { const response = await fetch(SCRIPT_URL); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); fullShoppingList = await response.json(); if(!Array.isArray(fullShoppingList)) { fullShoppingList = []; throw new Error("Os dados recebidos não são uma lista válida."); } populateArchiveFilter(); renderLists(); populateCategories(); } catch (error) { console.error("Erro:", error); alert("Não foi possível carregar a lista."); } finally { showLoading(false); } }

    // --- FUNÇÕES DE RENDERIZAÇÃO E UI ---
    function renderLists() {
        const selectedCategory = dom.categoryFilter.value; const archiveSelection = dom.archiveFilter.value;
        const listToDisplay = filterListByArchive(archiveSelection);
        dom.pendingList.innerHTML = ''; dom.purchasedList.innerHTML = ''; dom.purchasedSection.style.display = 'none'; dom.archiveControls.style.display = 'none';
        const listToRender = listToDisplay.filter(item => selectedCategory === 'all' || item.Categoria === selectedCategory).sort((a, b) => (a.Item || '').localeCompare(b.Item || ''));
        let hasPendingOrInCart = false, hasPurchased = false;
        listToRender.forEach(item => { const itemCard = createItemCard(item); if (['Pendente', 'No Carrinho', 'Arquivado'].includes(item.Status)) { dom.pendingList.appendChild(itemCard); hasPendingOrInCart = true; } else if (item.Status === 'Comprado') { dom.purchasedList.appendChild(itemCard); hasPurchased = true; } });
        if (archiveSelection === 'current') { dom.mainListTitle.innerHTML = `<i class="fas fa-list-check"></i> Itens da Lista / Carrinho`; if (hasPurchased) { dom.purchasedSection.style.display = 'block'; dom.archiveControls.style.display = 'flex'; } } else { dom.mainListTitle.textContent = `Histórico de ${dom.archiveFilter.options[dom.archiveFilter.selectedIndex].text}`; }
        if (!hasPendingOrInCart && !hasPurchased) { dom.pendingList.innerHTML = '<p>Nenhum item encontrado para esta visualização.</p>'; }
        renderTotals(listToDisplay);
    }
    function filterListByArchive(selection) { if (selection === 'current') return fullShoppingList.filter(i => i.Status !== 'Arquivado'); const [year, month] = selection.split('-').map(Number); return fullShoppingList.filter(i => { if (i.Status !== 'Arquivado' || !i.CompradoEm) return false; const itemDate = new Date(i.CompradoEm); return itemDate.getFullYear() === year && (itemDate.getMonth() + 1) === month; }); }
    function renderTotals(list) {
        let cartTotal = 0, purchasedTotal = 0;
        list.forEach(i => { const price = parseFloat(i.Preco) || 0; const quantity = parseFloat(i.Quantidade) || 1; if (i.Status === 'No Carrinho') cartTotal += (price * quantity); else if (['Comprado', 'Arquivado'].includes(i.Status)) purchasedTotal += (price * quantity); });
        dom.totalsContainer.innerHTML = `<div class="total-box"><h3>Total no Carrinho</h3><p>R$ ${cartTotal.toFixed(2).replace('.', ',')}</p></div><div class="total-box purchased"><h3>Total da FACADA</h3><p>R$ ${purchasedTotal.toFixed(2).replace('.', ',')}</p></div>`;
    }
    function createItemCard(item) {
        const div = document.createElement('div'); div.className = 'list-item'; div.dataset.id = item.ID; div.dataset.category = item.Categoria; div.dataset.status = item.Status;
        let actionsHtml = '', priceHtml = '';
        const displayQuantity = `${item.Quantidade || 1} ${item.Unidade || ''}`.trim();
        if (item.Status === 'Pendente') { actionsHtml = '<button class="add-to-cart-btn"><i class="fas fa-cart-plus"></i> Por no Carrinho</button>'; }
        else if (item.Status === 'No Carrinho') { priceHtml = `<p class="item-price" style="font-size:1.4rem;font-weight:600;">R$ ${parseFloat(item.Preco||0).toFixed(2).replace('.',',')}</p>`; actionsHtml = '<button class="edit-price-btn"><i class="fas fa-pencil-alt"></i> Editar Preço</button>'; }
        else if (item.Status === 'Arquivado') { priceHtml = `<p class="item-price" style="font-size:1.2rem;font-weight:600;">R$ ${parseFloat(item.Preco||0).toFixed(2).replace('.',',')}</p>`; }
        const pInfo = ['Comprado', 'Arquivado'].includes(item.Status) ? `<span><i class="fas fa-check"></i> Por: <strong>${item.CompradoPor}</strong> em ${new Date(item.CompradoEm).toLocaleDateString('pt-BR')}</span>` : `<span><i class="fas fa-user"></i> Por: <strong>${item.AdicionadoPor}</strong></span>`;
        div.innerHTML = `<div class="item-main"><div style="display:flex;justify-content:space-between;align-items:flex-start;"><div><p class="item-name">${item.Item}</p><p class="item-quantity">${displayQuantity}</p></div>${priceHtml}</div></div><div class="item-meta">${pInfo}<span><i class="fas fa-tag"></i> Cat: <strong>${item.Categoria}</strong></span></div><div class="item-actions">${actionsHtml}<button class="delete-btn" title="Excluir"><i class="fas fa-trash"></i></button></div>`;
        return div;
    }
    function populateCategories() { const v = dom.categoryFilter.value; categories.clear(); fullShoppingList.forEach(i => { if (i.Categoria) categories.add(i.Categoria) }); dom.categoryFilter.innerHTML = '<option value="all">Categorias</option>'; [...categories].sort().forEach(c => { dom.categoryFilter.innerHTML += `<option value="${c}">${c}</option>`; }); dom.categoryFilter.value = v; }
    function populateArchiveFilter() { const m = new Map(); fullShoppingList.forEach(i => { if (i.Status === 'Arquivado' && i.CompradoEm) { const d = new Date(i.CompradoEm); if (d.toString() !== 'Invalid Date') { const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; if (!m.has(k)) { m.set(k, d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })); } } } }); const c = dom.archiveFilter.value; dom.archiveFilter.innerHTML = '<option value="current">Compras Atuais</option>'; [...m.entries()].sort().reverse().forEach(([k, v]) => { const cap = v.charAt(0).toUpperCase() + v.slice(1); dom.archiveFilter.innerHTML += `<option value="${k}">${cap}</option>`; }); dom.archiveFilter.value = c; }
    function updateVisibility() { dom.purchasedSection.style.display = dom.showPurchasedToggle.checked && dom.purchasedList.children.length > 0 ? 'block' : 'none'; }
    function showLoading(isLoading) { dom.loading.style.display = isLoading ? 'block' : 'none'; }
    
    // --- MANIPULADORES DE EVENTOS ---
    function handleListClick(e) {
        const button = e.target.closest('button'); if (!button) return;
        const card = e.target.closest('.list-item'); 
        if (!card) return;
        const id = card.dataset.id;
        if (['add-to-cart-btn', 'edit-price-btn'].some(c => button.classList.contains(c))) {
            const item = fullShoppingList.find(i => i.ID === id);
            const price = item && item.Preco > 0 ? item.Preco : '';
            const newPrice = prompt(`Preço UNITÁRIO de "${item.Item}"?`, price);
            if (newPrice !== null) {
                const n = parseFloat(newPrice.replace(',', '.'));
                if (!isNaN(n) && n >= 0) { postData({ action: 'moveToCart', id, price: n }); }
                else { alert('Insira um número válido.'); }
            }
        } else if (button.classList.contains('delete-btn')) {
            if (confirm('Excluir este item permanentemente?')) { postData({ action: 'deleteItem', id }); }
        }
    }
    function handleFormSubmit(e) { e.preventDefault(); const item = { name: dom.itemName.value.trim(), quantity: dom.itemQuantity.value || 1, unit: dom.itemUnit.value.trim(), category: dom.itemCategory.value, addedBy: loggedInUser.username }; if (item.name && item.category) { postData({ action: 'addItem', item }); dom.modal.style.display = "none"; dom.addItemForm.reset(); } else { alert('Preencha nome e categoria.'); } }
    function handleCheckout() { const num = fullShoppingList.filter(i => i.Status === 'No Carrinho').length; if (num === 0) { alert("Não há itens no carrinho."); return; } if (confirm(`Finalizar compra de ${num} item(ns)?`)) { postData({ action: 'checkout', purchasedBy: loggedInUser.username }); } }
    function handleArchive() { if (confirm("Arquivar itens comprados?")) { postData({ action: 'archivePurchased' }); } }

    // --- INICIALIZAÇÃO ---
    let appListenersInitialized = false;
    // CORREÇÃO DEFINITIVA: Função à prova de falhas
    function initializeAppListeners() {
        if (appListenersInitialized) return;
        
        if (dom.checkoutBtn) dom.checkoutBtn.addEventListener('click', handleCheckout);
        if (dom.archiveBtn) dom.archiveBtn.addEventListener('click', handleArchive);
        if (dom.archiveFilter) dom.archiveFilter.addEventListener('change', renderLists);
        if (dom.showPurchasedToggle) dom.showPurchasedToggle.addEventListener('change', renderLists);
        if (dom.categoryFilter) dom.categoryFilter.addEventListener('change', renderLists);
        if (dom.pendingList) dom.pendingList.addEventListener('click', handleListClick);
        if (dom.purchasedList) dom.purchasedList.addEventListener('click', handleListClick);
        if (dom.addItemBtn) dom.addItemBtn.addEventListener('click', () => { dom.addItemForm.reset(); dom.itemQuantity.value = 1; dom.modal.style.display = 'block'; });
        if (dom.closeBtn) dom.closeBtn.addEventListener('click', () => dom.modal.style.display = 'none');
        if (window) window.addEventListener('click', (e) => { if (e.target == dom.modal) dom.modal.style.display = "none"; });
        if (dom.addItemForm) dom.addItemForm.addEventListener('submit', handleFormSubmit);
        
        appListenersInitialized = true;
    }
    
    function init() {
        if (!SCRIPT_URL || SCRIPT_URL === 'COLE_AQUI_O_SEU_NOVO_URL_DA_API') { alert('ERRO: Configure o SCRIPT_URL no script.js.'); return; }
        
        if (dom.loginForm) dom.loginForm.addEventListener('submit', handleLogin);
        if (dom.registerForm) dom.registerForm.addEventListener('submit', handleRegister);
        if (dom.showRegister) dom.showRegister.addEventListener('click', toggleAuthForms);
        if (dom.showLogin) dom.showLogin.addEventListener('click', toggleAuthForms);
        if (dom.logoutBtn) dom.logoutBtn.addEventListener('click', handleLogout);
        
        checkLoginStatus();
    }
    init();
});


