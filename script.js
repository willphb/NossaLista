document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO ---
    // !!! IMPORTANTE: Cole aqui o URL do seu App da Web do Google Apps Script !!!
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznANogLX1rE3WAelxxgyyTxDfLDzdlUvCFyvcTeanY1N0Y9nvlScYIJTT1qsof7sMJng/exec';

    // --- ESTADO DA APLICAÇÃO ---
    let fullShoppingList = [];
    let categories = new Set();

    // --- SELETORES DE ELEMENTOS DOM ---
    const dom = {
        loading: document.getElementById('loading'),
        currentUser: document.getElementById('currentUser'),
        addItemBtn: document.getElementById('addItemBtn'),
        checkoutBtn: document.getElementById('checkoutBtn'), // Botão Finalizar Compra
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
        itemPrice: document.getElementById('itemPrice'),
        itemCategory: document.getElementById('itemCategory'),
        totalsContainer: document.getElementById('totals-container')
    };

    // --- FUNÇÕES DE API ---

    async function fetchData() {
        showLoading(true);
        try {
            const response = await fetch(SCRIPT_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            fullShoppingList = data;
            populateCategories();
            renderLists();
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            alert("Não foi possível carregar a lista. Verifique o console para mais detalhes.");
        } finally {
            showLoading(false);
        }
    }

    async function postData(payload) {
        showLoading(true);
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                credentials: 'omit',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow',
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);
            await fetchData();
        } catch (error) {
            console.error("Erro ao enviar dados:", error);
            alert("Ocorreu um erro ao salvar a alteração. Tente novamente.");
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
            dom.pendingList.innerHTML = '<p>Nenhum item na lista. Adicione um!</p>';
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
                if (item.Status === 'No Carrinho') {
                    cartTotal += price;
                } else if (item.Status === 'Comprado') {
                    purchasedTotal += price;
                }
            }
        });

        dom.totalsContainer.innerHTML = `
            <div class="total-box">
                <h3>Total no Carrinho</h3>
                <p>R$ ${cartTotal.toFixed(2).replace('.', ',')}</p>
            </div>
            <div class="total-box purchased">
                <h3>Total Gasto (Histórico)</h3>
                <p>R$ ${purchasedTotal.toFixed(2).replace('.', ',')}</p>
            </div>
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
            actionsHtml = '<button class="add-price-btn"><i class="fas fa-dollar-sign"></i> Adicionar Preço</button>';
        } else if (item.Status === 'No Carrinho') {
            const formattedPrice = `R$ ${parseFloat(item.Preco || 0).toFixed(2).replace('.', ',')}`;
            priceHtml = `<p class="item-price" style="font-size: 1.4rem; font-weight: 600; color: #333;">${formattedPrice}</p>`;
            actionsHtml = '<button class="edit-price-btn"><i class="fas fa-pencil-alt"></i> Editar Preço</button>';
        }

        const purchasedInfo = item.Status === 'Comprado' ?
            `<span><i class="fas fa-check"></i> Comprado por: <strong>${item.CompradoPor}</strong></span>
             <span><i class="fas fa-clock"></i> Em: ${new Date(item.CompradoEm).toLocaleString('pt-BR')}</span>` : '';

        div.innerHTML = `
            <div class="item-main">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <p class="item-name">${item.Item}</p>
                        <p class="item-quantity">${item.Quantidade}</p>
                    </div>
                    ${priceHtml}
                </div>
            </div>
            <div class="item-meta">
                <span><i class="fas fa-user"></i> Adicionado por: <strong>${item.AdicionadoPor}</strong></span>
                <span><i class="fas fa-tag"></i> Categoria: <strong>${item.Categoria}</strong></span>
                ${purchasedInfo}
            </div>
            <div class="item-actions">
                ${actionsHtml}
                <button class="delete-btn"><i class="fas fa-trash"></i> Excluir</button>
            </div>
        `;
        return div;
    }

    function populateCategories() {
        categories.clear();
        fullShoppingList.forEach(item => {
            if (item.Categoria) categories.add(item.Categoria);
        });
        
        const currentFilterValue = dom.categoryFilter.value;
        dom.categoryFilter.innerHTML = '<option value="all">Todas as Categorias</option>';
        [...categories].sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            dom.categoryFilter.appendChild(option);
        });
        dom.categoryFilter.value = currentFilterValue;
    }

    function updateVisibility() {
        const showPurchased = dom.showPurchasedToggle.checked;
        dom.purchasedSection.style.display = showPurchased && dom.purchasedList.children.length > 0 ? 'block' : 'none';
    }

    function showLoading(isLoading) {
        dom.loading.style.display = isLoading ? 'block' : 'none';
    }

    function exportToCsv() {
        const headers = ['ID', 'Item', 'Quantidade', 'Preco', 'Categoria', 'AdicionadoPor', 'Status', 'CompradoPor', 'CompradoEm'];
        const rows = fullShoppingList.map(item => 
            [
                `"${item.ID}"`, `"${item.Item}"`, `"${item.Quantidade}"`,
                `"${typeof item.Preco === 'number' ? item.Preco.toFixed(2) : '0.00'}"`,
                `"${item.Categoria}"`, `"${item.AdicionadoPor}"`, `"${item.Status}"`,
                `"${item.CompradoPor}"`, `"${item.CompradoEm ? new Date(item.CompradoEm).toLocaleString('pt-BR') : ''}"`
            ].join(',')
        );

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "lista_de_compras.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // --- MANIPULADORES DE EVENTOS ---

    function handleListClick(e) {
        const button = e.target.closest('button');
        if (!button) return;
        
        const card = e.target.closest('.list-item');
        const id = card.dataset.id;
        
        if (button.classList.contains('add-price-btn') || button.classList.contains('edit-price-btn')) {
            const item = fullShoppingList.find(i => i.ID === id);
            const currentPrice = item ? item.Preco : '';
            const newPriceStr = prompt(`Qual o preço de "${item.Item}"?`, currentPrice);
            
            if (newPriceStr !== null) { // Permite preço 0, mas não cancelamento
                const newPriceNum = parseFloat(newPriceStr.replace(',', '.'));
                if (!isNaN(newPriceNum)) {
                    postData({ 
                        action: 'moveToCart', 
                        id: id, 
                        price: newPriceNum
                    });
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
            // Não enviamos mais o preço daqui, ele começa como 0 no backend
            category: dom.itemCategory.value,
            addedBy: dom.currentUser.value
        };
        if (newItem.name && newItem.quantity && newItem.category) {
            postData({ action: 'addItem', item: newItem });
            dom.modal.style.display = "none";
            dom.addItemForm.reset();
        } else {
            alert('Por favor, preencha todos os campos obrigatórios.');
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
        window.addEventListener('click', (e) => {
            if (e.target == dom.modal) dom.modal.style.display = "none";
        });
        dom.addItemForm.addEventListener('submit', handleFormSubmit);
        dom.showPurchasedToggle.addEventListener('change', updateVisibility);
        dom.categoryFilter.addEventListener('change', renderLists);
        dom.exportCsvBtn.addEventListener('click', exportToCsv);
        dom.pendingList.addEventListener('click', handleListClick);
        dom.purchasedList.addEventListener('click', handleListClick);
    }

    // --- INICIALIZAÇÃO ---
    function init() {
        if (!SCRIPT_URL || SCRIPT_URL === 'COLE_AQUI_O_SEU_URL_DO_APP_DA_WEB') {
             alert('ERRO DE CONFIGURAÇÃO: Por favor, edite o arquivo script.js e insira o URL do seu Google Apps Script.');
             return;
        }
        setupEventListeners();
        fetchData();
        setInterval(fetchData, 30000); // Atualiza a lista automaticamente a cada 30 segundos
    }

    init();
});
