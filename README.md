## Controle de Números de WhatsApp

Aplicação web simples para gerenciar os números de WhatsApp usados na operação.

### 🔐 Login

A aplicação possui um sistema de autenticação. **Credenciais padrão:**

- **Usuário:** `admin`
- **Senha:** `737446`

⚠️ **Importante:** Altere essas credenciais após o primeiro acesso editando o arquivo `auth.js` (linha 7-8).

---

### ☁️ Integração com Supabase (Banco de Dados Online)

A aplicação agora suporta **Supabase** para sincronização em tempo real entre todos os usuários!

#### 📖 Guia Completo

Consulte o arquivo **`SUPABASE_SETUP.md`** para instruções detalhadas passo a passo.

#### 🚀 Resumo Rápido

1. **Criar conta no Supabase:** https://supabase.com
2. **Criar projeto** e obter URL + chave pública
3. **Criar tabela** `whatsapp_numbers` com as colunas necessárias
4. **Configurar** `config.js` com suas credenciais
5. **Pronto!** Os dados serão sincronizados automaticamente

#### ⚙️ Configuração

1. Abra o arquivo `config.js`
2. Substitua `SEU-PROJETO` pela URL do seu projeto Supabase
3. Substitua `SUA-CHAVE-PUBLICA-AQUI` pela chave pública (anon key)

#### 🔄 Funcionalidades

- ✅ **Sincronização em tempo real:** Alterações aparecem instantaneamente em todos os navegadores
- ✅ **Backup automático:** Dados salvos no Supabase e localStorage
- ✅ **Modo offline:** Funciona mesmo sem Supabase configurado (usa localStorage)
- ✅ **Multi-usuário:** Vários usuários podem usar simultaneamente

### Funcionalidades
- Visualização separada por setores: **Números em Aquecimento**, **Números Ativos**, **Números Banidos**.
- Cada número contém: **status (on/off)**, **telefone/cell**, **vendedor/atendente**, **em qual aparelho está**, **observações**.
- Possibilidade de **mover números entre setores**.
- **Busca por número**.
- Dados salvos no **localStorage** do navegador (não precisa de servidor).

### Como usar

#### Opção 1: Servidor Local (Recomendado)

**Com Python (já vem instalado no Windows):**
```bash
# No PowerShell, navegue até a pasta do projeto
cd "C:\Users\leand\OneDrive\Desktop\CONTIGENCIA WHATSAPP"

# Python 3
python -m http.server 8000

# Ou Python 2 (se não tiver Python 3)
python -m SimpleHTTPServer 8000
```

Depois abra no navegador: **http://localhost:8000**

**Com Node.js (se tiver instalado):**
```bash
# Instale o http-server globalmente (só precisa fazer uma vez)
npm install -g http-server

# Depois, na pasta do projeto
http-server -p 8000
```

Depois abra no navegador: **http://localhost:8000**

#### Opção 2: Abrir Diretamente (Mais Simples)
1. Abra o arquivo `index.html` com duplo clique em qualquer navegador moderno (Chrome, Edge, etc.).

### Funcionalidades da Aplicação
1. Cadastre novos números usando o formulário no topo.
2. Clique em **Editar** para alterar dados de um número.
3. Use o botão **Mover** para trocar o setor (Aquecimento ↔ Ativos ↔ Banidos).
4. Use o botão **Ligar/Desligar** para alternar o status on/off.
5. Use o botão **Excluir** para remover um número.
6. Use a busca para filtrar números por número, vendedor ou observação.


pro