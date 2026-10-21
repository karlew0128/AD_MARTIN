const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { uuid } = require('uuidv4');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const dbPath = path.join(__dirname, 'ngilo.db');
const db = new sqlite3.Database(dbPath, (error) => {
  if (error) console.error('Error connecting to ngilo.db:', error.message);
  else console.log(`Connected to ${dbPath}`);
});

app.use(cors());
app.use(express.json());

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  )`);
});

function sendError(res, status, message) {
  return res.status(status).json({ message });
}

app.get('/', (_req, res) => res.send('Ngilo API is running.'));

app.post('/api/signup', async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = req.body.password;
  if (!username || typeof password !== 'string' || !password) {
    return sendError(res, 400, 'Username and password are required.');
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuid();
    db.run(
      'INSERT INTO users (user_id, username, password) VALUES (?, ?, ?)',
      [userId, username, passwordHash],
      function (error) {
        if (error) {
          if (error.code === 'SQLITE_CONSTRAINT') return sendError(res, 409, 'That username is already taken.');
          console.error(error.message);
          return sendError(res, 500, 'Could not create account.');
        }
        return res.status(201).json({ userId, username });
      }
    );
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Could not create account.');
  }
});

app.post('/api/login', (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = req.body.password;
  if (!username || typeof password !== 'string') {
    return sendError(res, 400, 'Username and password are required.');
  }

  db.get('SELECT user_id, username, password FROM users WHERE username = ?', [username], async (error, user) => {
    if (error) {
      console.error(error.message);
      return sendError(res, 500, 'Server error.');
    }
    if (!user) return sendError(res, 401, 'Invalid username or password.');

    try {
      if (!(await bcrypt.compare(password, user.password))) {
        return sendError(res, 401, 'Invalid username or password.');
      }
      return res.json({ userId: user.user_id, username: user.username });
    } catch (compareError) {
      console.error(compareError);
      return sendError(res, 500, 'Server error.');
    }
  });
});

app.get('/api/users', (_req, res) => {
  db.all('SELECT user_id AS userId, username FROM users ORDER BY username COLLATE NOCASE', [], (error, rows) => {
    if (error) {
      console.error(error.message);
      return sendError(res, 500, 'Could not load users.');
    }
    return res.json({ users: rows });
  });
});

app.get('/api/user/:userId', (req, res) => {
  db.get('SELECT user_id AS userId, username FROM users WHERE user_id = ?', [req.params.userId], (error, user) => {
    if (error) {
      console.error(error.message);
      return sendError(res, 500, 'Could not load user.');
    }
    if (!user) return sendError(res, 404, 'User not found.');
    return res.json(user);
  });
});

app.post('/api/send-message', (req, res) => {
  const { recipientId, message } = req.body;
  if (!recipientId || typeof message !== 'string' || !message.trim()) {
    return sendError(res, 400, 'Recipient ID and message are required.');
  }

  db.get('SELECT user_id FROM users WHERE user_id = ?', [String(recipientId)], (lookupError, user) => {
    if (lookupError) {
      console.error(lookupError.message);
      return sendError(res, 500, 'Server error.');
    }
    if (!user) return sendError(res, 404, 'Recipient not found.');

    db.run('INSERT INTO messages (user_id, message) VALUES (?, ?)', [user.user_id, message.trim()], function (insertError) {
      if (insertError) {
        console.error(insertError.message);
        return sendError(res, 500, 'Could not send message.');
      }
      return res.status(201).json({ message: 'Message sent anonymously.', messageId: this.lastID });
    });
  });
});

app.get('/api/inbox/:userId', (req, res) => {
  db.get('SELECT user_id FROM users WHERE user_id = ?', [req.params.userId], (lookupError, user) => {
    if (lookupError) {
      console.error(lookupError.message);
      return sendError(res, 500, 'Server error.');
    }
    if (!user) return sendError(res, 404, 'User not found.');

    db.all(
      `SELECT id AS messageId, message, timestamp AS createdAt
       FROM messages WHERE user_id = ? ORDER BY timestamp DESC, id DESC`,
      [user.user_id],
      (messagesError, messages) => {
        if (messagesError) {
          console.error(messagesError.message);
          return sendError(res, 500, 'Could not load messages.');
        }
        return res.json({ messages });
      }
    );
  });
});

const server = app.listen(PORT, () => console.log(`Ngilo API running at http://localhost:${PORT}`));

module.exports = server;
