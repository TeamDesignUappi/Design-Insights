document.addEventListener('DOMContentLoaded', () => {
    // Função para carregar comentários após o usuário inserir o token e a file key
    document
        .getElementById('load-comments-button')
        .addEventListener('click', () => {
            const figmaToken =
                document.getElementById('figma-token-input').value
            const fileKey = document.getElementById('file-key-input').value

            if (!figmaToken || !fileKey) {
                alert('Por favor, insira o Figma Token e a File Key.')
                return
            }

            // Carrega os dados e inicializa os filtros
            fetchCommentsAndPages(figmaToken, fileKey)
        })
})

async function fetchFigmaData(endpoint, figmaToken) {
    try {
        const response = await fetch(`https://api.figma.com/v1/${endpoint}`, {
            headers: {
                'X-FIGMA-TOKEN': figmaToken
            }
        })

        if (!response.ok) {
            throw new Error('Erro na rede.')
        }

        return response.json()
    } catch (error) {
        console.error('Erro ao buscar os dados:', error)
    }
}

async function fetchCommentsAndPages(figmaToken, fileKey) {
    const loadingIndicator = document.getElementById('loading-indicator')
    loadingIndicator.style.display = 'block' // Mostra o indicador de carregamento

    const commentsData = await fetchFigmaData(
        `files/${fileKey}/comments`,
        figmaToken
    )
    const fileData = await fetchFigmaData(`files/${fileKey}`, figmaToken)

    loadingIndicator.style.display = 'none' // Esconde o indicador de carregamento

    if (!commentsData || !fileData) return

    const pages = fileData.document.children.filter(
        child => child.type === 'CANVAS'
    )

    // Atualiza o título da página com o nome do projeto
    const projectName = fileData.name
    const pageTitle = document.getElementById('page-title')
    pageTitle.textContent = `Design Insights | ${projectName}`

    // Popula o filtro com as páginas
    const pageFilter = document.getElementById('page-filter')
    pageFilter.innerHTML = '<option value="">Todas as Páginas</option>'
    pages.forEach(page => {
        const option = document.createElement('option')
        option.value = page.id
        option.textContent = page.name
        pageFilter.appendChild(option)
    })

    // Preenche o select de "Criado por"
    const userSelect = document.getElementById('person-search')
    userSelect.innerHTML = '<option value="">Todos os usuários</option>'
    const userHandles = new Set() // Usar um Set para evitar duplicatas

    commentsData.comments.forEach(comment => {
        if (comment.user && comment.user.handle) {
            userHandles.add(comment.user.handle)
        }
    })

    userHandles.forEach(handle => {
        const option = document.createElement('option')
        option.value = handle
        option.textContent = handle
        userSelect.appendChild(option)
    })

    // Preenche a tabela com os comentários
    updateCommentsTable(commentsData.comments, pages)
}

function updateCommentsTable(comments, pages) {
    const commentsTableBody = document.querySelector('#comments-table tbody')
    commentsTableBody.innerHTML = '' // Limpa a tabela antes de adicionar novos dados

    const mentionCounts = {}

    comments.forEach(comment => {
        // Verifique se 'client_meta' e 'node_id' existem
        const commentNodeId =
            comment.client_meta && comment.client_meta.node_id
                ? comment.client_meta.node_id
                : null
        const page = pages.find(page => page.id === commentNodeId)
        const commentText = comment.message.toLowerCase()

        // Inicializa o contador de palavras-chave para cada pessoa mencionada
        const mentions = ['jheny nunes', 'gutierres', 'emily salvador']
        mentions.forEach(mention => {
            if (!mentionCounts[mention]) {
                mentionCounts[mention] = {
                    auto_layout: 0,
                    estilos: 0,
                    variaveis: 0,
                    componentes: 0,
                    prototipo: 0
                }
            }

            // Se a pessoa foi mencionada no comentário, conta as palavras-chave
            if (commentText.includes(mention)) {
                if (commentText.includes('#auto_layout')) {
                    mentionCounts[mention]['#auto_layout']++
                }
                if (commentText.includes('#estilos')) {
                    mentionCounts[mention]['#estilos']++
                }
                if (commentText.includes('#variaveis')) {
                    mentionCounts[mention]['#variaveis']++
                }
                if (commentText.includes('#componentes')) {
                    mentionCounts[mention]['#componentes']++
                }
                if (commentText.includes('#prototipo')) {
                    mentionCounts[mention]['#prototipo']++
                }
            }
        })

        const row = document.createElement('tr')
        row.dataset.pageId = page ? page.id : ''
        row.dataset.commentText = comment.message.toLowerCase()
        row.dataset.userHandle = comment.user.handle.toLowerCase()
        row.innerHTML = `
            <td>${comment.message}</td>
            <td>${page ? page.name : 'Página não encontrada'}</td>
            <td>${comment.user.handle}</td>
            <td>${new Date(comment.created_at).toLocaleString()}</td>
            <td>${comment.resolved_at ? 'Resolvido' : 'Não Resolvido'}</td>
            <td>${
                comment.resolved_at
                    ? new Date(comment.resolved_at).toLocaleString()
                    : 'Não Resolvido'
            }</td>
        `
        commentsTableBody.appendChild(row)
    })

    // Atualiza a contagem total de comentários
    updateCommentCount(comments.length)

    // Gera as tabelas adicionais com as contagens de palavras-chave por pessoa mencionada
    generateKeywordTables(mentionCounts, comments)

    // Ativa os filtros após os comentários serem carregados
    activateFilters()
}

function addCopyButton(table) {
    const copyButton = document.createElement('button')
    copyButton.textContent = 'Copiar dados'
    copyButton.classList.add('copy-button') // Adiciona uma classe minimalista
    table.parentElement.insertBefore(copyButton, table) // Insere o botão antes da tabela

    copyButton.addEventListener('click', () => {
        const tableText = getTableText(table)
        copyToClipboard(tableText)
    })
}

function getTableText(table) {
    let tableText = ''
    const rows = table.querySelectorAll('tr')

    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td')
        const rowText = Array.from(cells)
            .map(cell => cell.textContent.trim())
            .join('\t') // Separa por tabulações para formatar melhor ao colar
        tableText += rowText + '\n'
    })

    return tableText
}

function copyToClipboard(text) {
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
}

// Atualiza a função 'generateKeywordTables' para incluir o botão de copiar
function generateKeywordTables(mentionCounts, allComments) {
    const keywordTablesContainer = document.getElementById(
        'keyword-tables-container'
    )
    keywordTablesContainer.innerHTML = '' // Limpa as tabelas anteriores

    // Gera a tabela para cada pessoa mencionada
    Object.keys(mentionCounts).forEach(user => {
        const container = document.createElement('div') // Contêiner para tabela e botão
        container.classList.add('table-container') // Classe para customização de estilo, se necessário

        // Cria a tabela
        const table = document.createElement('table')
        table.innerHTML = `
        <thead>
            <tr>
                <th colspan="2">Responsável - ${user}</th>
            </tr>
            <tr>
                <th>Palavra-chave</th>
                <th>Ocorrências</th>
            </tr>
        </thead>
        <tbody>
            ${Object.keys(mentionCounts[user])
                .map(
                    keyword => `
                <tr>
                    <td>${keyword}</td>
                    <td>${mentionCounts[user][keyword]}</td>
                </tr>
            `
                )
                .join('')}
        </tbody>
    `

        // Adiciona a tabela ao contêiner
        container.appendChild(table)

        // Cria o botão de copiar
        const copyButton = document.createElement('button')
        copyButton.textContent = 'Copiar Dados'
        copyButton.classList.add('copy-button') // Classe para customização de estilo
        copyButton.addEventListener('click', () =>
            copyTableData(table, copyButton)
        )

        // Adiciona o botão de copiar ao contêiner
        container.appendChild(copyButton)

        // Adiciona o contêiner com a tabela e o botão ao container principal
        keywordTablesContainer.appendChild(container)
    })

    // Nova tabela para contagem total de tags do projeto em todos os comentários
    const totalTagCounts = {
        auto_layout: 0,
        estilos: 0,
        variaveis: 0,
        componentes: 0,
        prototipo: 0
    }

    // Conta as ocorrências de cada tag em todos os comentários
    allComments.forEach(comment => {
        const commentText = comment.message.toLowerCase()

        if (commentText.includes('#auto_layout')) {
            totalTagCounts['#auto_layout']++
        }
        if (commentText.includes('#estilos')) {
            totalTagCounts['#estilos']++
        }
        if (commentText.includes('#variaveis')) {
            totalTagCounts['#variaveis']++
        }
        if (commentText.includes('#componentes')) {
            totalTagCounts['#componentes']++
        }
        if (commentText.includes('#prototipo')) {
            totalTagCounts['#prototipo']++
        }
    })

    // Gera a tabela com a contagem total de tags
    const totalTableContainer = document.createElement('div')
    totalTableContainer.classList.add('table-container') // Contêiner para tabela e botão

    const totalTable = document.createElement('table')
    totalTable.innerHTML = `
    <thead>
        <tr>
            <th colspan="2">Total de Ocorrências por Tag</th>
        </tr>
        <tr>
            <th>Palavra-chave</th>
            <th>Ocorrências</th>
        </tr>
    </thead>
    <tbody>
        ${Object.keys(totalTagCounts)
            .map(
                tag => `
            <tr>
                <td>${tag}</td>
                <td>${totalTagCounts[tag]}</td>
            </tr>
        `
            )
            .join('')}
    </tbody>
    `

    // Adiciona a tabela ao contêiner
    totalTableContainer.appendChild(totalTable)

    // Cria e adiciona o botão de copiar para a tabela total
    const totalCopyButton = document.createElement('button')
    totalCopyButton.textContent = 'Copiar Dados'
    totalCopyButton.classList.add('copy-button') // Classe para customização de estilo
    totalCopyButton.addEventListener('click', () => copyTableData(totalTable))

    totalTableContainer.appendChild(totalCopyButton)

    // Adiciona o contêiner da tabela total ao container principal
    keywordTablesContainer.appendChild(totalTableContainer)
}

// Função para copiar os dados da tabela
function copyTableData(table, button) {
    let tableText = ''
    const rows = table.querySelectorAll('tr')

    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td')
        const rowText = Array.from(cells)
            .map(cell => cell.innerText)
            .join('\t') // Usa tabulação para separar as colunas
        tableText += `${rowText}\n`
    })

    // Cria um campo de texto temporário para copiar o conteúdo
    const tempTextArea = document.createElement('textarea')
    tempTextArea.value = tableText
    document.body.appendChild(tempTextArea)
    tempTextArea.select()
    document.execCommand('copy')
    document.body.removeChild(tempTextArea)

    // Altera o texto do botão para indicar que a cópia foi realizada
    const originalText = button.textContent
    button.textContent = 'Copiado!'

    // Opcional: Restaura o texto original após 2 segundos
    setTimeout(() => {
        button.textContent = originalText
    }, 2000)
}

function updateCommentCount(count) {
    document.getElementById(
        'comment-count'
    ).textContent = `Total de Comentários: ${count}`
}

function activateFilters() {
    document
        .getElementById('page-filter')
        .addEventListener('change', filterComments)
    document
        .getElementById('text-filter')
        .addEventListener('change', filterComments)
    document
        .getElementById('person-filter')
        .addEventListener('change', filterComments)
    document
        .getElementById('person-search')
        .addEventListener('input', filterComments) // Alterado para chamar a função filterComments
}

function filterComments() {
    const pageFilterValue = document.getElementById('page-filter').value
    const textFilterValue = document
        .getElementById('text-filter')
        .value.toLowerCase()
    const personSearchValue = document
        .getElementById('person-search')
        .value.toLowerCase()
    const personFilterValue = document
        .getElementById('person-filter')
        .value.toLowerCase() // Para o filtro de designers mencionados

    const rows = document.querySelectorAll('#comments-table tbody tr')
    let visibleCount = 0

    rows.forEach(row => {
        const rowPageId = row.dataset.pageId
        const rowCommentText = row.dataset.commentText.toLowerCase()
        const rowUserHandle = row.dataset.userHandle.toLowerCase()

        // Verificações de filtro
        const isPageMatch =
            pageFilterValue === '' || rowPageId === pageFilterValue
        const isTextMatch =
            textFilterValue === '' || rowCommentText.includes(textFilterValue)
        const isUserMatch =
            personSearchValue === '' ||
            rowUserHandle.includes(personSearchValue)
        const isMentionedMatch =
            personFilterValue === '' ||
            rowCommentText.includes(personFilterValue)

        // A lógica para verificar se a linha deve ser visível
        const isVisible =
            isPageMatch && isTextMatch && isUserMatch && isMentionedMatch

        row.style.display = isVisible ? '' : 'none'

        if (isVisible) {
            visibleCount++
        }
    })

    updateCommentCount(visibleCount)
}

// Função para buscar comentários pelo nome da pessoa que os criou
function searchByPerson() {
    const searchValue = document
        .getElementById('person-search')
        .value.toLowerCase()
    const rows = document.querySelectorAll('#comments-table tbody tr')
    let visibleCount = 0

    rows.forEach(row => {
        const rowUserHandle = row.dataset.userHandle // Extrai o handle do usuário diretamente do atributo de dados
        const isMatch = rowUserHandle.includes(searchValue)

        row.style.display = isMatch ? '' : 'none'

        if (isMatch) {
            visibleCount++
        }
    })

    // Atualiza a contagem de comentários visíveis após a busca
    updateCommentCount(visibleCount)
}
