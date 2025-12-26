// Cliente Supabase
// Este arquivo inicializa a conexão com o Supabase

let supabaseClient = null;

function initSupabase() {
  // Verificar se o Supabase está disponível (via CDN ou npm)
  if (typeof supabase === 'undefined' && typeof window.supabase === 'undefined') {
    console.error('❌ Biblioteca do Supabase não encontrada!');
    console.log('📦 Adicione o script do Supabase no index.html ou instale via npm');
    return null;
  }

  // Usar a biblioteca do Supabase (CDN ou npm)
  const supabaseLib = typeof supabase !== 'undefined' ? supabase : window.supabase;
  
  // Verificar se as credenciais estão configuradas
  if (!SUPABASE_CONFIG || SUPABASE_CONFIG.url.includes('SEU-PROJETO')) {
    console.error('❌ Configure suas credenciais do Supabase no arquivo config.js');
    return null;
  }

  try {
    // Criar cliente Supabase
    supabaseClient = supabaseLib.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );
    
    console.log('✅ Supabase conectado com sucesso!');
    return supabaseClient;
  } catch (error) {
    console.error('❌ Erro ao conectar com Supabase:', error);
    return null;
  }
}

// Inicializar quando o script carregar
if (typeof SUPABASE_CONFIG !== 'undefined') {
  supabaseClient = initSupabase();
}





