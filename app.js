// Estrutura de dados principal
// id: string, phone: string, device: string, seller: string,
// notes: string,
// sector: 'aquecimento' | 'atendimento' | 'acompanhamento' | 'outros' | 'banido' | 'restrito'

const STORAGE_KEY = "whatsapp_numbers_control_v1";

/** @type {Array} */
let numbers = [];
let currentActionId = null;
let isSupabaseReady = false;
let realtimeSubscription = null;

// Sistema de Logs de Debug
const debugLogs = [];
const MAX_LOGS = 200;

function addDebugLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  const logEntry = {
    time: timestamp,
    message: String(message),
    type: type
  };
  debugLogs.push(logEntry);
  if (debugLogs.length > MAX_LOGS) {
    debugLogs.shift();
  }
  updateDebugLogDisplay();
}

function updateDebugLogDisplay() {
  const logContent = document.getElementById('debug-log-content');
  if (!logContent) return;
  
  logContent.innerHTML = debugLogs.map(log => {
    const typeClass = log.type || 'info';
    return `<div class="debug-log-item ${typeClass}">
      <span class="debug-log-time">[${log.time}]</span>
      <span>${escapeHtml(log.message)}</span>
    </div>`;
  }).join('');
  
  // Scroll para o final
  logContent.scrollTop = logContent.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Interceptar console.log, console.error, console.warn
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  originalLog.apply(console, args);
  addDebugLog(args.join(' '), 'info');
};

console.error = function(...args) {
  originalError.apply(console, args);
  addDebugLog(args.join(' '), 'error');
};

console.warn = function(...args) {
  originalWarn.apply(console, args);
  addDebugLog(args.join(' '), 'warn');
};

const form = document.getElementById("numberForm");
const searchInput = document.getElementById("search");
const globalResultsEl = document.getElementById("global-results");
const actionsModal = document.getElementById("actions-modal");
const actionsMoveBtn = document.getElementById("actions-move");
const actionsEditBtn = document.getElementById("actions-edit");
const actionsDeleteBtn = document.getElementById("actions-delete");
const actionsCloseBtn = document.getElementById("actions-close");

const sectorBodies = {
  aquecimento: document.getElementById("tbody-aquecimento"),
  atendimento: document.getElementById("tbody-atendimento"),
  acompanhamento: document.getElementById("tbody-acompanhamento"),
  outros: document.getElementById("tbody-outros"),
  banido: document.getElementById("tbody-banido"),
  restrito: document.getElementById("tbody-restrito"),
};

const sectorCounters = {
  aquecimento: document.getElementById("count-aquecimento"),
  atendimento: document.getElementById("count-atendimento"),
  acompanhamento: document.getElementById("count-acompanhamento"),
  outros: document.getElementById("count-outros"),
  banido: document.getElementById("count-banido"),
  restrito: document.getElementById("count-restrito"),
};

const sectorSearchInputs = {
  aquecimento: document.getElementById("search-aquecimento"),
  atendimento: document.getElementById("search-atendimento"),
  acompanhamento: document.getElementById("search-acompanhamento"),
  outros: document.getElementById("search-outros"),
  banido: document.getElementById("search-banido"),
  restrito: document.getElementById("search-restrito"),
};

// Carregar dados do Supabase ou localStorage (fallback)
async function loadFromStorage() {
  // PRIMEIRO: Sempre carregar do localStorage para ter dados imediatamente
  loadFromLocalStorage();
  const localCount = numbers.length;
  addDebugLog(`📦 Carregados ${localCount} números do localStorage (backup)`, 'info');
  
  // DEPOIS: Tentar sincronizar com Supabase
  if (supabaseClient && isSupabaseReady) {
    try {
      addDebugLog(`🔄 Tentando carregar do Supabase...`, 'info');
      const { data, error } = await supabaseClient
        .from('whatsapp_numbers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        addDebugLog(`❌ Erro ao carregar do Supabase: ${error.message}`, 'error');
        console.error('Erro ao carregar do Supabase:', error);
        // Manter dados do localStorage que já foram carregados
        addDebugLog(`📦 Mantendo ${numbers.length} números do localStorage`, 'warn');
        return;
      }

      // Converter dados do Supabase para o formato da aplicação
      const supabaseNumbers = (data || []).map(item => ({
        id: item.id,
        phone: item.phone || '',
        device: item.device || '',
        seller: item.seller || '',
        notes: item.notes || '',
        activationDate: item.activation_date || item.activationDate || '',
        sector: item.sector || 'aquecimento',
      }));

      // Mesclar dados: Supabase tem prioridade, mas manter dados do localStorage que não estão no Supabase
      const supabaseIds = new Set(supabaseNumbers.map(n => n.id));
      const localOnly = numbers.filter(n => !supabaseIds.has(n.id));
      
      // Para números que existem em ambos, preservar activationDate do localStorage se o Supabase não tiver
      const localMap = new Map(numbers.map(n => [n.id, n]));
      const mergedNumbers = supabaseNumbers.map(supNum => {
        const localNum = localMap.get(supNum.id);
        // Se o Supabase não tem activationDate mas o localStorage tem, usar o do localStorage
        if (!supNum.activationDate && localNum && localNum.activationDate) {
          supNum.activationDate = localNum.activationDate;
          addDebugLog(`📅 Preservando activationDate do localStorage para número ${supNum.id}`, 'info');
        }
        return supNum;
      });
      
      numbers = [...mergedNumbers, ...localOnly];
      
      addDebugLog(`✅ Carregados ${supabaseNumbers.length} números do Supabase`, 'success');
      if (localOnly.length > 0) {
        addDebugLog(`📦 Mantidos ${localOnly.length} números apenas no localStorage`, 'info');
      }

      // Salvar no localStorage como backup (mesclado)
      saveToLocalStorage();

      console.log(`✅ Total: ${numbers.length} números (${supabaseNumbers.length} do Supabase + ${localOnly.length} do localStorage)`);
      return;
    } catch (e) {
      addDebugLog(`❌ Erro ao conectar com Supabase: ${e.message}`, 'error');
      console.error('Erro ao conectar com Supabase:', e);
      // Manter dados do localStorage que já foram carregados
      addDebugLog(`📦 Mantendo ${numbers.length} números do localStorage`, 'warn');
      return;
    }
  }

  // Se Supabase não estiver disponível, usar apenas localStorage
  addDebugLog(`⚠️ Supabase não disponível, usando apenas localStorage`, 'warn');
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      numbers = [];
      addDebugLog('📦 Nenhum dado encontrado no localStorage', 'info');
      return;
    }
    numbers = JSON.parse(raw);
    
    // Verificar quantos números estão em cada setor
    const sectorCounts = {
      aquecimento: numbers.filter(n => n.sector === 'aquecimento').length,
      atendimento: numbers.filter(n => n.sector === 'atendimento').length,
      acompanhamento: numbers.filter(n => n.sector === 'acompanhamento').length,
      outros: numbers.filter(n => n.sector === 'outros').length,
      banido: numbers.filter(n => n.sector === 'banido').length,
      restrito: numbers.filter(n => n.sector === 'restrito').length,
    };
    
    addDebugLog(`📦 Carregados ${numbers.length} números do localStorage`, 'success');
    addDebugLog(`   - banido (Disponível para ativação): ${sectorCounts.banido}`, 'info');
    console.log(`📦 Carregados ${numbers.length} números do localStorage (modo offline)`);
  } catch (e) {
    addDebugLog(`❌ ERRO ao carregar localStorage: ${e.message}`, 'error');
    console.error("Erro ao carregar storage", e);
    numbers = [];
  }
}

// Salvar dados no Supabase ou localStorage (fallback)
async function saveToStorage() {
  // Tentar usar Supabase primeiro
  if (supabaseClient && isSupabaseReady) {
    try {
      // Buscar todos os IDs atuais no Supabase
      const { data: existingData } = await supabaseClient
        .from('whatsapp_numbers')
        .select('id');

      const existingIds = new Set((existingData || []).map(item => item.id));

      // Separar em inserções e atualizações
      const toInsert = [];
      const toUpdate = [];

      numbers.forEach(num => {
        if (existingIds.has(num.id)) {
          toUpdate.push(num);
        } else {
          toInsert.push(num);
        }
      });

      // IDs que estão no Supabase mas não estão mais na lista local (deletados)
      const localIds = new Set(numbers.map(n => n.id));
      const toDelete = (existingData || [])
        .filter(item => !localIds.has(item.id))
        .map(item => item.id);

      // Executar operações
      if (toInsert.length > 0) {
        try {
          const { error } = await supabaseClient
            .from('whatsapp_numbers')
            .insert(toInsert.map(num => {
              const data = {
                id: num.id,
                phone: num.phone,
                device: num.device || null,
                seller: num.seller || null,
                notes: num.notes || null,
                sector: num.sector,
              };
              // Só adicionar activation_date se existir e não for vazio
              if (num.activationDate && num.activationDate.trim()) {
                data.activation_date = num.activationDate;
              }
              return data;
            }));

          if (error) {
            // Se erro for sobre activation_date, tentar sem esse campo
            if (error.message && error.message.includes('activation_date')) {
              const { error: retryError } = await supabaseClient
                .from('whatsapp_numbers')
                .insert(toInsert.map(num => ({
                  id: num.id,
                  phone: num.phone,
                  device: num.device || null,
                  seller: num.seller || null,
                  notes: num.notes || null,
                  sector: num.sector,
                })));
              if (retryError) throw retryError;
            } else {
              throw error;
            }
          }
        } catch (e) {
          addDebugLog(`❌ Erro ao inserir em massa no Supabase: ${e.message}`, 'error');
          throw e;
        }
      }

      if (toUpdate.length > 0) {
        for (const num of toUpdate) {
          try {
            const updateData = {
              phone: num.phone,
              device: num.device || null,
              seller: num.seller || null,
              notes: num.notes || null,
              sector: num.sector,
              updated_at: new Date().toISOString(),
            };
            
            // Só adicionar activation_date se existir e não for vazio
            if (num.activationDate && num.activationDate.trim()) {
              updateData.activation_date = num.activationDate;
            }
            
            const { error } = await supabaseClient
              .from('whatsapp_numbers')
              .update(updateData)
              .eq('id', num.id);

            if (error) {
              // Se erro for sobre activation_date, tentar sem esse campo
              if (error.message && error.message.includes('activation_date')) {
                delete updateData.activation_date;
                const { error: retryError } = await supabaseClient
                  .from('whatsapp_numbers')
                  .update(updateData)
                  .eq('id', num.id);
                if (retryError) throw retryError;
              } else {
                throw error;
              }
            }
          } catch (e) {
            addDebugLog(`❌ Erro ao atualizar número ${num.id}: ${e.message}`, 'error');
            // Continuar com os próximos números mesmo se um falhar
          }
        }
      }

      if (toDelete.length > 0) {
        const { error } = await supabaseClient
          .from('whatsapp_numbers')
          .delete()
          .in('id', toDelete);

        if (error) throw error;
      }

      // Salvar também no localStorage como backup
      localStorage.setItem(STORAGE_KEY, JSON.stringify(numbers));
      return;
    } catch (e) {
      console.error('Erro ao salvar no Supabase:', e);
      // Fallback para localStorage
      saveToLocalStorage();
      return;
    }
  }

  // Fallback para localStorage
  saveToLocalStorage();
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(numbers));
    
    // Verificar quantos números estão em cada setor
    const sectorCounts = {
      aquecimento: numbers.filter(n => n.sector === 'aquecimento').length,
      atendimento: numbers.filter(n => n.sector === 'atendimento').length,
      acompanhamento: numbers.filter(n => n.sector === 'acompanhamento').length,
      outros: numbers.filter(n => n.sector === 'outros').length,
      banido: numbers.filter(n => n.sector === 'banido').length,
      restrito: numbers.filter(n => n.sector === 'restrito').length,
    };
    
    addDebugLog(`💾 localStorage atualizado - Total: ${numbers.length} | banido: ${sectorCounts.banido}`, 'info');
  } catch (e) {
    addDebugLog(`❌ ERRO ao salvar no localStorage: ${e.message}`, 'error');
    console.error('Erro ao salvar localStorage:', e);
  }
}

function createId() {
  // Usar UUID se disponível, senão usar timestamp + random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const sectorLabels = {
  aquecimento: "Números em Aquecimento",
  atendimento: "Atendimento",
  acompanhamento: "Acompanhamento",
  outros: "Outros",
  banido: "Disponível para ativação",
  restrito: "Números Restritos",
};

function render() {
  const term = searchInput.value.trim().toLowerCase();

  const sectorTerms = {};
  Object.entries(sectorSearchInputs).forEach(([key, input]) => {
    sectorTerms[key] = (input?.value || "").trim().toLowerCase();
  });

  // Limpar todos os tbodies e verificar se existem
  Object.entries(sectorBodies).forEach(([sector, tbody]) => {
    if (tbody) {
      tbody.innerHTML = "";
    } else {
      addDebugLog(`⚠️ ERRO: tbody não encontrado para setor "${sector}"`, 'error');
    }
  });
  const counts = {
    aquecimento: 0,
    atendimento: 0,
    acompanhamento: 0,
    outros: 0,
    banido: 0,
    restrito: 0,
  };

  /** @type {Array<{phone:string,seller:string,sector:string}>} */
  const globalMatches = [];

  numbers.forEach((n) => {
    const haystack =
      `${n.phone} ${n.device} ${n.seller} ${n.notes}`.toLowerCase();
    const matchesGlobal = term && haystack.includes(term);
    if (term && !matchesGlobal) return;

    const sectorTerm = sectorTerms[n.sector] || "";
    if (sectorTerm && !haystack.includes(sectorTerm)) return;

    counts[n.sector] += 1;

    if (matchesGlobal) {
      globalMatches.push({
        phone: n.phone,
        seller: n.seller || "",
        sector: n.sector,
      });
    }
    const tr = document.createElement("tr");

    // Número
    const tdPhone = document.createElement("td");
    tdPhone.textContent = n.phone;
    tr.appendChild(tdPhone);

    // Telefone
    const tdDevice = document.createElement("td");
    tdDevice.textContent = n.device || "-";
    tr.appendChild(tdDevice);

    // Vendedor
    const tdSeller = document.createElement("td");
    tdSeller.textContent = n.seller || "-";
    tr.appendChild(tdSeller);

    // Observações
    const tdNotes = document.createElement("td");
    tdNotes.textContent = n.notes || "-";
    tr.appendChild(tdNotes);

    // Data de Ativação
    const tdActivationDate = document.createElement("td");
    if (n.activationDate && n.activationDate.trim()) {
      // Formatar data para exibição (DD/MM/AAAA)
      // O campo de data HTML retorna no formato YYYY-MM-DD
      const dateStr = n.activationDate.trim();
      
      // Tentar parsear como data ISO (YYYY-MM-DD)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateStr + 'T00:00:00'); // Adicionar hora para evitar problemas de timezone
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          tdActivationDate.textContent = `${day}/${month}/${year}`;
        } else {
          tdActivationDate.textContent = dateStr;
        }
      } else {
        // Se já estiver em outro formato, tentar parsear
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          tdActivationDate.textContent = `${day}/${month}/${year}`;
        } else {
          tdActivationDate.textContent = dateStr;
        }
      }
    } else {
      tdActivationDate.textContent = "-";
      // Log apenas para debug (comentar depois se necessário)
      // if (n.sector === 'aquecimento') {
      //   addDebugLog(`⚠️ Número ${n.phone} no setor aquecimento sem activationDate`, 'warn');
      // }
    }
    tr.appendChild(tdActivationDate);

    // Ações
    const tdActions = document.createElement("td");
    tdActions.className = "cell-actions";

    const actionsBtn = document.createElement("button");
    actionsBtn.className = "btn secondary";
    actionsBtn.textContent = "Ações";
    actionsBtn.addEventListener("click", () => openActionsModal(n.id));

    tdActions.append(actionsBtn);
    tr.appendChild(tdActions);

    // Verificar se o tbody existe antes de adicionar
    const targetTbody = sectorBodies[n.sector];
    if (targetTbody) {
      targetTbody.appendChild(tr);
    } else {
      addDebugLog(`⚠️ ERRO: tbody não encontrado para setor "${n.sector}"`, 'error');
      console.error(`tbody não encontrado para setor: ${n.sector}`);
    }
  });

  Object.entries(counts).forEach(([sector, value]) => {
    if (sectorCounters[sector]) {
      sectorCounters[sector].textContent = value;
    } else {
      addDebugLog(`⚠️ Contador não encontrado para setor: ${sector}`, 'error');
    }
    if (sector === 'banido' && value > 0) {
      addDebugLog(`✅ Renderizados ${value} números no setor "banido" (Disponível para ativação)`, 'success');
    }
  });

  if (!term || globalMatches.length === 0) {
    globalResultsEl.textContent = "";
  } else {
    globalResultsEl.innerHTML = globalMatches
      .map(
        (m) =>
          `<div class="global-results-item"><strong>${m.phone}</strong>${
            m.seller ? " - " + m.seller : ""
          } &rarr; ${sectorLabels[m.sector] || m.sector}</div>`
      )
      .join("");
  }
}

function openActionsModal(id) {
  currentActionId = id;
  actionsModal.classList.add("open");
}

function closeActionsModal() {
  currentActionId = null;
  actionsModal.classList.remove("open");
}

async function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(form);

  const phone = String(formData.get("phone") || "").trim();
  if (!phone) return;

  const device = String(formData.get("device") || "").trim();
  const seller = String(formData.get("seller") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const activationDate = String(formData.get("activationDate") || "").trim();
  const sector = String(formData.get("sector") || "aquecimento");
  
  // Log detalhado do setor selecionado e data de ativação
  addDebugLog(`📝 Salvando número - Setor: "${sector}" (${sectorLabels[sector] || sector})`, 'info');
  if (activationDate) {
    addDebugLog(`📅 Data de Ativação capturada: "${activationDate}"`, 'info');
  } else {
    addDebugLog(`⚠️ Data de Ativação está vazia`, 'warn');
  }
  if (sector === 'banido') {
    addDebugLog(`⚠️ ATENÇÃO: Salvando no setor "banido" (Disponível para ativação)`, 'warn');
  }

  const editingId = form.getAttribute("data-editing-id");
  
  if (editingId) {
    // Editar número existente
    const existing = numbers.find((n) => n.id === editingId);
    if (existing) {
      existing.phone = phone;
      existing.device = device;
      existing.seller = seller;
      existing.notes = notes;
      existing.activationDate = activationDate || ''; // Garantir que sempre tenha o campo
      existing.sector = sector;
      
      addDebugLog(`✏️ Editando número ${editingId} - Data de Ativação: "${activationDate || '(vazia)'}"`, 'info');

      // Salvar PRIMEIRO no localStorage como backup
      saveToLocalStorage();

      // Depois tentar salvar no Supabase
      if (supabaseClient && isSupabaseReady) {
        try {
          const updateData = {
            phone,
            device: device || null,
            seller: seller || null,
            notes: notes || null,
            sector,
            updated_at: new Date().toISOString(),
          };
          
          // Adicionar activation_date apenas se não for null/vazio
          if (activationDate && activationDate.trim()) {
            updateData.activation_date = activationDate;
          }
          
          const { error } = await supabaseClient
            .from('whatsapp_numbers')
            .update(updateData)
            .eq('id', editingId);

          if (error) {
            // Se o erro for sobre activation_date, tentar novamente sem esse campo
            if (error.message && error.message.includes('activation_date')) {
              delete updateData.activation_date;
              const { error: retryError } = await supabaseClient
                .from('whatsapp_numbers')
                .update(updateData)
                .eq('id', editingId);
              
              if (retryError) throw retryError;
              addDebugLog(`✅ Dados atualizados no Supabase (sem activation_date)`, 'success');
            } else {
              throw error;
            }
          } else {
            addDebugLog(`✅ Dados atualizados no Supabase`, 'success');
          }
          console.log('✅ Dados atualizados no Supabase');
        } catch (e) {
          addDebugLog(`❌ Erro ao atualizar no Supabase: ${e.message || e}`, 'error');
          console.error('❌ Erro ao atualizar no Supabase:', e);
          console.log('📦 Dados salvos apenas no localStorage (modo offline)');
        }
      }
    }
    form.removeAttribute("data-editing-id");
  } else {
    // Criar novo número
    const newId = createId();
    const newNumber = {
      id: newId,
      phone,
      device,
      seller,
      notes,
      activationDate: activationDate || '', // Garantir que sempre tenha o campo, mesmo que vazio
      sector,
    };
    
    numbers.push(newNumber);
    addDebugLog(`➕ Novo número adicionado: ${phone} | Setor: ${sector} | ID: ${newId}`, 'success');
    if (newNumber.activationDate) {
      addDebugLog(`📅 Data de Ativação salva no objeto: "${newNumber.activationDate}"`, 'success');
    } else {
      addDebugLog(`⚠️ Data de Ativação está vazia no objeto`, 'warn');
    }

    // Salvar PRIMEIRO no localStorage como backup
    saveToLocalStorage();
    addDebugLog(`💾 Dados salvos no localStorage (${numbers.length} números)`, 'info');

      // Depois tentar salvar no Supabase
      if (supabaseClient && isSupabaseReady) {
        try {
          addDebugLog(`🔄 Tentando inserir no Supabase - Setor: ${sector}`, 'info');
          // Criar objeto de inserção sem campos que podem não existir
          const insertData = {
            id: newId,
            phone,
            device: device || null,
            seller: seller || null,
            notes: notes || null,
            sector,
          };
          
          // Adicionar activation_date apenas se não for null/vazio (pode não existir na tabela)
          // Se a coluna não existir, o Supabase vai ignorar este campo
          if (activationDate && activationDate.trim()) {
            insertData.activation_date = activationDate;
          }
          
          addDebugLog(`📤 Dados a inserir: ${JSON.stringify(insertData)}`, 'info');
          
          const { data, error } = await supabaseClient
            .from('whatsapp_numbers')
            .insert([insertData])
            .select();

          if (error) {
            // Se o erro for sobre activation_date, tentar novamente sem esse campo
            if (error.message && error.message.includes('activation_date')) {
              addDebugLog(`⚠️ Coluna activation_date não existe, tentando sem esse campo...`, 'warn');
              delete insertData.activation_date;
              const { data: retryData, error: retryError } = await supabaseClient
                .from('whatsapp_numbers')
                .insert([insertData])
                .select();
              
              if (retryError) throw retryError;
              addDebugLog(`✅ Dados inseridos no Supabase (sem activation_date) - ID: ${newId}`, 'success');
            } else {
              throw error;
            }
          } else {
            addDebugLog(`✅ Dados inseridos no Supabase com sucesso! ID: ${newId}`, 'success');
          }
          console.log('✅ Dados inseridos no Supabase');
        } catch (e) {
          addDebugLog(`❌ ERRO ao inserir no Supabase: ${e.message || e}`, 'error');
          addDebugLog(`📦 Dados salvos apenas no localStorage (modo offline)`, 'warn');
          console.error('❌ Erro ao inserir no Supabase:', e);
          console.log('📦 Dados salvos apenas no localStorage (modo offline)');
        }
      } else {
        addDebugLog(`⚠️ Supabase não está pronto (client: ${!!supabaseClient}, ready: ${isSupabaseReady})`, 'warn');
      }
  }
  form.reset();
  render();
}

function nextSector(current) {
  if (current === "aquecimento") return "atendimento";
  if (current === "atendimento") return "acompanhamento";
  if (current === "acompanhamento") return "outros";
  if (current === "outros") return "banido";
  if (current === "banido") return "restrito";
  return "aquecimento"; // quando estiver em restrito
}

async function moveNumber(id) {
  const item = numbers.find((n) => n.id === id);
  if (!item) return;
  const newSector = nextSector(item.sector);
  item.sector = newSector;

  // Salvar PRIMEIRO no localStorage como backup
  saveToLocalStorage();

  // Depois tentar salvar no Supabase
  if (supabaseClient && isSupabaseReady) {
    try {
      const { error } = await supabaseClient
        .from('whatsapp_numbers')
        .update({
          sector: newSector,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      console.log('✅ Número movido no Supabase');
    } catch (e) {
      console.error('❌ Erro ao mover no Supabase:', e);
      console.log('📦 Dados salvos apenas no localStorage (modo offline)');
    }
  }

  render();
}

function editNumber(id) {
  const item = numbers.find((n) => n.id === id);
  if (!item) return;

  form.phone.value = item.phone;
  form.device.value = item.device;
  form.seller.value = item.seller;
  form.notes.value = item.notes;
  
  // O campo de data precisa estar no formato YYYY-MM-DD para o input type="date"
  if (item.activationDate && item.activationDate.trim()) {
    // Se já estiver no formato YYYY-MM-DD, usar direto
    if (item.activationDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      form.activationDate.value = item.activationDate;
    } else {
      // Tentar converter de DD/MM/YYYY ou outro formato para YYYY-MM-DD
      const date = new Date(item.activationDate);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        form.activationDate.value = `${year}-${month}-${day}`;
      } else {
        form.activationDate.value = item.activationDate;
      }
    }
  } else {
    form.activationDate.value = '';
  }
  
  form.sector.value = item.sector;

  addDebugLog(`✏️ Carregando número para edição - Data de Ativação: "${item.activationDate || '(vazia)'}"`, 'info');

  form.setAttribute("data-editing-id", item.id);
  form.phone.focus();
}

async function deleteNumber(id) {
  if (!confirm("Tem certeza que deseja excluir este número?")) return;
  
  // Remover da lista local primeiro
  numbers = numbers.filter((n) => n.id !== id);
  
  // Salvar PRIMEIRO no localStorage como backup
  saveToLocalStorage();

  // Depois tentar deletar no Supabase
  if (supabaseClient && isSupabaseReady) {
    try {
      const { error } = await supabaseClient
        .from('whatsapp_numbers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('✅ Número deletado no Supabase');
    } catch (e) {
      console.error('❌ Erro ao deletar no Supabase:', e);
      console.log('📦 Dados atualizados apenas no localStorage (modo offline)');
    }
  }

  render();
}

// Configurar sincronização em tempo real
function setupRealtimeSync() {
  if (!supabaseClient || !isSupabaseReady) return;

  // Cancelar subscription anterior se existir
  if (realtimeSubscription) {
    supabaseClient.removeChannel(realtimeSubscription);
  }

  // Criar subscription para mudanças em tempo real
  realtimeSubscription = supabaseClient
    .channel('whatsapp_numbers_changes')
    .on('postgres_changes', 
      { 
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'whatsapp_numbers'
      },
      async (payload) => {
        console.log('🔄 Mudança detectada no Supabase:', payload.eventType);
        // Recarregar dados quando houver mudanças
        await loadFromStorage();
        render();
      }
    )
    .subscribe();

  console.log('✅ Sincronização em tempo real ativada');
}

async function init() {
  // Só inicializar se a aplicação estiver visível (usuário logado)
  const appContent = document.getElementById("app-content");
  if (appContent && appContent.style.display === "none") {
    return;
  }

  // Verificar se todos os elementos necessários existem
  addDebugLog("🔍 Verificando elementos da página...", "info");
  Object.entries(sectorBodies).forEach(([sector, tbody]) => {
    if (tbody) {
      addDebugLog(`✅ tbody encontrado: ${sector}`, "success");
    } else {
      addDebugLog(`❌ ERRO: tbody NÃO encontrado: ${sector}`, "error");
    }
  });

  // Verificar se Supabase está pronto
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    isSupabaseReady = true;
    addDebugLog("✅ Supabase cliente encontrado", "success");
    setupRealtimeSync();
  } else {
    addDebugLog("⚠️ Supabase cliente não encontrado - usando apenas localStorage", "warn");
  }

  await loadFromStorage();
  console.log(`📊 Total de números carregados: ${numbers.length}`);
  render();
  addDebugLog(`✅ Aplicação inicializada e renderizada - ${numbers.length} números`, "success");
  console.log('✅ Aplicação inicializada e renderizada');

  if (form) form.addEventListener("submit", handleSubmit);

  if (searchInput) searchInput.addEventListener("input", () => render());

  Object.values(sectorSearchInputs).forEach((input) => {
    input?.addEventListener("input", () => render());
  });

  if (actionsMoveBtn) {
    actionsMoveBtn.addEventListener("click", () => {
      if (!currentActionId) return;
      moveNumber(currentActionId);
      closeActionsModal();
    });
  }

  if (actionsEditBtn) {
    actionsEditBtn.addEventListener("click", () => {
      if (!currentActionId) return;
      editNumber(currentActionId);
      closeActionsModal();
    });
  }

  if (actionsDeleteBtn) {
    actionsDeleteBtn.addEventListener("click", () => {
      if (!currentActionId) return;
      deleteNumber(currentActionId);
      closeActionsModal();
    });
  }

  if (actionsCloseBtn) {
    actionsCloseBtn.addEventListener("click", () => closeActionsModal());
  }

  if (actionsModal) {
    const backdrop = actionsModal.querySelector(".actions-modal-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", () => closeActionsModal());
    }
  }

  // Configurar botão de debug/log
  const debugLogBtn = document.getElementById("debug-log-btn");
  const debugLogModal = document.getElementById("debug-log-modal");
  const debugCloseBtn = document.getElementById("debug-close-btn");
  const debugClearBtn = document.getElementById("debug-clear-btn");

  if (debugLogBtn && debugLogModal) {
    debugLogBtn.addEventListener("click", () => {
      debugLogModal.classList.add("open");
      updateDebugLogDisplay();
    });
  }

  if (debugCloseBtn) {
    debugCloseBtn.addEventListener("click", () => {
      debugLogModal?.classList.remove("open");
    });
  }

  if (debugClearBtn) {
    debugClearBtn.addEventListener("click", () => {
      debugLogs.length = 0;
      updateDebugLogDisplay();
      addDebugLog("🧹 Logs limpos", "info");
    });
  }

  if (debugLogModal) {
    const backdrop = debugLogModal.querySelector(".debug-log-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", () => {
        debugLogModal.classList.remove("open");
      });
    }
  }

  // Log inicial
  addDebugLog("🚀 Aplicação inicializada", "success");
}

// Aguardar autenticação antes de inicializar
document.addEventListener("DOMContentLoaded", () => {
  // Verificar autenticação periodicamente até estar logado
  const checkAuth = setInterval(() => {
    const appContent = document.getElementById("app-content");
    if (appContent && appContent.style.display !== "none") {
      clearInterval(checkAuth);
      init();
    }
  }, 100);

  // Timeout de segurança
  setTimeout(() => clearInterval(checkAuth), 5000);
});


