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
        itemCategory: document.getElementById('itemCategory')
    };

    // --- FUNÇÕES PRINCIPAIS ---

    /**
     * Busca os dados da planilha do Google.
     */
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

    /**
     * Envia dados para a planilha do Google.
     * @param {object} payload - O objeto de dados a ser enviado.
     */
    async function postData(payload) {
        showLoading(true);
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                credentials: 'omit',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Usar text/plain para contornar limitações de CORS com GAS
                redirect: 'follow',
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);
            await fetchData(); // Recarrega os dados após a alteração
        } catch (error) {
            console.error("Erro ao enviar dados:", error);
            alert("Ocorreu um erro ao salvar a alteração. Tente novamente.");
        } finally {
            showLoading(false);
        }
    }

    /**
     * Renderiza as listas de itens (pendentes e comprados).
     */
    function renderLists() {
        dom.pendingList.innerHTML = '';
        dom.purchasedList.innerHTML = '';
        
        const selectedCategory = dom.categoryFilter.value;
        const listToRender = fullShoppingList
            .filter(item => selectedCategory === 'all' || item.Categoria === selectedCategory)
            .sort((a, b) => (a.Item || '').localeCompare(b.Item || ''));

        if (listToRender.length === 0) {
            dom.pendingList.innerHTML = '<p>Nenhum item na lista. Adicione um!</p>';
        }

        listToRender.forEach(item => {
            const itemCard = createItemCard(item);
            if (item.Status === 'Comprado') {
                dom.purchasedList.appendChild(itemCard);
            } else {
                dom.pendingList.appendChild(itemCard);
            }
        });
        
        updateVisibility();
    }

    /**
     * Cria o HTML de um card de item.
     * @param {object} item - O objeto do item.
     * @returns {HTMLElement} O elemento do card.
     */
    function createItemCard(item) {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.dataset.id = item.ID;
        div.dataset.category = item.Categoria;

        const purchasedInfo = item.Status === 'Comprado' ?
            `<span><i class="fas fa-check"></i> Comprado por: <strong>${item.CompradoPor}</strong></span>
             <span><i class="fas fa-clock"></i> Em: ${new Date(item.CompradoEm).toLocaleString('pt-BR')}</span>` : '';

        div.innerHTML = `
            <div class="item-main">
                <p class="item-name">${item.Item}</p>
                <p class="item-quantity">${item.Quantidade}</p>
            </div>
            <div class="item-meta">
                <span><i class="fas fa-user"></i> Adicionado por: <strong>${item.AdicionadoPor}</strong></span>
                <span><i class="fas fa-tag"></i> Categoria: <strong>${item.Categoria}</strong></span>
                ${purchasedInfo}
            </div>
            <div class="item-actions">
                ${item.Status !== 'Comprado' ? '<button class="purchase-btn"><i class="fas fa-check"></i> Marcar como Comprado</button>' : ''}
                <button class="delete-btn"><i class="fas fa-trash"></i> Excluir</button>
            </div>
        `;
        return div;
    }

    /**
     * Extrai categorias únicas da lista e preenche o filtro.
     */
    function populateCategories() {
        categories.clear();
        fullShoppingList.forEach(item => categories.add(item.Categoria));
        
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

    /**
     * Controla a visibilidade da seção de comprados e spinner.
     */
    function updateVisibility() {
        const showPurchased = dom.showPurchasedToggle.checked;
        dom.purchasedSection.style.display = showPurchased && dom.purchasedList.children.length > 0 ? 'block' : 'none';
    }

    function showLoading(isLoading) {
        dom.loading.style.display = isLoading ? 'block' : 'none';
    }

    /**
     * Exporta a lista atual para um arquivo CSV.
     */
    function exportToCsv() {
        const headers = ['Item', 'Quantidade', 'Categoria', 'Status', 'AdicionadoPor', 'CompradoPor', 'CompradoEm'];
        const rows = fullShoppingList.map(item => 
            [
                `"${item.Item}"`,
                `"${item.Quantidade}"`,
                `"${item.Categoria}"`,
                `"${item.Status}"`,
                `"${item.AdicionadoPor}"`,
                `"${item.CompradoPor}"`,
                `"${item.CompradoEm ? new Date(item.CompradoEm).toLocaleString('pt-BR') : ''}"`
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
        
        if (button.classList.contains('purchase-btn')) {
            if (confirm('Marcar este item como comprado?')) {
                postData({ action: 'markAsPurchased', id: id, purchasedBy: dom.currentUser.value });
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
            alert('Por favor, preencha todos os campos.');
        }
    }

    function setupEventListeners() {
        dom.addItemBtn.addEventListener('click', () => dom.modal.style.display = 'block');
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