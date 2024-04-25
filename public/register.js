const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const darkModeSwitch = document.getElementById('darkModeSwitch');

// Cargar el estado del modo oscuro desde localStorage
const isDarkMode = localStorage.getItem('isDarkMode') === 'true';
darkModeSwitch.checked = isDarkMode;
toggleDarkMode(isDarkMode);

usernameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    register();
  }
});

passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    register();
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

async function register() {
  // Validar campos de usuario y contraseña
  if (usernameInput.value.length < 4 || !usernameInput.value.match(/^[a-zA-Z0-9]+$/)) {
    showAlert('El nombre de usuario debe tener al menos 4 caracteres alfanuméricos.', 'danger');
    return;
  }

  if (passwordInput.value.length < 8) {
    showAlert('La contraseña debe tener al menos 8 caracteres.', 'danger');
    return;
  }

  try {
    const response = await axios.post('/api/register', {
      username: usernameInput.value,
      password: passwordInput.value,
    });

    if (response.data.success) {
      showAlert('¡Registro exitoso! Ahora puede iniciar sesión.', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      showAlert('Hubo un error durante el registro. Inténtalo de nuevo.', 'danger');
    }
  } catch (error) {
    showAlert('Ocurrió un error durante el registro. Inténtalo de nuevo.', 'danger');
    console.error('Error durante el registro:', error);
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