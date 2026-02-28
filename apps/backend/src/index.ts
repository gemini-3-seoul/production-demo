import express, { Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';

const app = express();
app.use(express.json());
app.use(cors());

// Configure SQLite database
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite database at', dbPath);
        // Create users table for testing
        db.run(
            `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
        );
    }
});

// Hello API
app.get('/api/hello', (req: Request, res: Response) => {
    res.json({ message: 'Hello from Node.js Express Backend!' });
});

// Create User API
app.post('/api/users', (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
    }
    db.run('INSERT INTO users (name) VALUES (?)', [name], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ id: this.lastID, name });
    });
});

// Get Users API
app.get('/api/users', (req: Request, res: Response) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ users: rows });
    });
});

// Listen on port 8081 for backend, 
// because nextJS will typically use 8080 when running together manually
// Wait, in a production container, we might map differently. 
// Let's use 8081, and the root wrapper script will map things,
// or we can set PORT env variable. 
const PORT = process.env.API_PORT || 8081;
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
