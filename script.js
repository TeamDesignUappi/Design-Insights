document.addEventListener('DOMContentLoaded', () => {
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

            fetchCommentsAndPages(figmaToken, fileKey).then(
                () => activateFilters() // Chamar aqui para ativar os filtros após o carregamento
            )
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

// Função para gerar as tabelas automáticas de palavras-chave por pessoa mencionada
function generateKeywordTables(mentionCounts, allComments) {
    const keywordTablesContainer = document.getElementById(
        'keyword-tables-container'
    )
    keywordTablesContainer.innerHTML = '' // Limpa as tabelas anteriores

    // Gera a tabela para cada pessoa mencionada
    Object.keys(mentionCounts).forEach(user => {
        const container = document.createElement('div')
        container.classList.add('table-container') // Contêiner para customização de estilo, se necessário

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

        // Cria e adiciona o botão de copiar
        const copyButton = document.createElement('button')
        copyButton.textContent = 'Copiar Dados'
        copyButton.classList.add('copy-button') // Classe para customização de estilo
        copyButton.addEventListener('click', () =>
            copyTableData(table, copyButton)
        )
        container.appendChild(copyButton)

        // Adiciona o contêiner com a tabela e o botão ao container principal
        keywordTablesContainer.appendChild(container)
    })

    // Gera a tabela total de ocorrências por tags em todos os comentários
    const totalTagCounts = {
        auto_layout: 0,
        estilos: 0,
        variaveis: 0,
        componentes: 0,
        prototipo: 0
    }
    allComments.forEach(comment => {
        const commentText = comment.message.toLowerCase()
        if (commentText.includes('#auto_layout'))
            totalTagCounts['auto_layout']++
        if (commentText.includes('#estilos')) totalTagCounts['estilos']++
        if (commentText.includes('#variaveis')) totalTagCounts['variaveis']++
        if (commentText.includes('#componentes'))
            totalTagCounts['componentes']++
        if (commentText.includes('#prototipo')) totalTagCounts['prototipo']++
    })

    // Cria e adiciona a tabela total de tags
    const totalTableContainer = document.createElement('div')
    totalTableContainer.classList.add('table-container')

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

    // Adiciona a tabela e o botão de copiar ao contêiner
    totalTableContainer.appendChild(totalTable)
    const totalCopyButton = document.createElement('button')
    totalCopyButton.textContent = 'Copiar Dados'
    totalCopyButton.classList.add('copy-button')
    totalCopyButton.addEventListener('click', () =>
        copyTableData(totalTable, totalCopyButton)
    )
    totalTableContainer.appendChild(totalCopyButton)

    // Adiciona o contêiner da tabela total ao container principal
    keywordTablesContainer.appendChild(totalTableContainer)
}

function copyTableData(table, button) {
    const rows = Array.from(table.querySelectorAll('tr'))
    const textToCopy = rows
        .map(row => {
            const cells = Array.from(row.querySelectorAll('th, td'))
            return cells.map(cell => cell.innerText).join('\t')
        })
        .join('\n')

    navigator.clipboard.writeText(textToCopy).then(
        () => {
            // Adiciona uma breve confirmação visual ao botão
            const originalText = button.textContent
            button.textContent = 'Copiado!'
            setTimeout(() => (button.textContent = originalText), 1500)
        },
        err => {
            console.error('Erro ao copiar os dados: ', err)
        }
    )
}

document.getElementById('copy-button').addEventListener('click', copyTableData)

async function fetchCommentsAndPages(figmaToken, fileKey) {
    const loadingIndicator = document.getElementById('loading-indicator')
    loadingIndicator.style.display = 'block'

    const commentsData = await fetchFigmaData(
        `files/${fileKey}/comments`,
        figmaToken
    )
    const fileData = await fetchFigmaData(`files/${fileKey}`, figmaToken)

    loadingIndicator.style.display = 'none'

    if (!commentsData || !fileData) return

    const pages = fileData.document.children.filter(
        child => child.type === 'CANVAS'
    )
    const projectName = fileData.name
    document.getElementById(
        'page-title'
    ).textContent = `Design Insights | ${projectName}`

    const pageFilter = document.getElementById('page-filter')
    pageFilter.innerHTML = '<option value="">Todas as Páginas</option>'
    pages.forEach(page => {
        const option = document.createElement('option')
        option.value = page.id
        option.textContent = page.name
        pageFilter.appendChild(option)
    })

    const userSelect = document.getElementById('person-search')
    userSelect.innerHTML = '<option value="">Todos os usuários</option>'
    const userHandles = new Set()

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

    updateCommentsTable(commentsData.comments, pages)
}

function activateFilters() {
    document
        .getElementById('page-filter')
        .addEventListener('change', filterCommentsTable)
    document
        .getElementById('text-filter')
        .addEventListener('change', filterCommentsTable)
    document
        .getElementById('person-filter')
        .addEventListener('change', filterCommentsTable)
    document
        .getElementById('person-search')
        .addEventListener('change', filterCommentsTable)
}

// Chamar activateFilters() após carregar os dados
document.addEventListener('DOMContentLoaded', () => {
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

            fetchCommentsAndPages(figmaToken, fileKey).then(() =>
                activateFilters()
            )
        })
})

function filterCommentsTable() {
    const pageValue = document.getElementById('page-filter').value.toLowerCase()
    const keywordValue = document
        .getElementById('text-filter')
        .value.toLowerCase()
    const personValue = document
        .getElementById('person-filter')
        .value.toLowerCase()
    const createdByValue = document
        .getElementById('person-search')
        .value.toLowerCase()

    const commentsRows = document.querySelectorAll('#comments-table tbody tr')
    let visibleCount = 0

    commentsRows.forEach(row => {
        const rowPage = row.dataset.pageId.toLowerCase()
        const rowText = row.dataset.commentText.toLowerCase()
        const rowUser = row.dataset.userHandle.toLowerCase()

        const matchesPage = !pageValue || rowPage === pageValue
        const matchesKeyword = !keywordValue || rowText.includes(keywordValue)
        const matchesPerson = !personValue || rowText.includes(personValue)
        const matchesCreatedBy = !createdByValue || rowUser === createdByValue

        if (
            matchesPage &&
            matchesKeyword &&
            matchesPerson &&
            matchesCreatedBy
        ) {
            row.style.display = ''
            visibleCount++
        } else {
            row.style.display = 'none'
        }
    })

    // Atualiza o contador de comentários visíveis
    document.getElementById(
        'comment-count'
    ).textContent = `Total de comentários: ${visibleCount}`
}

// Chamar activateFilters() após carregar os dados
document.addEventListener('DOMContentLoaded', () => {
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

            fetchCommentsAndPages(figmaToken, fileKey).then(() =>
                activateFilters()
            )
        })
})

function updateCommentsTable(comments, pages) {
    const commentsTableBody = document.querySelector('#comments-table tbody')
    commentsTableBody.innerHTML = ''

    const mentionCounts = {}

    comments.forEach(comment => {
        const commentNodeId =
            comment.client_meta && comment.client_meta.node_id
                ? comment.client_meta.node_id
                : null
        const page = pages.find(page => page.id === commentNodeId)
        const commentText = comment.message.toLowerCase()

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

            if (commentText.includes(mention)) {
                if (commentText.includes('#auto_layout'))
                    mentionCounts[mention].auto_layout++
                if (commentText.includes('#estilos'))
                    mentionCounts[mention].estilos++
                if (commentText.includes('#variaveis'))
                    mentionCounts[mention].variaveis++
                if (commentText.includes('#componentes'))
                    mentionCounts[mention].componentes++
                if (commentText.includes('#prototipo'))
                    mentionCounts[mention].prototipo++
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

    updateCommentCount(comments.length)
    generateKeywordTables(mentionCounts, comments)
}

function updateCommentCount(count) {
    document.getElementById(
        'comment-count'
    ).textContent = `Total de Comentários: ${count}`
}

// Adapte as outras funções de acordo, caso necessário.
