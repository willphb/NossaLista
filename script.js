document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO ---
    // Verifique se o seu URL da API está correto aqui
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwhrDcZV-v0o1PCiWBYiaTsZ5LTSEwT5hp20adxFPxN0IBkeOPEJ3N98icmv4XUc3bacw/exec';

    // --- ESTADO GLOBAL ---
    let loggedInUser = null;
    let fullShoppingList = [];
    let categories = new Set();

    // --- SELETORES DE ELEMENTOS DOM ---
    const dom = {
        appContainer: document.querySelector('.app-container'),
        authContainer: document.getElementById('auth-container'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        showRegister: document.getElementById('show-register'),
        showLogin: document.getElementById('show-login'),
        currentUserDisplay: document.getElementById('currentUserDisplay'),
        logoutBtn: document.getElementById('logoutBtn'),
        loading: document.getElementById('loading'),
        checkoutBtn: document.getElementById('checkoutBtn'),
        categoryFilter: document.getElementById('categoryFilter'),
        archiveFilter: document.getElementById('archiveFilter'),
        showPurchasedToggle: document.getElementById('showPurchasedToggle'),
        pendingList: document.getElementById('pending-list'),
        purchasedSection: document.getElementById('purchased-section'),
        purchasedList: document.getElementById('purchased-list'),
        archiveControls: document.getElementById('archive-controls'),
        archiveBtn: document.getElementById('archiveBtn'),
        mainListTitle: document.getElementById('main-list-title'),
        addItemBtn: document.getElementById('addItemBtn'),
        modal: document.getElementById('addItemModal'),
        closeBtn: document.querySelector('.close-btn'),
        addItemForm: document.getElementById('addItemForm'),
        itemName: document.getElementById('itemName'),
        itemQuantity: document.getElementById('itemQuantity'),
        itemCategory: document.getElementById('itemCategory'),
        totalsContainer: document.getElementById('totals-container')
    };

    // --- LÓGICA DE AUTENTICAÇÃO ---
    function handleLogin(e) {
        e.preventDefault();
        const username = dom.loginForm.querySelector('#login-username').value;
        const password = dom.loginForm.querySelector('#login-password').value;
        postData({ action: 'loginUser', payload: { username, password } })
            .then(result => {
                if (result && result.status === 'success') {
                    loggedInUser = result.payload;
                    localStorage.setItem('shoppingUser', JSON.stringify(loggedInUser));
                    showApp();
                }
            });
    }

    function handleRegister(e) {
        e.preventDefault();
        const username = dom.registerForm.querySelector('#register-username').value;
        const password = dom.registerForm.querySelector('#register-password').value;
        postData({ action: 'registerUser', payload: { username, password } })
            .then(result => {
                if (result && result.status === 'success') {
                    alert('Usuário cadastrado com sucesso! Agora, por favor, faça o login.');
                    toggleAuthForms();
                    dom.registerForm.reset();
                }
            });
    }

    function handleLogout() {
        if (confirm('Tem certeza que deseja sair?')) {
            localStorage.removeItem('shoppingUser');
            loggedInUser = null;
            location.reload();
        }
    }

    function checkLoginStatus() {
        const user = localStorage.getItem('shoppingUser');
        if (user) {
            loggedInUser = JSON.parse(user);
            showApp();
        } else {
            showAuth();
        }
    }

    function showApp() {
        dom.authContainer.style.display = 'none';
        dom.appContainer.style.display = 'block';
        if (dom.currentUserDisplay) dom.currentUserDisplay.textContent = `Olá, ${loggedInUser.username}`;
        if (dom.logoutBtn) dom.logoutBtn.style.display = 'inline-block';
        initializeAppListeners();
        fetchData();
    }

    function showAuth() {
        dom.authContainer.style.display = 'flex';
        dom.appContainer.style.display = 'none';
    }

    function toggleAuthForms(e) {
        if (e) e.preventDefault();
        const isLoginVisible = dom.loginForm.style.display !== 'none';
        dom.loginForm.style.display = isLoginVisible ? 'none' : 'flex';
        dom.registerForm.style.display = isLoginVisible ? 'flex' : 'none';
    }

    // --- FUNÇÕES DE API ---
    async function postData(payload) {
        showLoading(true);
        let result = null;
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);
            // Se a ação for de usuário, apenas retorna o resultado para o .then()
            if (payload.action.includes('User')) return result;
            // Para outras ações, busca os dados atualizados
            await fetchData();
        } catch (error) {
            console.error("Erro ao enviar dados:", error);
            alert(`Ocorreu um erro: ${error.message}`);
        } finally {
            showLoading(false);
            return result; // Retorna o resultado para login/register
        }
    }

    async function fetchData() {
        showLoading(true);
        try {
            const response = await fetch(SCRIPT_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            fullShoppingList = await response.json();
            populateArchiveFilter();
            renderLists();
            populateCategories();
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            alert("Não foi possível carregar a lista.");
        } finally {
            showLoading(false);
        }
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO E UI ---
    function renderLists() {
        const selectedCategory = dom.categoryFilter.value;
        const archiveSelection = dom.archiveFilter.value;
        const listToDisplay = filterListByArchive(archiveSelection);

        dom.pendingList.innerHTML = '';
        dom.purchasedList.innerHTML = '';
        dom.purchasedSection.style.display = 'none';
        dom.archiveControls.style.display = 'none';

        const listToRender = listToDisplay.filter(item => selectedCategory === 'all' || item.Categoria === item.Categoria).sort((a, b) => (a.Item || '').localeCompare(b.Item || ''));
        
        let hasPendingOrInCart = false;
        let hasPurchased = false;

        listToRender.forEach(item => {
            const itemCard = createItemCard(item);
            if (['Pendente', 'No Carrinho', 'Arquivado'].includes(item.Status)) {
                dom.pendingList.appendChild(itemCard);
                hasPendingOrInCart = true;
            } else if (item.Status === 'Comprado') {
                dom.purchasedList.appendChild(itemCard);
                hasPurchased = true;
            }
        });

        if (archiveSelection === 'current') {
            dom.mainListTitle.innerHTML = `<i class="fas fa-list-check"></i> Itens da Lista / Carrinho`;
            if (hasPurchased) {
                dom.purchasedSection.style.display = 'block';
                dom.archiveControls.style.display = 'flex';
            }
        } else {
            const selectedText = dom.archiveFilter.options[dom.archiveFilter.selectedIndex].text;
            dom.mainListTitle.textContent = `Histórico de ${selectedText}`;
        }

        if (!hasPendingOrInCart && !hasPurchased) {
            dom.pendingList.innerHTML = '<p>Nenhum item encontrado para esta visualização.</p>';
        }

        renderTotals(listToDisplay);
    }

    function filterListByArchive(selection) {
        if (selection === 'current') {
            return fullShoppingList.filter(item => item.Status !== 'Arquivado');
        }
        const [year, month] = selection.split('-').map(Number);
        return fullShoppingList.filter(item => {
            if (item.Status !== 'Arquivado' || !item.CompradoEm) return false;
            const itemDate = new Date(item.CompradoEm);
            return itemDate.getFullYear() === year && (itemDate.getMonth() + 1) === month;
        });
    }

    function renderTotals(list) {
        let cartTotal = 0, purchasedTotal = 0;
        list.forEach(item => {
            const price = parseFloat(item.Preco);
            if (!isNaN(price)) {
                if (item.Status === 'No Carrinho') cartTotal += price;
                else if (['Comprado', 'Arquivado'].includes(item.Status)) purchasedTotal += price;
            }
        });
        dom.totalsContainer.innerHTML = `<div class="total-box"><h3>Total no Carrinho</h3><p>R$ ${cartTotal.toFixed(2).replace('.', ',')}</p></div><div class="total-box purchased"><h3>Total Gasto (na Vista)</h3><p>R$ ${purchasedTotal.toFixed(2).replace('.', ',')}</p></div>`;
    }

    function createItemCard(item) {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.dataset.id = item.ID;
        div.dataset.category = item.Categoria;
        div.dataset.status = item.Status;

        let actionsHtml = '';
        let priceHtml = '';

        if (item.Status === 'Pendente') {
            actionsHtml = '<button class="add-to-cart-btn"><i class="fas fa-cart-plus"></i> Por no Carrinho</button>';
        } else if (item.Status === 'No Carrinho') {
            priceHtml = `<p class="item-price" style="font-size:1.4rem;font-weight:600;">R$ ${parseFloat(item.Preco || 0).toFixed(2).replace(',', '.')}</p>`;
            actionsHtml = '<button class="edit-price-btn"><i class="fas fa-pencil-alt"></i> Editar Preço</button>';
        } else if (item.Status === 'Arquivado') {
            priceHtml = `<p class="item-price" style="font-size:1.2rem;font-weight:600;">R$ ${parseFloat(item.Preco || 0).toFixed(2).replace(',', '.')}</p>`;
        }

        const purchasedInfo = item.Status === 'Comprado' || item.Status === 'Arquivado' ?
            `<span><i class="fas fa-check"></i> Por: <strong>${item.CompradoPor}</strong> em ${new Date(item.CompradoEm).toLocaleDateString('pt-BR')}</span>` :
            `<span><i class="fas fa-user"></i> Por: <strong>${item.AdicionadoPor}</strong></span>`;

        div.innerHTML = `
            <div class="item-main">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div><p class="item-name">${item.Item}</p><p class="item-quantity">${item.Quantidade}</p></div>
                    ${priceHtml}
                </div>
            </div>
            <div class="item-meta">${purchasedInfo}<span><i class="fas fa-tag"></i> Cat: <strong>${item.Categoria}</strong></span></div>
            <div class="item-actions">${actionsHtml}<button class="delete-btn" title="Excluir"><i class="fas fa-trash"></i></button></div>`;
        return div;
    }

    function populateCategories() {
        const currentFilterValue = dom.categoryFilter.value;
        categories.clear();
        fullShoppingList.forEach(item => { if (item.Categoria) categories.add(item.Categoria) });
        dom.categoryFilter.innerHTML = '<option value="all">Todas as Categorias</option>';
        [...categories].sort().forEach(cat => { dom.categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`; });
        dom.categoryFilter.value = currentFilterValue;
    }

    function populateArchiveFilter() {
        const months = new Map();
        fullShoppingList.forEach(item => {
            if (item.Status === 'Arquivado' && item.CompradoEm) {
                const date = new Date(item.CompradoEm);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!months.has(key)) {
                    months.set(key, date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }));
                }
            }
        });
        const currentSelection = dom.archiveFilter.value;
        dom.archiveFilter.innerHTML = '<option value="current">Compras Atuais</option>';
        [...months.entries()].sort().reverse().forEach(([key, value]) => {
            const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
            dom.archiveFilter.innerHTML += `<option value="${key}">${capitalizedValue}</option>`;
        });
        dom.archiveFilter.value = currentSelection;
    }

    function updateVisibility() {
        dom.purchasedSection.style.display = dom.showPurchasedToggle.checked && dom.purchasedList.children.length > 0 ? 'block' : 'none';
    }

    function showLoading(isLoading) {
        dom.loading.style.display = isLoading ? 'block' : 'none';
    }

    // --- MANIPULADORES DE EVENTOS ---
    function handleListClick(e) {
        const button = e.target.closest('button');
        if (!button) return;
        
        // CORREÇÃO CRÍTICA: A classe do card é .list-item
        const card = e.target.closest('.list-item');
        if (!card) return; // Se o clique não foi dentro de um card, ignora.

        const id = card.dataset.id;
        
        if (['add-to-cart-btn', 'edit-price-btn'].some(c => button.classList.contains(c))) {
            const item = fullShoppingList.find(i => i.ID === id);
            const currentPrice = item && item.Preco > 0 ? item.Preco : '';
            const newPriceStr = prompt(`Qual o preço de "${item.Item}"?`, currentPrice);
            if (newPriceStr !== null) {
                const newPriceNum = parseFloat(newPriceStr.replace(',', '.'));
                if (!isNaN(newPriceNum) && newPriceNum >= 0) {
                    postData({ action: 'moveToCart', id: id, price: newPriceNum });
                } else {
                    alert('Por favor, insira um número válido para o preço.');
                }
            }
        } else if (button.classList.contains('delete-btn')) {
            if (confirm('Excluir este item permanentemente?')) {
                postData({ action: 'deleteItem', id: id });
            }
        }
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const newItem = {
            name: dom.itemName.value.trim(),
            quantity: dom.itemQuantity.value.trim(),
            category: dom.itemCategory.value,
            addedBy: loggedInUser.username
        };
        if (newItem.name && newItem.quantity && newItem.category) {
            postData({ action: 'addItem', item: newItem });
            dom.modal.style.display = "none";
            dom.addItemForm.reset();
        } else {
            alert('Por favor, preencha todos os campos.');
        }
    }

    function handleCheckout() {
        const itemsInCart = fullShoppingList.filter(i => i.Status === 'No Carrinho').length;
        if (itemsInCart === 0) {
            alert("Não há itens no seu carrinho para finalizar.");
            return;
        }
        if (confirm(`Finalizar a compra de ${itemsInCart} item(ns)?`)) {
            postData({ action: 'checkout', purchasedBy: loggedInUser.username });
        }
    }

    function handleArchive() {
        if (confirm("Arquivar todos os itens já comprados? Eles poderão ser consultados no filtro de histórico.")) {
            postData({ action: 'archivePurchased' });
        }
    }

    // --- INICIALIZAÇÃO ---
    let appListenersInitialized = false;
    function initializeAppListeners() {
        if (appListenersInitialized) return;
        dom.checkoutBtn.addEventListener('click', handleCheckout);
        dom.archiveBtn.addEventListener('click', handleArchive);
        dom.archiveFilter.addEventListener('change', renderLists);
        dom.showPurchasedToggle.addEventListener('change', updateVisibility); // Corrigido para chamar a função certa
        dom.categoryFilter.addEventListener('change', renderLists);
        dom.pendingList.addEventListener('click', handleListClick);
        dom.purchasedList.addEventListener('click', handleListClick);
        dom.addItemBtn.addEventListener('click', () => dom.modal.style.display = 'block');
        dom.closeBtn.addEventListener('click', () => dom.modal.style.display = 'none');
        window.addEventListener('click', (e) => { if (e.target == dom.modal) dom.modal.style.display = "none"; });
        dom.addItemForm.addEventListener('submit', handleFormSubmit);
        appListenersInitialized = true;
    }
    
    function init() {
        if (!SCRIPT_URL || SCRIPT_URL === 'COLE_AQUI_O_SEU_NOVO_URL_DA_API') {
             alert('ERRO: Configure o SCRIPT_URL no arquivo script.js.');
             return;
        }
        if (dom.loginForm) dom.loginForm.addEventListener('submit', handleLogin);
        if (dom.registerForm) dom.registerForm.addEventListener('submit', handleRegister);
        if (dom.showRegister) dom.showRegister.addEventListener('click', toggleAuthForms);
        if (dom.showLogin) dom.showLogin.addEventListener('click', toggleAuthForms);
        if (dom.logoutBtn) dom.logoutBtn.addEventListener('click', handleLogout);
        
        checkLoginStatus();
    }
    init();
});

