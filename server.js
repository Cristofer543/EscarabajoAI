const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const session = require('express-session');

const app = express();

// Configurar el almacenamiento de archivos con Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${req.session.userId}-${file.originalname}`);
  }
});

// Configurar los tipos de archivos permitidos
const fileFilter = (req, file, cb) => {
  // Permitir solo archivos de imagen
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Solo se permiten archivos de imagen'), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path, stat) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Configurar express-session
app.use(session({
  secret: 'your-secret-key', // Clave secreta para firmar la sesión
  resave: false,
  saveUninitialized: true
}));

// Conexión a la base de datos MySQL
const connection = mysql.createConnection({
  host: 'YOUR HOST',
  user: 'USERNAME',
  password: 'PASSWORLD',
  database: 'DATABASE NAME'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Conectado a la base de datos MySQL');
});

// Middleware para verificar si el usuario está autenticado
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    // Verificar si el usuario existe en la base de datos
    connection.query('SELECT * FROM users WHERE id = ?', [req.session.userId], (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'Ocurrió un error al procesar la solicitud' });
      }

      if (results.length === 0) {
        // El usuario no existe en la base de datos, eliminar la sesión
        delete req.session.userId;
        delete req.session.username;
        return res.status(401).json({ error: 'No autorizado' });
      }

      // El usuario está autenticado y existe en la base de datos
      next();
    });
  } else {
    // El usuario no está autenticado
    res.status(401).json({ error: 'No autorizado' });
  }
};

// Ruta de inicio de sesión
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  connection.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: 'Ocurrió un error al procesar la solicitud' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Nombre de usuario o contraseña inválidos' });
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Nombre de usuario o contraseña inválidos' });
    }

    // Guardar información del usuario autenticado en la sesión
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ success: true });
  });
});

// Ruta de registro
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    connection.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'Ocurrió un error al registrar' });
      }
      res.json({ success: true });
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Ocurrió un error al registrar' });
  }
});

// Ruta de mensajes
app.post('/api/message', isAuthenticated, async (req, res) => {
  const { message } = req.body;
  const userId = req.session.userId;
  const botName = req.body.botName; // Obtener el nombre de la IA del cliente

  try {
    // Guardar el mensaje del usuario en la base de datos
    await new Promise((resolve, reject) => {
      connection.query('INSERT INTO chat_messages (user_id, message, is_bot, bot_name) VALUES (?, ?, 0, NULL)', [userId, message], (err, results) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Enviar la solicitud a la API de DeepInfra
    const response = await axios.post('https://api.deepinfra.com/v1/openai/chat/completions', {
      model: "databricks/dbrx-instruct",
      messages: [{ role: "user", content: message }],
      max_tokens: req.body.max_new_tokens,
      temperature: req.body.temperature,
      top_p: req.body.top_p,
      top_k: req.body.top_k,
      repetition_penalty: req.body.repetition_penalty,
      stop: req.body.stop,
      num_responses: req.body.num_responses,
      response_format: req.body.response_format,
      presence_penalty: req.body.presence_penalty,
      frequency_penalty: req.body.frequency_penalty,
      webhook: req.body.webhook,
      stream: req.body.stream
    }, {
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer xE9DXM52PuJPJfbmpKCIkKtbV60JEBFQ`,
      }
    });

    // Guardar la respuesta del bot en la base de datos
    await new Promise((resolve, reject) => {
      connection.query('INSERT INTO chat_messages (user_id, message, is_bot, bot_name) VALUES (?, ?, 1, ?)', [userId, response.data.choices[0].message.content, botName], (err, results) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    res.json(response.data.choices[0].message.content);
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).json({ error: 'Ocurrió un error al procesar la solicitud' });
  }
});

// Ruta de carga de archivos
app.post('/api/file', isAuthenticated, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se cargó ningún archivo' });
  }

  // Procesar el archivo cargado
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json(`Archivo cargado: ${fileUrl}`);
});

// Ruta de nombre de usuario
app.get('/api/username', isAuthenticated, (req, res) => {
  const userId = req.session.userId;

  connection.query('SELECT username, profile_image FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: 'Ocurrió un error al obtener el nombre de usuario' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { username, profile_image } = results[0];
    res.json({ username, profile_image });
  });
});

// Ruta para compartir el chat
app.post('/api/share-chat', isAuthenticated, (req, res) => {
  const { userId, chatHistory } = req.body;
  const currentUserId = req.session.userId;

  // Verificar si el usuario existe en la base de datos
  connection.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: 'Ocurrió un error al procesar la solicitud' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Guardar el historial de chat en la base de datos
    chatHistory.forEach(message => {
      connection.query('INSERT INTO chat_messages (user_id, message, is_bot, bot_name) VALUES (?, ?, ?, ?)', [currentUserId, message.user, 0, null], (err, results) => {
        if (err) {
          console.log(err);
        }
      });
      connection.query('INSERT INTO chat_messages (user_id, message, is_bot, bot_name) VALUES (?, ?, ?, ?)', [userId, message.bot, 1, message.botName], (err, results) => {
        if (err) {
          console.log(err);
        }
      });
    });

    res.json({ success: true, username: results[0].username });
  });
});

// Ruta para cargar la imagen de perfil
app.post('/api/upload-profile-image', isAuthenticated, upload.single('profile-image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No se cargó ninguna imagen' });
  }

  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  // Actualizar la imagen de perfil del usuario en la base de datos
  connection.query('UPDATE users SET profile_image = ? WHERE id = ?', [imageUrl, req.session.userId], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false, error: 'Ocurrió un error al actualizar la imagen de perfil' });
    }

    res.json({ success: true, imageUrl });
  });
});

// Historial
// Ruta para guardar un mensaje
app.post('/api/save-message', isAuthenticated, (req, res) => {
  const { userId, userMessage, botMessage, botName } = req.body;

  connection.query('INSERT INTO chat_messages (user_id, user_message, bot_message, bot_name) VALUES (?, ?, ?, ?)', [userId, userMessage, botMessage, botName], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: 'Ocurrió un error al guardar el mensaje' });
    }

    res.json({ success: true });
  });
});

// Ruta para obtener el historial de chat
app.get('/api/chat-history', isAuthenticated, (req, res) => {
  const userId = req.query.userId;

  connection.query('SELECT user_message, bot_message, bot_name FROM chat_messages WHERE user_id = ? ORDER BY id ASC', [userId], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: 'Ocurrió un error al obtener el historial de chat' });
    }

    res.json(results);
  });
});

app.listen(3000, () => {
  console.log('El servidor se está ejecutando en el puerto 3000');
});
