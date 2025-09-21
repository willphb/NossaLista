document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO ---
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznANogLX1rE3WAelxxgyyTxDfLDzdlUvCFyvcTeanY1N0Y9nvlScYIJTT1qsof7sMJng/exec';

    // --- ESTADO DA APLICAÇÃO ---
    let fullShoppingList = [];
    let categories = new Set();

    // --- SELETORES DE ELEMENTOS DOM ---
    const dom = {
        loading: document.getElementById('loading'),
        currentUser: document.getElementById('currentUser'),
        addItemBtn: document.getElementById('addItemBtn'),
        checkoutBtn: document.getElementById('checkoutBtn'),
        categoryFilter: document.getElementById('categoryFilter'),
        showPurchasedToggle: document.getElementById('showPurchasedToggle'),
        exportCsvBtn: document.getElementById('exportCsvBtn'),
        pendingList: document.getElementById('pending-list'),
        purchasedSection: document.getElementById('purchased-section'),
        purchasedList: document.getElementById('purchased-list'),
        modal: document.getElementById('addItemModal'),
        closeBtn: document.querySelector('.close-btn'),
        addItemForm: document.getElementById('addItemForm'),
        itemName: document.getElementById('itemName'),
        itemQuantity: document.getElementById('itemQuantity'),
        itemCategory: document.getElementById('itemCategory'),
        totalsContainer: document.getElementById('totals-container')
    };

    // --- FUNÇÕES DE API ---
    async function fetchData() {
        showLoading(true);
        try {
            const response = await fetch(SCRIPT_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            fullShoppingList = await response.json();
            renderLists();
            populateCategories();
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            alert("Não foi possível carregar a lista.");
        } finally {
            showLoading(false);
        }
    }

   // VERSÃO CORRIGIDA - Substitua a sua função postData por esta

async function postData(payload) {
    showLoading(true);
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            // A LINHA ABAIXO É A CORREÇÃO. Ela especifica o formato do envio.
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.status !== 'success') {
            // Mostra uma mensagem de erro mais detalhada vinda do script
            throw new Error(result.message || 'Erro desconhecido no script.');
        }
        await fetchData();
    } catch (error) {
        console.error("Erro ao enviar dados:", error);
        // O alerta agora pode mostrar uma mensagem mais útil
        alert("Ocorreu um erro ao salvar a alteração: " + error.message);
    } finally {
        showLoading(false);
    }
}

    // --- FUNÇÕES DE RENDERIZAÇÃO E UI ---
    function renderLists() {
        dom.pendingList.innerHTML = '';
        dom.purchasedList.innerHTML = '';
        
        const selectedCategory = dom.categoryFilter.value;
        const listToRender = fullShoppingList
            .filter(item => selectedCategory === 'all' || item.Categoria === selectedCategory)
            .sort((a, b) => (a.Item || '').localeCompare(b.Item || ''));

        let pendingItemsExist = false;
        listToRender.forEach(item => {
            const itemCard = createItemCard(item);
            if (item.Status === 'Pendente' || item.Status === 'No Carrinho') {
                dom.pendingList.appendChild(itemCard);
                pendingItemsExist = true;
            } else if (item.Status === 'Comprado') {
                dom.purchasedList.appendChild(itemCard);
            }
        });
        
        if (!pendingItemsExist && selectedCategory === 'all') {
            dom.pendingList.innerHTML = '<p>Sua lista está vazia. Adicione um item!</p>';
        }

        updateVisibility();
        renderTotals();
    }

    function renderTotals() {
        let cartTotal = 0;
        let purchasedTotal = 0;

        fullShoppingList.forEach(item => {
            const price = parseFloat(item.Preco);
            if (!isNaN(price)) {
                if (item.Status === 'No Carrinho') cartTotal += price;
                else if (item.Status === 'Comprado') purchasedTotal += price;
            }
        });

        dom.totalsContainer.innerHTML = `
            <div class="total-box"><h3>Total no Carrinho</h3><p>R$ ${cartTotal.toFixed(2).replace('.', ',')}</p></div>
            <div class="total-box purchased"><h3>Total Gasto (Histórico)</h3><p>R$ ${purchasedTotal.toFixed(2).replace('.', ',')}</p></div>
        `;
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
            actionsHtml = '<button class="add-to-cart-btn"><i class="fas fa-cart-plus"></i> Colocar no Carrinho</button>';
        } else if (item.Status === 'No Carrinho') {
            const formattedPrice = `R$ ${parseFloat(item.Preco || 0).toFixed(2).replace('.', ',')}`;
            priceHtml = `<p class="item-price" style="font-size: 1.4rem; font-weight: 600; color: #333;">${formattedPrice}</p>`;
            actionsHtml = '<button class="edit-price-btn"><i class="fas fa-pencil-alt"></i> Editar Preço</button>';
        }

        const purchasedInfo = item.Status === 'Comprado' ? `<span><i class="fas fa-check"></i> Por: <strong>${item.CompradoPor}</strong> em ${new Date(item.CompradoEm).toLocaleDateString('pt-BR')}</span>` : `<span><i class="fas fa-user"></i> Por: <strong>${item.AdicionadoPor}</strong></span>`;

        div.innerHTML = `
            <div class="item-main">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div><p class="item-name">${item.Item}</p><p class="item-quantity">${item.Quantidade}</p></div>
                    ${priceHtml}
                </div>
            </div>
            <div class="item-meta">${purchasedInfo}<span><i class="fas fa-tag"></i> Cat: <strong>${item.Categoria}</strong></span></div>
            <div class="item-actions">${actionsHtml}<button class="delete-btn"><i class="fas fa-trash"></i></button></div>
        `;
        return div;
    }

    function populateCategories() {
        const currentFilterValue = dom.categoryFilter.value;
        categories.clear();
        fullShoppingList.forEach(item => { if (item.Categoria) categories.add(item.Categoria) });
        dom.categoryFilter.innerHTML = '<option value="all">Todas as Categorias</option>';
        [...categories].sort().forEach(cat => {
            dom.categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
        dom.categoryFilter.value = currentFilterValue;
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
        
        const card = e.target.closest('.list-item');
        const id = card.dataset.id;
        
        if (button.classList.contains('add-to-cart-btn') || button.classList.contains('edit-price-btn')) {
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
            if (confirm('Tem certeza que deseja excluir este item?')) {
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
            addedBy: dom.currentUser.value
        };
        if (newItem.name && newItem.quantity && newItem.category) {
            postData({ action: 'addItem', item: newItem });
            dom.modal.style.display = "none";
            dom.addItemForm.reset();
        } else {
            alert('Por favor, preencha nome, quantidade e categoria.');
        }
    }
    
    function handleCheckout() {
        const itemsInCart = fullShoppingList.filter(item => item.Status === 'No Carrinho').length;
        if (itemsInCart === 0) {
            alert("Não há itens no seu carrinho para finalizar.");
            return;
        }
        
        if (confirm(`Finalizar a compra de ${itemsInCart} item(ns)? Eles serão movidos para o histórico.`)) {
            postData({ action: 'checkout', purchasedBy: dom.currentUser.value });
        }
    }

    function setupEventListeners() {
        dom.addItemBtn.addEventListener('click', () => dom.modal.style.display = 'block');
        dom.checkoutBtn.addEventListener('click', handleCheckout);
        dom.closeBtn.addEventListener('click', () => dom.modal.style.display = 'none');
        window.addEventListener('click', (e) => { if (e.target == dom.modal) dom.modal.style.display = "none"; });
        dom.addItemForm.addEventListener('submit', handleFormSubmit);
        dom.showPurchasedToggle.addEventListener('change', renderLists);
        dom.categoryFilter.addEventListener('change', renderLists);
        dom.pendingList.addEventListener('click', handleListClick);
        dom.purchasedList.addEventListener('click', handleListClick);
    }

    // --- INICIALIZAÇÃO ---
    function init() {
        if (!SCRIPT_URL || SCRIPT_URL === 'COLE_AQUI_O_SEU_URL_DO_APP_DA_WEB') {
             alert('ERRO: Configure o SCRIPT_URL no arquivo script.js.');
             return;
        }
        setupEventListeners();
        fetchData();
        setInterval(fetchData, 30000);
    }

    init();
});

