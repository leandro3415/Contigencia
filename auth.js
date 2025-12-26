// Sistema de Autenticação
const AUTH_STORAGE_KEY = "whatsapp_auth_session";
const CREDENTIALS_STORAGE_KEY = "whatsapp_credentials";

// Credenciais padrão (você pode alterar depois)
const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "737446";

// Inicializar credenciais se não existirem
function initCredentials() {
  const stored = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(
      CREDENTIALS_STORAGE_KEY,
      JSON.stringify({
        username: DEFAULT_USERNAME,
        password: DEFAULT_PASSWORD,
      })
    );
  }
}

// Verificar se está autenticado
function isAuthenticated() {
  const session = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!session) return false;
  try {
    const data = JSON.parse(session);
    // Verificar se a sessão não expirou (24 horas)
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Fazer login
function login(username, password) {
  const stored = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
  if (!stored) {
    initCredentials();
    return login(username, password);
  }

  try {
    const credentials = JSON.parse(stored);
    if (
      credentials.username === username &&
      credentials.password === password
    ) {
      // Criar sessão
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          username,
          timestamp: Date.now(),
        })
      );
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Fazer logout
function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// Mostrar tela de login
function showLogin() {
  const loginScreen = document.getElementById("login-screen");
  const appContent = document.getElementById("app-content");
  if (loginScreen) loginScreen.style.display = "flex";
  if (appContent) appContent.style.display = "none";
}

// Mostrar aplicação
function showApp() {
  const loginScreen = document.getElementById("login-screen");
  const appContent = document.getElementById("app-content");
  if (loginScreen) loginScreen.style.display = "none";
  if (appContent) {
    appContent.style.display = "block";
    // Inicializar aplicação após mostrar
    setTimeout(() => {
      if (typeof init === "function") {
        init();
      }
    }, 100);
  }
}

// Inicializar autenticação
function initAuth() {
  initCredentials();

  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("login-error");
  const logoutHeaderBtn = document.getElementById("logout-header-btn");

  // Verificar se já está autenticado
  if (isAuthenticated()) {
    showApp();
    return;
  }

  showLogin();

  // Handler do formulário de login
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value.trim();

      if (!username || !password) {
        if (loginError) {
          loginError.textContent = "Preencha usuário e senha";
          loginError.classList.add("show");
        }
        return;
      }

      if (login(username, password)) {
        showApp();
        if (loginError) loginError.classList.remove("show");
        loginForm.reset();
      } else {
        if (loginError) {
          loginError.textContent = "Usuário ou senha incorretos";
          loginError.classList.add("show");
        }
      }
    });
  }

  // Handler do botão de logout
  if (logoutHeaderBtn) {
    logoutHeaderBtn.addEventListener("click", () => {
      if (confirm("Tem certeza que deseja sair?")) {
        logout();
        showLogin();
        if (loginForm) loginForm.reset();
        if (loginError) loginError.classList.remove("show");
      }
    });
  }
}

// Executar quando a página carregar
document.addEventListener("DOMContentLoaded", initAuth);

