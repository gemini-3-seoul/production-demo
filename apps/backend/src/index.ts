import 'dotenv/config';
import express, { Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { generateLandingPageHTML } from './utils/templateGenerator';
import { uploadLandingPageToGCS } from './services/storageService';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`;

const app = express();
app.use(express.json({ limit: '10mb' })); // base64 이미지를 위해 limit 증가
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

        // Create landing_pages table
        db.run(
            `CREATE TABLE IF NOT EXISTS landing_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id TEXT UNIQUE NOT NULL,
        business_name TEXT NOT NULL,
        public_url TEXT NOT NULL,
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

// Gemini AI 채팅 SSE 프록시 API
app.post('/api/chat', async (req: Request, res: Response) => {
    if (!GEMINI_API_KEY) {
        res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
        return;
    }

    try {
        const { contents } = req.body;

        const geminiRes = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents }),
        });

        if (!geminiRes.ok) {
            const errorText = await geminiRes.text();
            console.error('Gemini API error:', geminiRes.status, errorText);
            res.status(geminiRes.status).json({ error: 'Gemini API error', details: errorText });
            return;
        }

        // SSE 헤더 설정
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const reader = geminiRes.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            // Gemini SSE 청크를 그대로 클라이언트에 전달
            res.write(chunk);
        }

        res.end();
    } catch (error) {
        console.error('Chat proxy error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to communicate with Gemini API' });
        } else {
            res.end();
        }
    }
});

// 랜딩페이지 생성 API
app.post('/api/landing-pages', async (req: Request, res: Response) => {
    try {
        const { businessName, description, address, photoBase64 } = req.body;

        // 필수 필드 검증
        if (!businessName || !description || !address || !photoBase64) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['businessName', 'description', 'address', 'photoBase64'],
            });
            return;
        }

        // base64 형식 검증
        if (!photoBase64.startsWith('data:image/')) {
            res.status(400).json({
                error: 'photoBase64 must be in data:image/... format',
            });
            return;
        }

        // HTML 생성
        const htmlContent = generateLandingPageHTML({
            businessName,
            description,
            address,
            photoBase64,
        });

        // GCS에 업로드
        const { pageId, publicUrl } = await uploadLandingPageToGCS(htmlContent);

        // DB에 메타데이터 저장 (선택사항)
        db.run(
            'INSERT INTO landing_pages (page_id, business_name, public_url, created_at) VALUES (?, ?, ?, ?)',
            [pageId, businessName, publicUrl, new Date().toISOString()],
            function (err) {
                if (err) {
                    console.error('Error saving to database:', err);
                    // DB 저장 실패해도 GCS 업로드는 성공했으므로 계속 진행
                }
            }
        );

        res.status(201).json({
            success: true,
            pageId,
            url: publicUrl,
            message: 'Landing page created successfully',
        });
    } catch (error) {
        console.error('Error creating landing page:', error);
        res.status(500).json({
            error: 'Failed to create landing page',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
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
