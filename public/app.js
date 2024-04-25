// Variables globales
let chatHistory = [];
let chatHistoryByUser = {};
let currentSettings = {
  temperature: 0,
  top_p: 0.9,
  top_k: 0,
  max_new_tokens: 32768,
  model: ''
};
let userName = '';
let botName = '';

// Función para determinar el nombre del bot
function setBotName() {
  if (currentSettings.model === 'databricks/dbrx-instruct') {
    botName = 'DBRX-INSTRUCT';
  } else if (currentSettings.model === 'mixtral/mixtral-instruct') {
    botName = 'Mixtral';
  } else if (currentSettings.model === 'mistralai/Mixtral-8x22B-Instruct-v0.1') {
    botName = 'MIXTRAL-8X22B';
  } else if (currentSettings.model === 'microsoft/WizardLM-2-8x22B') {
    botName = 'WizardLM-2-8x22B';
  } else if (currentSettings.model === 'llava-hf/llava-1.5-7b-hf') {
    botName = 'Llava-7B';
  } else {
    botName = currentSettings.model;
  }
}

// Función para enviar un mensaje
async function sendMessage() {
  const input = document.getElementById('input').value;
  const chatMessages = document.getElementById('chat-messages');
  const userMessage = document.createElement('div');
  userMessage.classList.add('chat-message', 'user');
  userMessage.textContent = `${userName}: ${input}`;
  chatMessages.appendChild(userMessage);
  document.getElementById('input').value = '';

  try {
    const response = await sendMessageToServer(input, currentSettings, botName);
    const botMessage = document.createElement('div');
    botMessage.classList.add('chat-message', 'bot');
    botMessage.innerHTML = `<span class="bot-name">${botName}:</span> ${response.data}`;
    chatMessages.appendChild(botMessage);

    // Guardar el mensaje del usuario y la respuesta del bot en la base de datos
    await saveMessageToDatabase(input, response.data, botName);

    // Actualizar el historial de chat
    chatHistory.push({ user: input, bot: response.data, botName });
    saveHistory(input, response.data, botName);
    showNotification(response.data);
  } catch (error) {
    console.error('Error sending message:', error);
    const errorMessage = document.createElement('div');
    errorMessage.classList.add('chat-message', 'bot');
    errorMessage.textContent = `${botName}: Lo siento, ocurrió un error al procesar tu mensaje. Por favor, inténtalo de nuevo más tarde.`;
    chatMessages.appendChild(errorMessage);
  }
}

// Función para resaltar la sintaxis del código
function highlightCode(code, language) {
  const codeElement = document.createElement('pre');
  codeElement.classList.add('code-block');

  if (language && Prism.languages[language]) {
    try {
      const highlightedCode = Prism.highlight(code, Prism.languages[language], language);
      codeElement.innerHTML = `<code class="language-${language}">${highlightedCode}</code>`;
    } catch (error) {
      console.error('Error resaltando el código:', error);
      codeElement.innerHTML = `<code>${code}</code>`;
    }
  } else {
    const autoDetectedLanguage = Prism.autoDetection(code);
    if (autoDetectedLanguage) {
      try {
        const highlightedCode = Prism.highlight(code, Prism.languages[autoDetectedLanguage], autoDetectedLanguage);
        codeElement.innerHTML = `<code class="language-${autoDetectedLanguage}">${highlightedCode}</code>`;
      } catch (error) {
        console.error('Error resaltando el código:', error);
        codeElement.innerHTML = `<code>${code}</code>`;
      }
    } else {
      codeElement.innerHTML = `<code>${code}</code>`;
    }
  }

  return codeElement.outerHTML;
}

// Función para ordenar el texto generado por la IA
function sortText(text) {
  const sentences = text.split('.');
  sentences.sort((a, b) => a.length - b.length);
  return sentences.join('. ') + '.';
}

// Función para actualizar el mensaje del bot con procesamiento de código
async function updateBotMessageWithCode(text) {
  let currentText = '';
  const chatContainer = document.getElementById('chat-container');
  const botMessage = document.createElement('div');
  botMessage.classList.add('chat-message', 'bot');

  for (let i = 0; i < text.length; i++) {
    currentText += text[i];
    if (text[i] === '`' && text[i + 1] === '`' && text[i + 2] === '`') {
      const codeStart = i + 3;
      const codeEnd = text.indexOf('```', codeStart);
      if (codeEnd !== -1) {
        const code = text.substring(codeStart, codeEnd);
        const language = text.substring(i + 3, codeStart - 1).trim();
        const highlightedCode = highlightCode(code, language);
        currentText += highlightedCode;
        i = codeEnd + 2;
      }
    }
    botMessage.innerHTML = `<span class="bot-name">${botName}:</span> ${currentText}`;
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  chatContainer.appendChild(botMessage);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Función para enviar un archivo
async function sendFile() {
  const fileInputContainer = document.querySelector('.file-input-container');
  const fileInputBtn = document.querySelector('.file-input-btn');
  if (currentSettings.model === 'llava-hf/llava-1.5-7b-hf') {
    fileInputContainer.style.display = 'flex';
    fileInputBtn.style.display = 'inline-block';
  } else {
    fileInputContainer.style.display = 'none';
    fileInputBtn.style.display = 'none';
  }
  const fileInput = document.getElementById('file-input');
  const file = fileInput.files[0];
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post('/api/file', formData);
      const fileMessage = document.createElement('div');
      fileMessage.classList.add('chat-message', 'bot');
      fileMessage.innerHTML = `<span class="bot-name">${botName}:</span> ${sortText(response.data)}`;
      document.getElementById('chat-messages').appendChild(fileMessage);
      document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
      fileInput.value = ''; // Limpiar el campo de entrada de archivo
    } catch (error) {
      console.error('Error enviando el archivo:', error);
      const fileMessage = document.createElement('div');
      fileMessage.classList.add('chat-message', 'bot');
      fileMessage.innerHTML = `<span class="bot-name">${botName}:</span> Lo siento, hubo un error al enviar el archivo.`;
      document.getElementById('chat-messages').appendChild(fileMessage);
      document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
    }
  }
}

// Función para procesar el texto generado por la IA
function processIAText(text) {
  let processedText = '';
  let currentCodeBlock = '';
  let currentLanguage = '';

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '`' && text[i + 1] === '`' && text[i + 2] === '`') {
      const codeStart = i + 3;
      const codeEnd = text.indexOf('```', codeStart);
      if (codeEnd !== -1) {
        currentCodeBlock = text.substring(codeStart, codeEnd);
        currentLanguage = text.substring(i + 3, codeStart - 1).trim();
        const highlightedCode = highlightCode(currentCodeBlock, currentLanguage);
        processedText += highlightedCode;
        i = codeEnd + 2;
      }
    } else {
      processedText += text[i];
    }
  }

  return sortText(processedText);
}

// Función para actualizar el mensaje del bot con procesamiento de código
async function updateBotMessageWithCode(text) {
  let currentText = '';
  const chatContainer = document.getElementById('chat-container');
  const botMessage = document.createElement('div');
  botMessage.classList.add('chat-message', 'bot');

  for (let i = 0; i < text.length; i++) {
    currentText += text[i];
    botMessage.innerHTML = `<span class="bot-name">${botName}:</span> ${currentText}`;
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  const processedText = processIAText(currentText);
  botMessage.innerHTML = `<span class="bot-name">${botName}:</span> ${processedText}`;
  chatContainer.appendChild(botMessage);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Función para actualizar la configuración
function updateSettings() {
  currentSettings = {
    temperature: document.getElementById('temperature').value,
    top_p: document.getElementById('top_p').value,
    top_k: document.getElementById('top_k').value,
    max_new_tokens: document.getElementById('max_new_tokens').value,
    model: document.getElementById('model').value
  };
  setBotName();
  saveModelSettings();
}

// Función para mostrar una notificación
function showNotification(message) {
  if (document.getElementById('notifications').checked && Notification.permission === 'granted') {
    const truncatedMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
    new Notification(`${botName}: ${truncatedMessage}`);
  }
}

// Función para limpiar el historial
function clearHistory() {
  chatHistory = [];
  chatHistoryByUser = {};
  localStorage.removeItem('chatHistoryByUser');
  document.getElementById('chat-messages').innerHTML = '';
}

// Función para guardar el historial
function saveHistory(userInput, botResponse, botName) {
  chatHistoryByUser[userName] = chatHistoryByUser[userName] || [];
  chatHistoryByUser[userName].push({ user: userInput, bot: botResponse, botName });
  localStorage.setItem('chatHistoryByUser', JSON.stringify(chatHistoryByUser));
}

// Función para cargar el historial
async function loadHistory() {
  try {
    const response = await axios.get('/api/chat-history', {
      params: {
        userId: req.session.userId
      }
    });

    chatHistoryByUser[userName] = response.data;
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';

    response.data.forEach((message) => {
      const userMessage = document.createElement('div');
      userMessage.classList.add('chat-message', 'user');
      userMessage.textContent = `${message.user}: ${message.user_message}`;
      chatMessages.appendChild(userMessage);

      const botMessage = document.createElement('div');
      botMessage.classList.add('chat-message', 'bot');
      botMessage.innerHTML = `<span class="bot-name">${message.bot_name}:</span> ${message.bot_message}`;
      chatMessages.appendChild(botMessage);
    });
  } catch (error) {
    console.error('Error loading chat history:', error);
  }
}

// Función para manejar el evento de presionar Enter
function handleKeydown(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}

// Función para enviar un mensaje al servidor
async function sendMessageToServer(message, settings, botName) {
  try {
    const response = await axios.post('/api/message', {
      message,
      max_new_tokens: settings.max_new_tokens,
      temperature: settings.temperature,
      top_p: settings.top_p,
      top_k: settings.top_k,
      repetition_penalty: 1,
      stop: [],
      num_responses: 1,
      response_format: { type: "json_object" },
      presence_penalty: 0,
      frequency_penalty: 0,
      webhook: null,
      stream: false,
      model: settings.model,
      botName // Enviar el nombre de la IA al servidor
    });
    return response;
  } catch (error) {
    console.error('Error sending message to server:', error);
    throw error;
  }
}

// Función para actualizar la accesibilidad
function updateAccessibility() {
  const fontSize = document.getElementById('font-size').value;
  const contrast = document.getElementById('contrast').value;
  document.body.style.fontSize = `${fontSize}px`;
  document.body.style.filter = `contrast(${contrast})`;
}

// Función para cargar la configuración del modelo
function loadModelSettings() {
  const storedSettings = localStorage.getItem('modelSettings');
  if (storedSettings) {
    const settings = JSON.parse(storedSettings);
    document.getElementById('temperature').value = settings.temperature;
    document.getElementById('top_p').value = settings.top_p;
    document.getElementById('top_k').value = settings.top_k;
    document.getElementById('max_new_tokens').value = settings.max_new_tokens;
    document.getElementById('model').value = settings.model;
    updateSettings();
  }
}

// Función para guardar la configuración del modelo
function saveModelSettings() {
  const settings = {
    temperature: document.getElementById('temperature').value,
    top_p: document.getElementById('top_p').value,
    top_k: document.getElementById('top_k').value,
    max_new_tokens: document.getElementById('max_new_tokens').value,
    model: document.getElementById('model').value
  };
  localStorage.setItem('modelSettings', JSON.stringify(settings));
}

// Función para compartir el chat
async function shareChat(userId) {
  try {
    const response = await axios.post('/api/share-chat', { userId, chatHistory: chatHistoryByUser[userName] });
    if (response.data.success) {
      alert(`Chat compartido con el usuario ${response.data.username}`);
    } else {
      alert('Error al compartir el chat. Inténtalo de nuevo más tarde.');
    }
  } catch (error) {
    console.error('Error al compartir el chat:', error);
    alert('Ocurrió un error al compartir el chat. Inténtalo de nuevo más tarde.');
  }
}

// Función para cargar el nombre de usuario
async function getUserName() {
  try {
    const response = await axios.get('/api/username');
    userName = response.data.username;
    updateUserNameDisplay();
  } catch (error) {
    console.error('Error getting username:', error);
    userName = 'Guest'; // Puedes asignar un nombre predeterminado en caso de error
    updateUserNameDisplay();
  }
}

// Función para actualizar la visualización del nombre de usuario
function updateUserNameDisplay() {
  const userNameElement = document.getElementById('username');
  if (userNameElement) {
    userNameElement.textContent = userName;
  }
}

// Función para alternar la configuración del modelo
function toggleModelSettings() {
  const modelSettings = document.getElementById('model-settings');
  if (modelSettings) {
    if (modelSettings.style.display === 'none') {
      modelSettings.style.display = 'block';
    } else {
      modelSettings.style.display = 'none';
    }
  } else {
    console.error('model-settings element not found');
  }
}

// Función para cargar la configuración del modelo y otras funciones al cargar la página
window.onload = async () => {
  await loadHistory();
  await updateAccessibility();
  await getUserName();
  await toggleModelSettings();
  loadModelSettings();
  loadDarkMode();
  displayUserChats(); // Llamar a la función para mostrar los chats del usuario
};

// Función para guardar la configuración del modelo
function saveModelSettings() {
  const settings = {
    temperature: document.getElementById('temperature').value,
    top_p: document.getElementById('top_p').value,
    top_k: document.getElementById('top_k').value,
    max_new_tokens: document.getElementById('max_new_tokens').value,
    model: document.getElementById('model').value
  };
  localStorage.setItem('modelSettings', JSON.stringify(settings));
}

// Función para cargar la configuración del modelo
function loadModelSettings() {
  const storedSettings = localStorage.getItem('modelSettings');
  if (storedSettings) {
    const settings = JSON.parse(storedSettings);
    document.getElementById('temperature').value = settings.temperature;
    document.getElementById('top_p').value = settings.top_p;
    document.getElementById('top_k').value = settings.top_k;
    document.getElementById('max_new_tokens').value = settings.max_new_tokens;
    document.getElementById('model').value = settings.model;
    updateSettings();
  }
}

function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle('dark-mode');
}

// Función para guardar el modo oscuro
function saveDarkMode() {
  const isDarkMode = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);
}

// Función para cargar el modo oscuro
function loadDarkMode() {
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    document.getElementById('dark-mode').checked = true;
  } else {
    document.body.classList.remove('dark-mode');
    document.getElementById('dark-mode').checked = false;
  }
}

// Función para alternar el modo oscuro
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  saveDarkMode();
}
function logout() {
  localStorage.removeItem("authToken");

  window.location.href = 'login.html';
}
async function uploadProfileImage() {
  const fileInput = document.getElementById('profile-image-input');
  const file = fileInput.files[0];

  if (file) {
    try {
      const formData = new FormData();
      formData.append('profile-image', file);

      const response = await axios.post('/api/upload-profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Actualizar la imagen de perfil en la interfaz de usuario
        const profileIcon = document.getElementById('profile-icon');
        profileIcon.src = response.data.imageUrl;
        alert('Imagen de perfil actualizada correctamente.');
      } else {
        alert('Error al subir la imagen de perfil. Inténtalo de nuevo más tarde.');
      }
    } catch (error) {
      console.error('Error al subir la imagen de perfil:', error);
      alert('Ocurrió un error al subir la imagen de perfil. Inténtalo de nuevo más tarde.');
    }
  }
}
function displayUserChats() {
  const sidebarContent = document.getElementById('sidebar-content');
  if (sidebarContent) {
    sidebarContent.innerHTML = '';

    for (const user in chatHistoryByUser) {
      const chatItem = document.createElement('div');
      chatItem.classList.add('chat-item');
      chatItem.textContent = user;
      chatItem.onclick = () => {
        // Limpiar el área de chat actual
        document.getElementById('chat-messages').innerHTML = '';

        // Mostrar el historial de chat del usuario seleccionado
        displayChatHistory(chatHistoryByUser[user]);
      };

      sidebarContent.appendChild(chatItem);
    }
  } else {
    console.error('El elemento sidebar-content no se encontró en el DOM.');
  }
}
function createNewChat() {
  // Obtener el nombre del usuario para el nuevo chat
  const newChatUserName = prompt('Ingresa el nombre del usuario para el nuevo chat:');

  if (newChatUserName) {
    // Inicializar el historial de chat para el nuevo usuario
    chatHistoryByUser[newChatUserName] = [];

    // Agregar el nuevo chat a la sidebar
    const sidebarContent = document.getElementById('sidebar-content');
    const chatItem = document.createElement('div');
    chatItem.classList.add('chat-item');
    chatItem.textContent = newChatUserName;
    chatItem.onclick = () => {
      // Limpiar el área de chat actual
      document.getElementById('chat-messages').innerHTML = '';

      // Mostrar el historial de chat del usuario seleccionado
      displayChatHistory(chatHistoryByUser[newChatUserName]);
    };
    sidebarContent.appendChild(chatItem);

    // Limpiar el área de chat actual
    document.getElementById('chat-messages').innerHTML = '';

    // Guardar el historial de chat actualizado
    localStorage.setItem('chatHistoryByUser', JSON.stringify(chatHistoryByUser));
  }
}

function displayChatHistory(chatHistory) {
  const chatMessages = document.getElementById('chat-messages');
  chatMessages.innerHTML = '';

  chatHistory.forEach((message) => {
    const userMessage = document.createElement('div');
    userMessage.classList.add('chat-message', 'user');
    userMessage.textContent = `${message.user}`;
    chatMessages.appendChild(userMessage);

    const botMessage = document.createElement('div');
    botMessage.classList.add('chat-message', 'bot');
    botMessage.innerHTML = `<span class="bot-name">${message.botName}:</span> ${message.bot}`;
    chatMessages.appendChild(botMessage);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}
async function saveMessageToDatabase(userMessage, botMessage, botName) {
  try {
    await axios.post('/api/save-message', {
      userId: req.session.userId,
      userMessage,
      botMessage,
      botName
    });
  } catch (error) {
    console.error('Error saving message to database:', error);
  }
}