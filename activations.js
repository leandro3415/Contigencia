// Gerenciamento de Dados de Ativações
const ACTIVATIONS_STORAGE_KEY = "whatsapp_activations_v1";

/** @type {Array} */
let activations = [];
let isSupabaseReadyForActivations = false;
let realtimeSubscriptionActivations = null;

const activationForm = document.getElementById("activationForm");
const searchActivationsInput = document.getElementById("search-activations");
const activationsTableBody = document.getElementById("tbody-activations");

// Carregar dados do Supabase ou localStorage (fallback)
async function loadActivationsFromStorage() {
  // PRIMEIRO: Sempre carregar do localStorage para ter dados imediatamente
  loadActivationsFromLocalStorage();
  const localCount = activations.length;
  if (typeof addDebugLog !== 'undefined') {
    addDebugLog(`📦 Carregadas ${localCount} ativações do localStorage (backup)`, 'info');
  }
  
  // DEPOIS: Tentar sincronizar com Supabase
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    isSupabaseReadyForActivations = true;
    try {
      if (typeof addDebugLog !== 'undefined') {
        addDebugLog(`🔄 Tentando carregar ativações do Supabase...`, 'info');
      }
      const { data, error } = await supabaseClient
        .from('whatsapp_activations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (typeof addDebugLog !== 'undefined') {
          addDebugLog(`❌ Erro ao carregar ativações do Supabase: ${error.message}`, 'error');
        }
        console.error('Erro ao carregar ativações do Supabase:', error);
        // Manter dados do localStorage que já foram carregados
        if (typeof addDebugLog !== 'undefined') {
          addDebugLog(`📦 Mantendo ${activations.length} ativações do localStorage`, 'warn');
        }
        return;
      }

      // Converter dados do Supabase para o formato da aplicação
      const supabaseActivations = (data || []).map(item => ({
        id: item.id,
        cpf: item.cpf || '',
        nome: item.nome || '',
        dataNascimento: item.data_nascimento || item.dataNascimento || '',
        uf: item.uf || '',
        wa: item.wa || '',
      }));

      // Mesclar dados: Supabase tem prioridade, mas manter dados do localStorage que não estão no Supabase
      const supabaseIds = new Set(supabaseActivations.map(a => a.id));
      const localOnly = activations.filter(a => !supabaseIds.has(a.id));
      
      activations = [...supabaseActivations, ...localOnly];
      
      if (typeof addDebugLog !== 'undefined') {
        addDebugLog(`✅ Carregadas ${supabaseActivations.length} ativações do Supabase`, 'success');
        if (localOnly.length > 0) {
          addDebugLog(`📦 Mantidas ${localOnly.length} ativações apenas no localStorage`, 'info');
        }
      }

      // Salvar no localStorage como backup (mesclado)
      saveActivationsToLocalStorage();

      console.log(`✅ Total: ${activations.length} ativações (${supabaseActivations.length} do Supabase + ${localOnly.length} do localStorage)`);
      return;
    } catch (e) {
      if (typeof addDebugLog !== 'undefined') {
        addDebugLog(`❌ Erro ao conectar com Supabase: ${e.message}`, 'error');
      }
      console.error('Erro ao conectar com Supabase:', e);
      // Manter dados do localStorage que já foram carregados
      if (typeof addDebugLog !== 'undefined') {
        addDebugLog(`📦 Mantendo ${activations.length} ativações do localStorage`, 'warn');
      }
      return;
    }
  }

  // Se Supabase não estiver disponível, usar apenas localStorage
  if (typeof addDebugLog !== 'undefined') {
    addDebugLog(`⚠️ Supabase não disponível para ativações, usando apenas localStorage`, 'warn');
  }
}

function loadActivationsFromLocalStorage() {
  try {
    const raw = localStorage.getItem(ACTIVATIONS_STORAGE_KEY);
    if (!raw) {
      activations = [];
      if (typeof addDebugLog !== 'undefined') {
        addDebugLog('📦 Nenhuma ativação encontrada no localStorage', 'info');
      }
      return;
    }
    activations = JSON.parse(raw);
    console.log(`✅ Carregadas ${activations.length} ativações do localStorage`);
  } catch (e) {
    if (typeof addDebugLog !== 'undefined') {
      addDebugLog(`❌ ERRO ao carregar localStorage: ${e.message}`, 'error');
    }
    console.error("Erro ao carregar ativações", e);
    activations = [];
  }
}

// Salvar dados no Supabase ou localStorage (fallback)
async function saveActivationsToStorage() {
  // Salvar PRIMEIRO no localStorage como backup
  saveActivationsToLocalStorage();

  // DEPOIS: Tentar salvar no Supabase
  if (supabaseClient && isSupabaseReadyForActivations) {
    try {
      // Buscar todos os IDs atuais no Supabase
      const { data: existingData } = await supabaseClient
        .from('whatsapp_activations')
        .select('id');

      const existingIds = new Set((existingData || []).map(item => item.id));

      // Separar em inserções e atualizações
      const toInsert = [];
      const toUpdate = [];

      activations.forEach(act => {
        if (existingIds.has(act.id)) {
          toUpdate.push(act);
        } else {
          toInsert.push(act);
        }
      });

      // IDs que estão no Supabase mas não estão mais na lista local (deletados)
      const localIds = new Set(activations.map(a => a.id));
      const toDelete = (existingData || [])
        .filter(item => !localIds.has(item.id))
        .map(item => item.id);

      // Executar operações
      if (toInsert.length > 0) {
        const { error } = await supabaseClient
          .from('whatsapp_activations')
          .insert(toInsert.map(act => ({
            id: act.id,
            cpf: act.cpf,
            nome: act.nome,
            data_nascimento: act.dataNascimento || null,
            uf: act.uf,
            wa: act.wa,
          })));

        if (error) throw error;
        if (typeof addDebugLog !== 'undefined') {
          addDebugLog(`✅ ${toInsert.length} ativações inseridas no Supabase`, 'success');
        }
      }

      if (toUpdate.length > 0) {
        for (const act of toUpdate) {
          const { error } = await supabaseClient
            .from('whatsapp_activations')
            .update({
              cpf: act.cpf,
              nome: act.nome,
              data_nascimento: act.dataNascimento || null,
              uf: act.uf,
              wa: act.wa,
              updated_at: new Date().toISOString(),
            })
            .eq('id', act.id);

          if (error) throw error;
        }
        if (typeof addDebugLog !== 'undefined') {
          addDebugLog(`✅ ${toUpdate.length} ativações atualizadas no Supabase`, 'success');
        }
      }

      if (toDelete.length > 0) {
        const { error } = await supabaseClient
          .from('whatsapp_activations')
          .delete()
          .in('id', toDelete);

        if (error) throw error;
        if (typeof addDebugLog !== 'undefined') {
          addDebugLog(`✅ ${toDelete.length} ativações deletadas no Supabase`, 'success');
        }
      }

      return;
    } catch (e) {
      if (typeof addDebugLog !== 'undefined') {
        addDebugLog(`❌ Erro ao salvar ativações no Supabase: ${e.message}`, 'error');
        addDebugLog(`📦 Dados salvos apenas no localStorage (modo offline)`, 'warn');
      }
      console.error('Erro ao salvar ativações no Supabase:', e);
      console.log('📦 Dados salvos apenas no localStorage (modo offline)');
      return;
    }
  }

  // Fallback para localStorage
  saveActivationsToLocalStorage();
}

function saveActivationsToLocalStorage() {
  try {
    localStorage.setItem(ACTIVATIONS_STORAGE_KEY, JSON.stringify(activations));
    console.log(`✅ ${activations.length} ativações salvas no localStorage`);
  } catch (e) {
    if (typeof addDebugLog !== 'undefined') {
      addDebugLog(`❌ ERRO ao salvar no localStorage: ${e.message}`, 'error');
    }
    console.error('❌ Erro ao salvar ativações:', e);
  }
}

function createActivationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatCPF(cpf) {
  // Remove caracteres não numéricos
  const numbers = cpf.replace(/\D/g, '');
  // Aplica máscara
  if (numbers.length === 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function renderActivations() {
  if (!activationsTableBody) return;

  const term = searchActivationsInput?.value.trim().toLowerCase() || "";
  activationsTableBody.innerHTML = "";

  activations.forEach((act) => {
    const haystack = `${act.cpf} ${act.nome} ${act.uf} ${act.wa}`.toLowerCase();
    if (term && !haystack.includes(term)) return;

    const tr = document.createElement("tr");

    // CPF
    const tdCPF = document.createElement("td");
    tdCPF.textContent = formatCPF(act.cpf);
    tr.appendChild(tdCPF);

    // Nome
    const tdNome = document.createElement("td");
    tdNome.textContent = act.nome || "-";
    tr.appendChild(tdNome);

    // Data de Nascimento
    const tdDataNasc = document.createElement("td");
    tdDataNasc.textContent = formatDate(act.dataNascimento);
    tr.appendChild(tdDataNasc);

    // UF
    const tdUF = document.createElement("td");
    tdUF.textContent = act.uf || "-";
    tr.appendChild(tdUF);

    // WA
    const tdWA = document.createElement("td");
    tdWA.textContent = act.wa || "-";
    tr.appendChild(tdWA);

    // Ações
    const tdActions = document.createElement("td");
    tdActions.className = "cell-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn secondary";
    btnEdit.textContent = "Editar";
    btnEdit.addEventListener("click", () => editActivation(act.id));

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn danger";
    btnDelete.textContent = "Excluir";
    btnDelete.addEventListener("click", () => deleteActivation(act.id));

    tdActions.append(btnEdit, btnDelete);
    tr.appendChild(tdActions);

    activationsTableBody.appendChild(tr);
  });
}

async function handleActivationSubmit(event) {
  event.preventDefault();
  if (!activationForm) return;

  const formData = new FormData(activationForm);

  const cpf = String(formData.get("cpf") || "").trim().replace(/\D/g, '');
  if (!cpf || cpf.length !== 11) {
    alert("CPF inválido! Digite 11 dígitos.");
    return;
  }

  const nome = String(formData.get("nome") || "").trim();
  if (!nome) {
    alert("Nome é obrigatório!");
    return;
  }

  const dataNascimento = String(formData.get("dataNascimento") || "").trim();
  const uf = String(formData.get("uf") || "").trim().toUpperCase();
  if (!uf || uf.length !== 2) {
    alert("UF inválido! Digite 2 letras (ex: SP, RJ).");
    return;
  }

  const wa = String(formData.get("wa") || "").trim();
  if (!wa) {
    alert("WA (WhatsApp) é obrigatório!");
    return;
  }

  const editingId = activationForm.getAttribute("data-editing-id");

  if (editingId) {
    // Editar
    const existing = activations.find((a) => a.id === editingId);
    if (existing) {
      existing.cpf = cpf;
      existing.nome = nome;
      existing.dataNascimento = dataNascimento;
      existing.uf = uf;
      existing.wa = wa;

      // Salvar PRIMEIRO no localStorage como backup
      saveActivationsToLocalStorage();

      // Depois tentar salvar no Supabase
      if (supabaseClient && isSupabaseReadyForActivations) {
        try {
          const { error } = await supabaseClient
            .from('whatsapp_activations')
            .update({
              cpf,
              nome,
              data_nascimento: dataNascimento || null,
              uf,
              wa,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingId);

          if (error) throw error;
          if (typeof addDebugLog !== 'undefined') {
            addDebugLog(`✅ Ativação atualizada no Supabase`, 'success');
          }
          console.log('✅ Ativação atualizada no Supabase');
        } catch (e) {
          if (typeof addDebugLog !== 'undefined') {
            addDebugLog(`❌ Erro ao atualizar ativação no Supabase: ${e.message}`, 'error');
          }
          console.error('❌ Erro ao atualizar ativação no Supabase:', e);
        }
      }
    }
    activationForm.removeAttribute("data-editing-id");
  } else {
    // Criar novo
    const newId = createActivationId();
    const newActivation = {
      id: newId,
      cpf,
      nome,
      dataNascimento,
      uf,
      wa,
    };
    
    activations.push(newActivation);
    
    if (typeof addDebugLog !== 'undefined') {
      addDebugLog(`➕ Nova ativação adicionada: ${nome} | CPF: ${cpf} | ID: ${newId}`, 'success');
    }

    // Salvar PRIMEIRO no localStorage como backup
    saveActivationsToLocalStorage();

    // Depois tentar salvar no Supabase
    if (supabaseClient && isSupabaseReadyForActivations) {
      try {
        const { error } = await supabaseClient
          .from('whatsapp_activations')
          .insert([{
            id: newId,
            cpf,
            nome,
            data_nascimento: dataNascimento || null,
            uf,
            wa,
          }]);

        if (error) throw error;
        if (typeof addDebugLog !== 'undefined') {
          addDebugLog(`✅ Ativação inserida no Supabase com sucesso! ID: ${newId}`, 'success');
        }
        console.log('✅ Ativação inserida no Supabase');
      } catch (e) {
        if (typeof addDebugLog !== 'undefined') {
          addDebugLog(`❌ Erro ao inserir ativação no Supabase: ${e.message}`, 'error');
          addDebugLog(`📦 Dados salvos apenas no localStorage (modo offline)`, 'warn');
        }
        console.error('❌ Erro ao inserir ativação no Supabase:', e);
        console.log('📦 Dados salvos apenas no localStorage (modo offline)');
      }
    }
  }

  activationForm.reset();
  renderActivations();
}

function editActivation(id) {
  const item = activations.find((a) => a.id === id);
  if (!item || !activationForm) return;

  activationForm.cpf.value = formatCPF(item.cpf);
  activationForm.nome.value = item.nome;
  activationForm.dataNascimento.value = item.dataNascimento || '';
  activationForm.uf.value = item.uf;
  activationForm.wa.value = item.wa;

  activationForm.setAttribute("data-editing-id", item.id);
  activationForm.cpf.focus();
}

async function deleteActivation(id) {
  if (!confirm("Tem certeza que deseja excluir esta ativação?")) return;
  
  // Remover da lista local primeiro
  activations = activations.filter((a) => a.id !== id);
  
  // Salvar PRIMEIRO no localStorage como backup
  saveActivationsToLocalStorage();

  // Depois tentar deletar no Supabase
  if (supabaseClient && isSupabaseReadyForActivations) {
    try {
      const { error } = await supabaseClient
        .from('whatsapp_activations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      if (typeof addDebugLog !== 'undefined') {
        addDebugLog(`✅ Ativação deletada no Supabase`, 'success');
      }
      console.log('✅ Ativação deletada no Supabase');
    } catch (e) {
      if (typeof addDebugLog !== 'undefined') {
        addDebugLog(`❌ Erro ao deletar ativação no Supabase: ${e.message}`, 'error');
        addDebugLog(`📦 Dados atualizados apenas no localStorage (modo offline)`, 'warn');
      }
      console.error('❌ Erro ao deletar ativação no Supabase:', e);
      console.log('📦 Dados atualizados apenas no localStorage (modo offline)');
    }
  }

  renderActivations();
}

// Configurar sincronização em tempo real para ativações
function setupRealtimeSyncActivations() {
  if (!supabaseClient || !isSupabaseReadyForActivations) return;

  // Cancelar subscription anterior se existir
  if (realtimeSubscriptionActivations) {
    supabaseClient.removeChannel(realtimeSubscriptionActivations);
  }

  // Criar subscription para mudanças em tempo real
  realtimeSubscriptionActivations = supabaseClient
    .channel('whatsapp_activations_changes')
    .on('postgres_changes', 
      { 
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'whatsapp_activations'
      },
      async (payload) => {
        if (typeof addDebugLog !== 'undefined') {
          addDebugLog(`🔄 Mudança detectada nas ativações no Supabase: ${payload.eventType}`, 'info');
        }
        console.log('🔄 Mudança detectada nas ativações no Supabase:', payload.eventType);
        // Recarregar dados quando houver mudanças
        await loadActivationsFromStorage();
        renderActivations();
      }
    )
    .subscribe();

  if (typeof addDebugLog !== 'undefined') {
    addDebugLog('✅ Sincronização em tempo real de ativações ativada', 'success');
  }
  console.log('✅ Sincronização em tempo real de ativações ativada');
}

async function initActivations() {
  if (!activationForm || !activationsTableBody) return;

  // Verificar se Supabase está pronto
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    isSupabaseReadyForActivations = true;
    setupRealtimeSyncActivations();
  } else {
    if (typeof addDebugLog !== 'undefined') {
      addDebugLog(`⚠️ Supabase não disponível para ativações - usando apenas localStorage`, 'warn');
    }
  }

  await loadActivationsFromStorage();
  renderActivations();

  activationForm.addEventListener("submit", handleActivationSubmit);

  if (searchActivationsInput) {
    searchActivationsInput.addEventListener("input", () => renderActivations());
  }

  // Máscara de CPF
  const cpfInput = document.getElementById("cpf");
  if (cpfInput) {
    cpfInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        e.target.value = value;
      }
    });
  }

  if (typeof addDebugLog !== 'undefined') {
    addDebugLog(`✅ Módulo de ativações inicializado - ${activations.length} ativações`, 'success');
  }
}

// Inicializar quando a página carregar
document.addEventListener("DOMContentLoaded", () => {
  // Aguardar autenticação
  const checkAuth = setInterval(() => {
    const appContent = document.getElementById("app-content");
    if (appContent && appContent.style.display !== "none") {
      clearInterval(checkAuth);
      initActivations();
    }
  }, 100);
  setTimeout(() => clearInterval(checkAuth), 5000);
});

