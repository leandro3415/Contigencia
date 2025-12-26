// Configuração do Supabase
// IMPORTANTE: Substitua essas variáveis pelas suas credenciais do Supabase

const SUPABASE_CONFIG = {
  // Cole aqui a URL do seu projeto (ex: https://xxxxx.supabase.co)
  url: 'https://erotnkfcofjbqyvntwbs.supabase.co',
  
  // Cole aqui a chave pública (anon key) do seu projeto
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyb3Rua2Zjb2ZqYnF5dm50d2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODc2NDYsImV4cCI6MjA4MjI2MzY0Nn0.OI5hEd2E86K4WCH_gPt3gnqFMZeUSTJRdK19D8aFzsg'
};

// Verificar se as credenciais foram configuradas
if (SUPABASE_CONFIG.url.includes('https://erotnkfcofjbqyvntwbs.supabase.co') || SUPABASE_CONFIG.anonKey.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyb3Rua2Zjb2ZqYnF5dm50d2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODc2NDYsImV4cCI6MjA4MjI2MzY0Nn0.OI5hEd2E86K4WCH_gPt3gnqFMZeUSTJRdK19D8aFzsg')) {
  console.warn('⚠️ ATENÇÃO: Configure suas credenciais do Supabase no arquivo config.js');
}





