import 'dotenv/config';
import express, { Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { generateLandingPageHTML } from './utils/templateGenerator';
import { uploadLandingPageToGCS, saveCardNewsAsset, getPublicUrl, readStoredFile } from './services/storageService';
import { getWeather } from './services/weatherService';

import { generateImage, buildCardNewsPrompt, buildHeroImagePrompt } from './services/imageGenerationService';

// --- 모델 상수 분리 ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TEXT_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';

// 텍스트 전용 (채팅, 분석, Function Calling)
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`;
const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const app = express();
app.use(express.json({ limit: '10mb' })); // base64 이미지를 위해 limit 증가
app.use(cors());

// 로컬 개발: 저장된 랜딩페이지 정적 서빙
if (!process.env.GCS_BUCKET_NAME) {
    const publicDir = path.join(__dirname, '../public');
    app.use(express.static(publicDir));
    console.log('[Local mode] Serving static files from', publicDir);
}

// Configure SQLite database
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite database at', dbPath);
    }
});

// --- DB Helper ---
const dbRun = (sql: string, params: any[] = []): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, (err) => {
            if (err) { reject(err); return; }
            resolve();
        });
    });
};

const dbAll = (sql: string, params: any[] = []): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) { reject(err); return; }
            resolve(rows);
        });
    });
};

const dbGet = (sql: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) { reject(err); return; }
            resolve(row || null);
        });
    });
};

// --- 유틸리티 ---
const sanitizeText = (value: any): string => {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const safeJsonParse = (value: any): any => {
    if (!value || typeof value !== 'string') return null;
    try { return JSON.parse(value); }
    catch { return null; }
};

const toLandingPageResponse = (row: any) => {
    const fileLocation = row.file_location || '';
    const storedUrl = row.public_url || getPublicUrl(fileLocation);
    return {
        ...row,
        url: storedUrl,
        fileLocation,
        weatherSnapshot: safeJsonParse(row.weather_snapshot),
        trendSnapshot: safeJsonParse(row.trend_snapshot),
    };
};

const toCardNewsResponse = (row: any) => {
    const fileLocations = safeJsonParse(row.file_locations) || [];
    const parsedCards = safeJsonParse(row.cards_json) || [];
    const hashtags = safeJsonParse(row.hashtags) || [];
    const images = Array.isArray(fileLocations)
        ? fileLocations.map((fileLocation: string, idx: number) => ({
            order: idx + 1,
            fileLocation,
            url: getPublicUrl(fileLocation),
        }))
        : [];

    return {
        id: row.id,
        pageId: row.page_id,
        cardDate: row.card_date,
        imageCount: row.image_count,
        cards: parsedCards,
        images,
        instagramText: row.instagram_text,
        hashtags,
        weatherSnapshot: safeJsonParse(row.weather_snapshot),
        trendSnapshot: safeJsonParse(row.trend_snapshot),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

const normalizeKeyword = (value: any): string => {
    const text = String(value || '').trim().replace(/\s+/g, '');
    const koreanAndAlphaNumeric = text.replace(/[^0-9a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
    return koreanAndAlphaNumeric ? `#${koreanAndAlphaNumeric}` : '';
};

const uniqueHashtags = (items: any[]): string[] => {
    const deduped = new Set<string>();
    for (const item of items) {
        const h = normalizeKeyword(item);
        if (h && h.length > 1) deduped.add(h);
    }
    return [...deduped];
};

const splitLines = (text: string, maxLen: number = 25): string[] => {
    const words = String(text || '').split(' ');
    const lines: string[] = [];
    let current = '';
    words.forEach((word) => {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxLen && current) {
            lines.push(current);
            current = word;
        } else {
            current = next;
        }
    });
    if (current) lines.push(current);
    return lines.slice(0, 6);
};

// --- SVG 카드 빌더 (fallback용) ---
const buildCardNewsSvg = (
    businessName: string,
    address: string,
    title: string,
    subtitle: string,
    footer: string,
    index: number,
): string => {
    const palette: [string, string][] = [
        ['#1f2937', '#f59e0b'],
        ['#312e81', '#f472b6'],
        ['#0f766e', '#a78bfa'],
    ];
    const [bg, accent] = palette[index % palette.length];

    const headerLines = splitLines(title, 16);
    const subLines = splitLines(subtitle, 26);
    const footerLines = splitLines(footer, 27);

    const headerText = headerLines.map((line, i) =>
        `<text x="60" y="${150 + i * 36}" fill="white" font-size="44" font-weight="700">${sanitizeText(line)}</text>`,
    ).join('\n');
    const bodyText = subLines.map((line, i) =>
        `<text x="60" y="${250 + i * 34}" fill="#f8fafc" font-size="30">${sanitizeText(line)}</text>`,
    ).join('\n');
    const footerText = footerLines.map((line, i) =>
        `<text x="60" y="${530 + i * 34}" fill="#a5f3fc" font-size="28">${sanitizeText(line)}</text>`,
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#grad)"/>
  <rect x="60" y="70" width="960" height="210" rx="24" fill="rgba(255,255,255,0.2)"/>
  <text x="90" y="120" fill="white" font-size="30" font-family="Arial" font-weight="700">BizPage AI 카드뉴스</text>
  <text x="90" y="160" fill="white" font-size="38" font-family="Arial" font-weight="700">${sanitizeText(`${String(businessName)} · ${String(address)}`)}</text>
  ${headerText}
  ${bodyText}
  ${footerText}
  <rect x="90" y="860" width="900" height="120" rx="24" fill="rgba(15,23,42,0.4)"/>
  <text x="120" y="915" fill="#f8fafc" font-size="30" font-family="Arial">${sanitizeText(`이미지 ${index + 1}/3`)}</text>
  <text x="120" y="955" fill="#bae6fd" font-size="34" font-weight="700" font-family="Arial">${sanitizeText(businessName)}</text>
</svg>`;
};

// --- 카드뉴스 초안 생성기 ---
const generateCardNewsDraft = (
    businessName: string,
    address: string,
    cardDate: string,
    weatherSnapshot: any,
    trendSnapshot: any,
    imageCount: number,
) => {
    const temp = typeof weatherSnapshot?.temperature_C === 'number' ? `${weatherSnapshot.temperature_C}°C` : '온도 미정';
    const weatherCondition = weatherSnapshot?.weatherDesc || '날씨 정보 없음';
    const trendKeywords = [
        ...(weatherSnapshot?.trendBasedKeywords || []),
    ];
    const topTrends = Array.isArray(trendSnapshot?.dailyTopKeywords)
        ? trendSnapshot.dailyTopKeywords.slice(0, 3)
        : [];
    const related = Array.isArray(trendSnapshot?.relatedTopics)
        ? trendSnapshot.relatedTopics.slice(0, 2)
        : [];
    const fallbackKeywords = [
        ...(topTrends.length ? topTrends : ['가게홍보', '신규메뉴']),
        ...(related.length ? related : ['로컬맛집', 'SNS마케팅']),
    ];
    const hashtags = uniqueHashtags([
        ...fallbackKeywords,
        ...trendKeywords,
        businessName,
        '카드뉴스',
        '인스타홍보',
        '로컬브랜딩',
        address,
    ]).slice(0, 8);

    const normalizedCount = Math.min(Math.max(Number(imageCount) || 3, 1), 6);
    const nowText = `${cardDate} 오늘 기준`;
    const cards = [
        {
            title: `${businessName} 방문 유도 카드`,
            body: `지금은 ${weatherCondition} 날씨예요. ${nowText}에도 편안하게 방문해 보세요.`,
            footer: `오늘의 포인트: ${temp}, ${address}`,
            hashtags,
        },
        {
            title: `트렌드 키워드 제안`,
            body: `지금 많이 본 이야기: ${topTrends.join(', ') || '로컬 맛집 추천'}.`,
            footer: `관련 트렌드: ${related.join(', ') || '맛집 탐방'}`,
            hashtags,
        },
        {
            title: `${businessName}만의 매력`,
            body: `소셜 채널에서 바로 공유 가능한 짧은 문구로 구성된 카드뉴스입니다.`,
            footer: '좋아요·저장·공유하고 고객과 만남을 더 늘려보세요.',
            hashtags,
        },
    ];

    const normalizedCards = cards
        .map((card, index) => ({
            ...card,
            hashtags: uniqueHashtags(card.hashtags || []),
            index,
        }))
        .slice(0, normalizedCount);

    const instagramText = `${businessName}의 오늘 홍보 카드뉴스를 준비했어요!\n${nowText} ${address}에서 가볍게 시작하세요.\n${hashtags.join(' ')}`;

    return {
        imageCount: normalizedCount,
        cards: normalizedCards,
        instagramText,
        hashtags,
    };
};

const getKstDateString = (date: Date): string => {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
};

// --- DB 스키마 초기화 ---
const ensureLandingPageSchema = async () => {
    await dbRun(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    await dbRun(`CREATE TABLE IF NOT EXISTS landing_pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page_id TEXT UNIQUE NOT NULL,
            business_name TEXT NOT NULL,
            description TEXT,
            address TEXT,
            public_url TEXT NOT NULL,
            file_location TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_date TEXT,
            weather_snapshot TEXT,
            trend_snapshot TEXT,
            updated_at DATETIME
        )`);
    const columns: any[] = await dbAll('PRAGMA table_info(landing_pages)');
    const existing = new Set(columns.map((c: any) => c.name));
    if (!existing.has('description')) await dbRun('ALTER TABLE landing_pages ADD COLUMN description TEXT');
    if (!existing.has('address')) await dbRun('ALTER TABLE landing_pages ADD COLUMN address TEXT');
    if (!existing.has('file_location')) await dbRun('ALTER TABLE landing_pages ADD COLUMN file_location TEXT');
    if (!existing.has('created_date')) await dbRun('ALTER TABLE landing_pages ADD COLUMN created_date TEXT');
    if (!existing.has('weather_snapshot')) await dbRun('ALTER TABLE landing_pages ADD COLUMN weather_snapshot TEXT');
    if (!existing.has('trend_snapshot')) await dbRun('ALTER TABLE landing_pages ADD COLUMN trend_snapshot TEXT');
    if (!existing.has('updated_at')) await dbRun('ALTER TABLE landing_pages ADD COLUMN updated_at DATETIME');
};

const ensureCardNewsSchema = async () => {
    await dbRun(`CREATE TABLE IF NOT EXISTS card_news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page_id TEXT NOT NULL,
            card_date TEXT NOT NULL,
            image_count INTEGER NOT NULL,
            cards_json TEXT NOT NULL,
            instagram_text TEXT,
            hashtags TEXT,
            file_locations TEXT NOT NULL,
            weather_snapshot TEXT,
            trend_snapshot TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME,
            UNIQUE(page_id, card_date)
        )`);
    const columns: any[] = await dbAll('PRAGMA table_info(card_news)');
    const existing = new Set(columns.map((c: any) => c.name));
    if (!existing.has('image_count')) await dbRun('ALTER TABLE card_news ADD COLUMN image_count INTEGER');
    if (!existing.has('cards_json')) await dbRun('ALTER TABLE card_news ADD COLUMN cards_json TEXT');
    if (!existing.has('instagram_text')) await dbRun('ALTER TABLE card_news ADD COLUMN instagram_text TEXT');
    if (!existing.has('hashtags')) await dbRun('ALTER TABLE card_news ADD COLUMN hashtags TEXT');
    if (!existing.has('file_locations')) await dbRun('ALTER TABLE card_news ADD COLUMN file_locations TEXT');
    if (!existing.has('weather_snapshot')) await dbRun('ALTER TABLE card_news ADD COLUMN weather_snapshot TEXT');
    if (!existing.has('trend_snapshot')) await dbRun('ALTER TABLE card_news ADD COLUMN trend_snapshot TEXT');
    if (!existing.has('updated_at')) await dbRun('ALTER TABLE card_news ADD COLUMN updated_at DATETIME');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_card_news_page_id ON card_news (page_id)');
};

// ====================== API Routes ======================

// Hello API
app.get('/api/hello', (_req: Request, res: Response) => {
    res.json({ message: 'Hello from Node.js Express Backend!' });
});

// 랜딩페이지 목록 조회
app.get('/api/landing-pages', async (req: Request, res: Response) => {
    const businessName = typeof req.query.businessName === 'string' ? req.query.businessName : '';
    const sql = businessName
        ? `SELECT id, page_id, business_name, description, address, public_url, file_location, created_at, created_date, weather_snapshot, trend_snapshot, updated_at
           FROM landing_pages WHERE business_name = ? ORDER BY created_at DESC`
        : `SELECT id, page_id, business_name, description, address, public_url, file_location, created_at, created_date, weather_snapshot, trend_snapshot, updated_at
           FROM landing_pages ORDER BY created_at DESC`;
    const params = businessName ? [businessName] : [];
    try {
        const rows = await dbAll(sql, params);
        res.json({ pages: rows.map(toLandingPageResponse) });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
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
app.get('/api/users', (_req: Request, res: Response) => {
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

// 랜딩페이지 생성 API (+ 히어로 이미지 생성)
app.post('/api/landing-pages', async (req: Request, res: Response) => {
    try {
        const { businessName, description, address, photoBase64, imageAnalysis } = req.body;
        const createdAt = new Date();
        const createdDate = getKstDateString(createdAt);

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

        // 날씨 데이터 조회
        const weatherResult = await getWeather(address).catch((err) => {
            console.warn('Weather fetch failed while creating landing page:', err);
            return null;
        });
        const trendResult = null;

        // Nano Banana 2로 히어로 이미지 생성 시도
        let heroImageUrl: string | undefined;
        if (GEMINI_API_KEY) {
            try {
                const heroPrompt = buildHeroImagePrompt(
                    businessName,
                    description,
                    imageAnalysis?.atmosphere,
                    imageAnalysis?.colorScheme,
                );
                const heroImage = await generateImage(heroPrompt, GEMINI_API_KEY);
                // base64 data URI로 HTML에 인라인 삽입
                const base64Data = heroImage.data.toString('base64');
                heroImageUrl = `data:${heroImage.mimeType};base64,${base64Data}`;
                console.log(`[Hero Image] Generated for ${businessName}`);
            } catch (err) {
                console.warn('[Hero Image] Generation failed, using original photo:', err);
                // fallback: heroImageUrl 없으면 기존 photoBase64 사용
            }
        }

        // HTML 생성 (히어로 이미지 포함)
        const htmlContent = generateLandingPageHTML({
            businessName,
            description,
            address,
            photoBase64,
            imageAnalysis,
            heroImageUrl,
        });

        // GCS에 업로드
        const { pageId, publicUrl, fileLocation } = await uploadLandingPageToGCS(htmlContent);

        // DB에 메타데이터 저장
        db.run(
            `INSERT INTO landing_pages
             (page_id, business_name, description, address, public_url, file_location, created_at, created_date, weather_snapshot, trend_snapshot)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                pageId,
                businessName,
                description,
                address,
                publicUrl,
                fileLocation,
                createdAt.toISOString(),
                createdDate,
                weatherResult ? JSON.stringify(weatherResult) : null,
                trendResult ? JSON.stringify(trendResult) : null,
            ],
            function (err) {
                if (err) {
                    console.error('Error saving to database:', err);
                }
            },
        );

        res.status(201).json({
            success: true,
            pageId,
            url: publicUrl,
            heroImageUrl: heroImageUrl ? 'generated' : null,
            createdAt: createdAt.toISOString(),
            createdDate,
            weatherSnapshot: weatherResult,
            trendSnapshot: trendResult,
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
        const { businessName, description, address, trendKeywords } = req.body;

        if (!businessName || !address) {
            res.status(400).json({ error: 'businessName and address are required' });
            return;
        }

        const userTrendKeywords: string[] = Array.isArray(trendKeywords) ? trendKeywords : [];

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
            ],
        }];

        const trendKeywordsText = userTrendKeywords.length > 0
            ? `\n현재 트렌드 키워드 (사용자 입력): ${userTrendKeywords.join(', ')}\n위 트렌드 키워드와 날씨 데이터를 기반으로 마케팅 인사이트를 분석해주세요.`
            : '';

        const systemPrompt = `당신은 소상공인 마케팅 전문가입니다.
아래 가게 정보를 바탕으로 날씨와 트렌드를 분석하여 마케팅 제안서를 작성해주세요.

가게 정보:
- 상호명: ${businessName}
- 소개: ${description || '없음'}
- 주소: ${address}
${trendKeywordsText}

반드시 get_weather 도구를 사용하여 실시간 날씨 데이터를 수집한 후,
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

            // 모든 functionCall 수집
            const functionCalls = parts.filter((p: any) => p.functionCall);

            if (functionCalls.length === 0) {
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

            // 모든 function call을 병렬로 실행
            const functionResponses = await Promise.all(
                functionCalls.map(async (fc: any) => {
                    const { name, args } = fc.functionCall;
                    let functionResult: any;
                    try {
                        if (name === 'get_weather') {
                            functionResult = await getWeather(args.location || address);
                        } else {
                            functionResult = { error: `Unknown function: ${name}` };
                        }
                    } catch (err) {
                        functionResult = { error: err instanceof Error ? err.message : 'Function execution failed' };
                    }
                    return {
                        functionResponse: {
                            name,
                            response: { result: functionResult },
                        },
                    };
                }),
            );

            // 모든 functionResponse를 하나의 메시지로 추가
            contents.push({
                role: 'user',
                parts: functionResponses,
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

// 카드뉴스 생성 API (SVG → AI 이미지 PNG 전환, SVG fallback)
app.post('/api/card-news', async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const pageId = typeof body.pageId === 'string' ? body.pageId.trim() : '';
        const imageCount = Math.min(Math.max(Number(body.imageCount) || 3, 1), 6);
        const force = body.force === true;

        if (!pageId) {
            res.status(400).json({ error: 'pageId is required' });
            return;
        }

        const page: any = await dbGet(
            `SELECT page_id, business_name, address, weather_snapshot, trend_snapshot
             FROM landing_pages WHERE page_id = ?`,
            [pageId],
        );

        if (!page) {
            res.status(404).json({ error: 'landing page not found' });
            return;
        }

        const cardDate = getKstDateString(new Date());
        const existing = await dbGet(
            `SELECT * FROM card_news WHERE page_id = ? AND card_date = ?`,
            [pageId, cardDate],
        );

        if (existing && !force) {
            res.status(200).json({
                success: true,
                message: 'Card news already exists for today',
                alreadyExist: true,
                ...toCardNewsResponse(existing),
            });
            return;
        }

        const weatherSnapshot = safeJsonParse(page.weather_snapshot);
        const trendSnapshot = safeJsonParse(page.trend_snapshot);
        const draft = generateCardNewsDraft(
            page.business_name, page.address, cardDate,
            weatherSnapshot, trendSnapshot, imageCount,
        );

        // 각 카드에 대해 AI 이미지 생성 시도, 실패 시 SVG fallback
        const savedFiles = await Promise.all(
            draft.cards.map(async (card, idx) => {
                // Nano Banana 2 AI 이미지 생성 시도
                if (GEMINI_API_KEY) {
                    try {
                        const prompt = buildCardNewsPrompt(
                            page.business_name,
                            String(card.title || ''),
                            String(card.body || ''),
                            idx,
                            draft.imageCount,
                        );
                        const image = await generateImage(prompt, GEMINI_API_KEY);
                        // PNG로 저장
                        const result = await saveCardNewsAsset(
                            pageId,
                            `card-${cardDate}-${idx + 1}.png`,
                            image.data,
                            { contentType: 'image/png' },
                        );
                        console.log(`[Card News] AI image generated: card-${cardDate}-${idx + 1}.png`);
                        return result;
                    } catch (err) {
                        console.warn(`[Card News] AI image failed for card ${idx + 1}, falling back to SVG:`, err);
                    }
                }

                // Fallback: 기존 SVG 생성
                const svgContent = buildCardNewsSvg(
                    page.business_name,
                    page.address,
                    String(card.title || ''),
                    String(card.body || ''),
                    String(card.footer || ''),
                    idx,
                );
                return saveCardNewsAsset(
                    pageId,
                    `card-${cardDate}-${idx + 1}.svg`,
                    svgContent,
                );
            }),
        );

        const fileLocations = savedFiles.map((f) => f.fileLocation);

        await dbRun(
            `INSERT INTO card_news (
                page_id, card_date, image_count, cards_json,
                instagram_text, hashtags, file_locations, weather_snapshot,
                trend_snapshot, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(page_id, card_date) DO UPDATE SET
                image_count = excluded.image_count,
                cards_json = excluded.cards_json,
                instagram_text = excluded.instagram_text,
                hashtags = excluded.hashtags,
                file_locations = excluded.file_locations,
                weather_snapshot = excluded.weather_snapshot,
                trend_snapshot = excluded.trend_snapshot,
                updated_at = CURRENT_TIMESTAMP
            `,
            [
                pageId,
                cardDate,
                draft.imageCount,
                JSON.stringify(draft.cards.map((card) => ({
                    title: card.title,
                    body: card.body,
                    footer: card.footer,
                    hashtags: card.hashtags,
                }))),
                draft.instagramText,
                JSON.stringify(draft.hashtags),
                JSON.stringify(fileLocations),
                page.weather_snapshot,
                page.trend_snapshot,
            ],
        );

        const created = await dbGet(
            `SELECT * FROM card_news WHERE page_id = ? AND card_date = ?`,
            [pageId, cardDate],
        );

        if (!created) {
            res.status(500).json({ error: 'Failed to save card news' });
            return;
        }

        const payload = {
            success: true,
            message: existing ? 'Card news regenerated for today' : 'Card news generated',
            alreadyExist: Boolean(existing),
            ...toCardNewsResponse(created),
            weatherSnapshot,
            trendSnapshot,
        };

        res.status(201).json(payload);
    } catch (error) {
        console.error('Card news generation error:', error);
        res.status(500).json({
            error: 'Failed to generate card news',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// 카드뉴스 조회 API
app.get('/api/card-news', async (req: Request, res: Response) => {
    try {
        const pageId = typeof req.query.pageId === 'string' ? req.query.pageId.trim() : '';
        const businessName = typeof req.query.businessName === 'string' ? req.query.businessName.trim() : '';
        const cardDate = typeof req.query.cardDate === 'string' && req.query.cardDate
            ? req.query.cardDate.trim()
            : undefined;

        const conditions: string[] = [];
        const params: string[] = [];

        if (pageId) {
            conditions.push('cn.page_id = ?');
            params.push(pageId);
        }
        if (businessName) {
            conditions.push('lp.business_name = ?');
            params.push(businessName);
        }
        if (cardDate) {
            conditions.push('cn.card_date = ?');
            params.push(cardDate);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const rows = await dbAll(
            `SELECT cn.*, lp.business_name, lp.address
             FROM card_news cn
             LEFT JOIN landing_pages lp ON lp.page_id = cn.page_id
             ${where}
             ORDER BY cn.created_at DESC`,
            params,
        );

        res.json({ cardNews: rows.map(toCardNewsResponse) });
    } catch (error) {
        console.error('Fetch card news error:', error);
        res.status(500).json({
            error: 'Failed to load card news',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// 랜딩페이지 업데이트 API (+ 히어로 이미지 재생성)
app.put('/api/landing-pages/:pageId', async (req: Request, res: Response) => {
    try {
        const { pageId } = req.params;
        const { businessName, description, address, photoBase64, imageAnalysis } = req.body;

        if (!businessName || !description || !address) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['businessName', 'description', 'address'],
            });
            return;
        }

        // photoBase64가 있으면 HTML 재생성, 없으면 메타데이터만 업데이트
        if (photoBase64) {
            if (!photoBase64.startsWith('data:image/')) {
                res.status(400).json({
                    error: 'photoBase64 must be in data:image/... format',
                });
                return;
            }

            // 히어로 이미지 생성 시도
            let heroImageUrl: string | undefined;
            if (GEMINI_API_KEY) {
                try {
                    const heroPrompt = buildHeroImagePrompt(
                        businessName,
                        description,
                        imageAnalysis?.atmosphere,
                        imageAnalysis?.colorScheme,
                    );
                    const heroImage = await generateImage(heroPrompt, GEMINI_API_KEY);
                    const base64Data = heroImage.data.toString('base64');
                    heroImageUrl = `data:${heroImage.mimeType};base64,${base64Data}`;
                    console.log(`[Hero Image] Regenerated for ${businessName}`);
                } catch (err) {
                    console.warn('[Hero Image] Regeneration failed, using original photo:', err);
                }
            }

            // HTML 생성
            const htmlContent = generateLandingPageHTML({
                businessName,
                description,
                address,
                photoBase64,
                imageAnalysis,
                heroImageUrl,
            });

            // GCS에 업로드 (기존 pageId로 덮어쓰기)
            const { publicUrl, fileLocation } = await uploadLandingPageToGCS(htmlContent, pageId);
            const updatedAt = new Date().toISOString();

            db.run(
                `UPDATE landing_pages
                 SET business_name = ?, description = ?, address = ?, public_url = ?, file_location = ?, updated_at = ?
                 WHERE page_id = ?`,
                [businessName, description, address, publicUrl, fileLocation, updatedAt, pageId],
                function (err) {
                    if (err) {
                        console.error('Error updating database:', err);
                        res.status(500).json({ error: 'Failed to update database record', details: err.message });
                        return;
                    }
                    if (this.changes === 0) {
                        res.status(404).json({ error: 'landing page not found' });
                        return;
                    }
                    res.json({
                        success: true, pageId, url: publicUrl,
                        heroImageUrl: heroImageUrl ? 'generated' : null,
                        updatedAt, message: 'Landing page updated successfully',
                    });
                },
            );
        } else {
            // photoBase64 없음 → 기존 HTML에서 사진 추출 후 HTML 재생성
            const existing = await dbGet(
                `SELECT file_location FROM landing_pages WHERE page_id = ?`,
                [pageId],
            );
            if (!existing) {
                res.status(404).json({ error: 'landing page not found' });
                return;
            }

            let extractedPhoto: string | null = null;
            if (existing.file_location) {
                const existingHtml = await readStoredFile(existing.file_location);
                if (existingHtml) {
                    const imgMatch = existingHtml.match(/<img\s+src="(data:image\/[^"]+)"/);
                    extractedPhoto = imgMatch ? imgMatch[1] : null;
                }
            }

            if (!extractedPhoto) {
                res.status(400).json({ error: 'Cannot regenerate HTML: original photo not found. Please re-upload the photo.' });
                return;
            }

            // 히어로 이미지 생성 시도
            let heroImageUrl: string | undefined;
            if (GEMINI_API_KEY) {
                try {
                    const heroPrompt = buildHeroImagePrompt(
                        businessName,
                        description,
                        imageAnalysis?.atmosphere,
                        imageAnalysis?.colorScheme,
                    );
                    const heroImage = await generateImage(heroPrompt, GEMINI_API_KEY);
                    const base64Data = heroImage.data.toString('base64');
                    heroImageUrl = `data:${heroImage.mimeType};base64,${base64Data}`;
                    console.log(`[Hero Image] Regenerated for ${businessName}`);
                } catch (err) {
                    console.warn('[Hero Image] Regeneration failed, using existing photo:', err);
                }
            }

            const htmlContent = generateLandingPageHTML({
                businessName,
                description,
                address,
                photoBase64: extractedPhoto,
                imageAnalysis,
                heroImageUrl,
            });

            const { publicUrl, fileLocation } = await uploadLandingPageToGCS(htmlContent, pageId);
            const updatedAt = new Date().toISOString();

            db.run(
                `UPDATE landing_pages
                 SET business_name = ?, description = ?, address = ?, public_url = ?, file_location = ?, updated_at = ?
                 WHERE page_id = ?`,
                [businessName, description, address, publicUrl, fileLocation, updatedAt, pageId],
                function (err) {
                    if (err) {
                        console.error('Error updating database:', err);
                        res.status(500).json({ error: 'Failed to update database record', details: err.message });
                        return;
                    }
                    if (this.changes === 0) {
                        res.status(404).json({ error: 'landing page not found' });
                        return;
                    }
                    res.json({
                        success: true, pageId, url: publicUrl,
                        heroImageUrl: heroImageUrl ? 'generated' : null,
                        updatedAt, message: 'Landing page updated successfully',
                    });
                },
            );
        }
    } catch (error) {
        console.error('Error updating landing page:', error);
        res.status(500).json({
            error: 'Failed to update landing page',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// ====================== 서버 시작 ======================
const startServer = async () => {
    try {
        await ensureLandingPageSchema();
        await ensureCardNewsSchema();
        console.log('Database schema initialized');
    } catch (error) {
        console.error('Database schema init failed:', error);
    }

    const PORT = process.env.API_PORT || 8081;
    app.listen(PORT, () => {
        console.log(`Backend server is running on port ${PORT}`);
        console.log(`Text model: ${GEMINI_TEXT_MODEL}`);
        console.log(`Image model: ${GEMINI_IMAGE_MODEL}`);
    });
};

startServer();
