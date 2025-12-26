# 🚀 Guia Completo: Integração com Supabase

Este guia vai te ajudar a migrar a aplicação de localStorage para Supabase, permitindo que todos os usuários vejam as mesmas alterações em tempo real.

---

## 📋 Passo 1: Criar Conta no Supabase

1. Acesse: **https://supabase.com**
2. Clique em **"Start your project"** ou **"Sign up"**
3. Faça login com GitHub, Google ou email
4. Confirme seu email se necessário

---

## 📋 Passo 2: Criar um Novo Projeto

1. No dashboard do Supabase, clique em **"New Project"**
2. Preencha os dados:
   - **Name:** `contingencia-whatsapp` (ou qualquer nome)
   - **Database Password:** Crie uma senha forte (anote ela!)
   - **Region:** Escolha a mais próxima (ex: `South America (São Paulo)`)
   - **Pricing Plan:** Free (gratuito)
3. Clique em **"Create new project"**
4. Aguarde 2-3 minutos enquanto o projeto é criado

---

## 📋 Passo 3: Obter as Chaves da API

1. No dashboard do projeto, vá em **Settings** (ícone de engrenagem no menu lateral)
2. Clique em **API** no menu
3. Você verá duas informações importantes:
   - **Project URL** (algo como: `https://xxxxx.supabase.co`)
   - **anon public key** (uma chave longa)
4. **Copie essas duas informações** - você vai precisar delas!

---

## 📋 Passo 4: Criar a Tabela no Banco de Dados

1. No menu lateral, clique em **Table Editor**
2. Clique em **"New table"**
3. Configure a tabela:
   - **Name:** `whatsapp_numbers`
   - **Description:** `Números de WhatsApp cadastrados`
4. Adicione as colunas (clique em **"Add column"** para cada uma):

   | Nome da Coluna | Tipo | Opções |
   |---------------|------|--------|
   | `id` | uuid | Primary Key, Default: `gen_random_uuid()` |
   | `phone` | text | Not null |
   | `device` | text | Nullable |
   | `seller` | text | Nullable |
   | `notes` | text | Nullable |
   | `sector` | text | Not null |
   | `created_at` | timestamptz | Default: `now()` |
   | `updated_at` | timestamptz | Default: `now()` |

5. Clique em **"Save"** para criar a tabela

---

## 📋 Passo 5: Configurar Políticas de Segurança (RLS)

1. Na tabela `whatsapp_numbers`, clique na aba **"Policies"**
2. Clique em **"New Policy"**
3. Escolha **"Create a policy from scratch"**
4. Configure:
   - **Policy name:** `Allow all operations`
   - **Allowed operation:** `ALL` (ou crie políticas separadas para SELECT, INSERT, UPDATE, DELETE)
   - **Policy definition:** 
     ```sql
     true
     ```
   - **With check expression:**
     ```sql
     true
     ```
5. Clique em **"Review"** e depois **"Save policy"**

**⚠️ Nota:** Esta política permite acesso total. Para produção, você deve criar políticas mais restritivas baseadas em autenticação.

---

## 📋 Passo 6: Instalar a Biblioteca do Supabase

No terminal/PowerShell, na pasta do projeto, execute:

```bash
npm init -y
npm install @supabase/supabase-js
```

Ou se preferir usar CDN (sem npm), você pode adicionar diretamente no HTML (vou mostrar isso no código).

---

## 📋 Passo 7: Configurar o Arquivo de Configuração

1. Crie um arquivo `config.js` (ou vou criar para você)
2. Cole suas credenciais do Supabase:
   ```javascript
   const SUPABASE_URL = 'https://seu-projeto.supabase.co';
   const SUPABASE_KEY = 'sua-chave-publica-aqui';
   ```

---

## 📋 Passo 8: Testar a Conexão

Após configurar tudo, abra a aplicação e teste:
- Cadastrar um número
- Verificar se aparece na tabela do Supabase
- Abrir em outra aba/navegador e ver se o número aparece

---

## 🔄 Próximos Passos (Opcional)

- **Sincronização em tempo real:** Configurar para atualizar automaticamente quando alguém fizer alterações
- **Autenticação do Supabase:** Migrar o sistema de login para usar o Supabase Auth
- **Backup automático:** Configurar backups periódicos

---

## ❓ Problemas Comuns

**Erro de CORS:**
- Verifique se a URL do Supabase está correta
- Verifique se a chave pública está correta

**Dados não aparecem:**
- Verifique as políticas RLS (Row Level Security)
- Verifique se a tabela foi criada corretamente

**Erro de conexão:**
- Verifique sua conexão com internet
- Verifique se o projeto do Supabase está ativo

---

## 📞 Suporte

Se tiver problemas, verifique:
- Documentação do Supabase: https://supabase.com/docs
- Console do navegador (F12) para ver erros
- Logs do Supabase no dashboard





