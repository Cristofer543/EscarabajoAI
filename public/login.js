const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const darkModeSwitch = document.getElementById('darkModeSwitch');

// Cargar el estado del modo oscuro desde localStorage
const isDarkMode = localStorage.getItem('isDarkMode') === 'true';
darkModeSwitch.checked = isDarkMode;
toggleDarkMode(isDarkMode);

usernameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    login();
  }
});

passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    login();
  }
});

darkModeSwitch.addEventListener('change', () => {
  toggleDarkMode(darkModeSwitch.checked);
  localStorage.setItem('isDarkMode', darkModeSwitch.checked);
});

function toggleDarkMode(isDarkMode) {
  const body = document.body;
  const authContent = document.querySelector('.auth-content');

  if (isDarkMode) {
    body.classList.add('dark-mode');
    authContent.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
    authContent.classList.remove('dark-mode');
  }
}

async function login() {
  // Validar campos de usuario y contraseña
  if (!usernameInput.value || !passwordInput.value) {
    showAlert('Por favor, ingresa tu nombre de usuario y contraseña.', 'danger');
    return;
  }

  try {
    const response = await axios.post('/api/login', {
      username: usernameInput.value,
      password: passwordInput.value,
    });

    if (response.data.success) {
      localStorage.setItem('authToken', response.data.token);
      showAlert('Inicio de sesión exitoso.', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    } else {
      showAlert('Nombre de usuario o contraseña inválidos. Inténtalo de nuevo.', 'danger');
    }
  } catch (error) {
    showAlert('Ocurrió un error durante el inicio de sesión. Inténtalo de nuevo.', 'danger');
    console.error('Error durante el inicio de sesión:', error);
  }
}

function showAlert(message, type) {
  const alertContainer = document.createElement('div');
  alertContainer.classList.add(
    'alert',
    `alert-${type}`,
    'alert-dismissible',
    'fade',
    'show',
    'animate__animated',
    'animate__zoomIn'
  );
  alertContainer.role = 'alert';
  alertContainer.textContent = message;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.classList.add('btn-close');
  closeButton.setAttribute('data-bs-dismiss', 'alert');
  closeButton.setAttribute('aria-label', 'Close');

  alertContainer.appendChild(closeButton);
  document.body.appendChild(alertContainer);

  // Eliminar la alerta después de 5 segundos
  setTimeout(() => {
    alertContainer.classList.remove('animate__zoomIn');
    alertContainer.classList.add('animate__zoomOut');
    setTimeout(() => {
      document.body.removeChild(alertContainer);
    }, 1000);
  }, 5000);
}