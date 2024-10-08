document.addEventListener('DOMContentLoaded', () => {
    const loadCommentsButton = document.getElementById('load-comments-button');
    loadCommentsButton.addEventListener('click', handleLoadComments);
});

function handleLoadComments() {
    const figmaToken = document.getElementById('figma-token-input').value;
    const fileKey = document.getElementById('file-key-input').value;

    if (!figmaToken || !fileKey) {
        alert('Por favor, insira o Figma Token e a File Key.');
        return;
    }

    fetchCommentsAndPages(figmaToken, fileKey);
}

async function fetchFigmaData(endpoint, figmaToken) {
    try {
        const response = await fetch(`https://api.figma.com/v1/${endpoint}`, {
            headers: { 'X-FIGMA-TOKEN': figmaToken }
        });

        if (!response.ok) throw new Error('Erro na rede.');
        return response.json();
    } catch (error) {
        console.error('Erro ao buscar os dados:', error);
    }
}

async function fetchCommentsAndPages(figmaToken, fileKey) {
    toggleLoadingIndicator(true);

    const [commentsData, fileData] = await Promise.all([
        fetchFigmaData(`files/${fileKey}/comments`, figmaToken),
        fetchFigmaData(`files/${fileKey}`, figmaToken)
    ]);

    toggleLoadingIndicator(false);

    if (!commentsData || !fileData) return;

    const pages = fileData.document.children.filter(child => child.type === 'CANVAS');
    updateProjectTitle(fileData.name);
    populatePageFilter(pages);
    populateUserSelect(commentsData.comments);
    updateCommentsTable(commentsData.comments, pages);
}

function toggleLoadingIndicator(show) {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = show ? 'block' : 'none';
}

function updateProjectTitle(projectName) {
    document.getElementById('page-title').textContent = `Design Insights | ${projectName}`;
}

function populatePageFilter(pages) {
    const pageFilter = document.getElementById('page-filter');
    pageFilter.innerHTML = '<option value="">Todas as Páginas</option>';
    pages.forEach(page => {
        pageFilter.innerHTML += `<option value="${page.id}">${page.name}</option>`;
    });
}

function populateUserSelect(comments) {
    const userSelect = document.getElementById('person-search');
    userSelect.innerHTML = '<option value="">Todos os usuários</option>';
    const userHandles = new Set(comments.map(comment => comment.user?.handle).filter(Boolean));

    userHandles.forEach(handle => {
        userSelect.innerHTML += `<option value="${handle}">${handle}</option>`;
    });
}

function updateCommentsTable(comments, pages) {
    const commentsTableBody = document.querySelector('#comments-table tbody');
    commentsTableBody.innerHTML = '';

    const mentionCounts = initializeMentionCounts(['jheny nunes', 'gutierres', 'emily salvador']);
    comments.forEach(comment => {
        updateMentionCounts(comment, mentionCounts);
        commentsTableBody.appendChild(createCommentRow(comment, pages));
    });

    updateCommentCount(comments.length);
    generateKeywordTables(mentionCounts, comments);
    activateFilters();
}

function initializeMentionCounts(mentions) {
    return mentions.reduce((acc, mention) => {
        acc[mention] = { auto_layout: 0, estilos: 0, variaveis: 0, componentes: 0, prototipo: 0 };
        return acc;
    }, {});
}

function updateMentionCounts(comment, mentionCounts) {
    const commentText = comment.message.toLowerCase();
    for (const mention in mentionCounts) {
        if (commentText.includes(mention)) {
            updateKeywordCount(commentText, mentionCounts[mention]);
        }
    }
}

function updateKeywordCount(commentText, mentionCount) {
    const keywords = ['#auto_layout', '#estilos', '#variaveis', '#componentes', '#prototipo'];
    keywords.forEach(keyword => {
        if (commentText.includes(keyword)) mentionCount[keyword]++;
    });
}

function createCommentRow(comment, pages) {
    const row = document.createElement('tr');
    const page = pages.find(page => page.id === (comment.client_meta?.node_id || ''));
    row.dataset.pageId = page ? page.id : '';
    row.dataset.commentText = comment.message.toLowerCase();
    row.dataset.userHandle = comment.user.handle.toLowerCase();

    row.innerHTML = `
        <td>${comment.message}</td>
        <td>${page ? page.name : 'Página não encontrada'}</td>
        <td>${comment.user.handle}</td>
        <td>${new Date(comment.created_at).toLocaleString()}</td>
        <td>${comment.resolved_at ? 'Resolvido' : 'Não Resolvido'}</td>
        <td>${comment.resolved_at ? new Date(comment.resolved_at).toLocaleString() : 'Não Resolvido'}</td>
    `;
    return row;
}

function updateCommentCount(count) {
    document.getElementById('comment-count').textContent = `Total de Comentários: ${count}`;
}

function generateKeywordTables(mentionCounts, allComments) {
    const keywordTablesContainer = document.getElementById('keyword-tables-container');
    keywordTablesContainer.innerHTML = '';

    Object.entries(mentionCounts).forEach(([user, counts]) => {
        keywordTablesContainer.appendChild(createKeywordTable(user, counts));
    });

    keywordTablesContainer.appendChild(createTotalTagTable(allComments));
}

function createKeywordTable(user, counts) {
    const container = document.createElement('div');
    container.classList.add('table-container');
    const table = createTable(`Responsável - ${user}`, counts);
    container.append(table, createCopyButton(table));
    return container;
}

function createTotalTagTable(allComments) {
    const totalTagCounts = calculateTotalTagCounts(allComments);
    const container = document.createElement('div');
    container.classList.add('table-container');
    const table = createTable('Total de Ocorrências por Tag', totalTagCounts);
    container.append(table, createCopyButton(table));
    return container;
}

function calculateTotalTagCounts(allComments) {
    const counts = { auto_layout: 0, estilos: 0, variaveis: 0, componentes: 0, prototipo: 0 };
    allComments.forEach(comment => {
        updateKeywordCount(comment.message.toLowerCase(), counts);
    });
    return counts;
}

function createTable(title, data) {
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr><th colspan="2">${title}</th></tr>
            <tr><th>Palavra-chave</th><th>Ocorrências</th></tr>
        </thead>
        <tbody>
            ${Object.entries(data).map(([keyword, count]) => `<tr><td>${keyword}</td><td>${count}</td></tr>`).join('')}
        </tbody>
    `;
    return table;
}

function createCopyButton(table) {
    const button = document.createElement('button');
    button.textContent = 'Copiar dados';
    button.classList.add('copy-button');
    button.addEventListener('click', () => copyTableData(table, button));
    return button;
}

function copyTableData(table, button) {
    const tableText = Array.from(table.querySelectorAll('tr'))
        .map(row => Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent.trim()).join('\t'))
        .join('\n');

    navigator.clipboard.writeText(tableText).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copiado!';
        setTimeout(() => { button.textContent = originalText; }, 2000);
    });
}

function activateFilters() {
    ['page-filter', 'text-filter', 'person-filter', 'person-search'].forEach(id => {
        document.getElementById(id).addEventListener('input', filterComments);
    });
}

function filterComments() {
    const filters = {
        page: document.getElementById('page-filter').value,
        text: document.getElementById('text-filter').value.toLowerCase(),
        user: document.getElementById('person-search').value.toLowerCase(),
        mention: document.getElementById('person-filter').value.toLowerCase()
    };

    const rows = document.querySelectorAll('#comments-table tbody tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const isVisible = Object.entries(filters).every(([key, value]) => 
            !value || row.dataset[`${key === 'page' ? 'pageId' : key}Text`].includes(value)
        );

        row.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    });

    updateCommentCount(visibleCount);
}
