import 'dotenv/config';
import express, { Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { generateLandingPageHTML } from './utils/templateGenerator';
import { uploadLandingPageToGCS } from './services/storageService';
import { getWeather } from './services/weatherService';
import { getFoodTrends } from './services/trendsService';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`;
const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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
        const { businessName, description, address, photoBase64, imageAnalysis } = req.body;

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
            imageAnalysis,
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

// 트렌드 분석 API (Gemini Function Calling)
app.post('/api/analyze-trends', async (req: Request, res: Response) => {
    if (!GEMINI_API_KEY) {
        res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
        return;
    }

    try {
        const { businessName, description, address } = req.body;

        if (!businessName || !address) {
            res.status(400).json({ error: 'businessName and address are required' });
            return;
        }

        // Gemini Function Calling 설정
        const tools = [{
            function_declarations: [
                {
                    name: 'get_weather',
                    description: '특정 위치의 현재 날씨 정보를 조회합니다',
                    parameters: {
                        type: 'OBJECT',
                        properties: {
                            location: {
                                type: 'STRING',
                                description: '날씨를 조회할 위치 (예: 서울, 강남구)',
                            },
                        },
                        required: ['location'],
                    },
                },
                {
                    name: 'get_food_trends',
                    description: '특정 키워드의 음식/외식 관련 트렌드를 조회합니다',
                    parameters: {
                        type: 'OBJECT',
                        properties: {
                            keyword: {
                                type: 'STRING',
                                description: '트렌드를 조회할 키워드 (예: 카페, 맛집)',
                            },
                            geo: {
                                type: 'STRING',
                                description: '국가 코드 (기본: KR)',
                            },
                        },
                        required: ['keyword'],
                    },
                },
            ],
        }];

        const systemPrompt = `당신은 소상공인 마케팅 전문가입니다.
아래 가게 정보를 바탕으로 날씨와 트렌드를 분석하여 마케팅 제안서를 작성해주세요.

가게 정보:
- 상호명: ${businessName}
- 소개: ${description || '없음'}
- 주소: ${address}

반드시 get_weather와 get_food_trends 도구를 사용하여 실시간 데이터를 수집한 후,
최종적으로 아래 JSON 형식으로만 응답해주세요:

\`\`\`json
{
  "weather": {
    "temperature": "현재 기온 (예: 15°C)",
    "description": "날씨 상세 설명",
    "marketingInsight": "날씨 기반 마케팅 인사이트"
  },
  "trends": {
    "topKeywords": ["트렌드 키워드1", "키워드2", "키워드3"],
    "insight": "트렌드 기반 인사이트"
  },
  "proposal": {
    "enhancedDescription": "업데이트된 가게 소개문구 (2-3문장)",
    "newTags": ["#새태그1", "#새태그2", "#새태그3", "#새태그4", "#새태그5"],
    "newFeatures": ["새로운 특장점1", "특장점2", "특장점3"],
    "reasoning": "변경 이유 설명 (1-2문장)"
  }
}
\`\`\``;

        let contents: any[] = [
            { role: 'user', parts: [{ text: systemPrompt }] },
        ];

        // Function Calling 루프 (최대 5회)
        for (let i = 0; i < 5; i++) {
            const geminiRes = await fetch(GEMINI_GENERATE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents, tools }),
            });

            if (!geminiRes.ok) {
                const errText = await geminiRes.text();
                console.error('Gemini API error:', geminiRes.status, errText);
                res.status(500).json({ error: 'Gemini API error', details: errText });
                return;
            }

            const geminiData = await geminiRes.json();
            const candidate = geminiData.candidates?.[0];
            const parts = candidate?.content?.parts || [];

            // Gemini 응답을 대화에 추가
            contents.push({ role: 'model', parts });

            // functionCall 확인
            const functionCall = parts.find((p: any) => p.functionCall);

            if (!functionCall) {
                // 텍스트 응답 → 최종 결과
                const textPart = parts.find((p: any) => p.text);
                if (textPart) {
                    const fullText = textPart.text;
                    const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/);
                    const jsonStr = jsonMatch ? jsonMatch[1] : fullText;

                    try {
                        const proposal = JSON.parse(jsonStr);
                        res.json({ success: true, proposal });
                    } catch {
                        res.json({ success: true, proposal: { raw: fullText } });
                    }
                } else {
                    res.status(500).json({ error: 'No text response from Gemini' });
                }
                return;
            }

            // Function 실행
            const { name, args } = functionCall.functionCall;
            let functionResult: any;

            try {
                if (name === 'get_weather') {
                    functionResult = await getWeather(args.location || address);
                } else if (name === 'get_food_trends') {
                    functionResult = await getFoodTrends(args.keyword || businessName, args.geo || 'KR');
                } else {
                    functionResult = { error: `Unknown function: ${name}` };
                }
            } catch (err) {
                functionResult = { error: err instanceof Error ? err.message : 'Function execution failed' };
            }

            // functionResponse를 대화에 추가
            contents.push({
                role: 'user',
                parts: [{
                    functionResponse: {
                        name,
                        response: { result: functionResult },
                    },
                }],
            });
        }

        res.status(500).json({ error: 'Function calling loop exceeded maximum iterations' });
    } catch (error) {
        console.error('Analyze trends error:', error);
        res.status(500).json({
            error: 'Failed to analyze trends',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// 랜딩페이지 업데이트 API
app.put('/api/landing-pages/:pageId', async (req: Request, res: Response) => {
    try {
        const { pageId } = req.params;
        const { businessName, description, address, photoBase64, imageAnalysis } = req.body;

        if (!businessName || !description || !address || !photoBase64) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['businessName', 'description', 'address', 'photoBase64'],
            });
            return;
        }

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
            imageAnalysis,
        });

        // GCS에 업로드 (기존 pageId로 덮어쓰기)
        const { publicUrl } = await uploadLandingPageToGCS(htmlContent, pageId);

        // DB UPDATE
        db.run(
            'UPDATE landing_pages SET business_name = ?, public_url = ? WHERE page_id = ?',
            [businessName, publicUrl, pageId],
            function (err) {
                if (err) {
                    console.error('Error updating database:', err);
                }
            }
        );

        res.json({
            success: true,
            pageId,
            url: publicUrl,
            message: 'Landing page updated successfully',
        });
    } catch (error) {
        console.error('Error updating landing page:', error);
        res.status(500).json({
            error: 'Failed to update landing page',
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
