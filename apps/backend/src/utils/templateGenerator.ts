/**
 * 랜딩페이지 HTML 생성기
 * 1-create-static 브랜치의 템플릿 기반
 */

export interface ImageAnalysis {
    atmosphere: string[];
    menuFeatures: string[];
    colorScheme: {
        primary: string;
        secondary: string;
        accent: string;
    };
    enhancedDescription: string;
    tags: string[];
}

export interface LandingPageData {
    businessName: string;
    description: string;
    address: string;
    photoBase64: string; // data:image/...;base64,xxx 형식
    imageAnalysis?: ImageAnalysis;
    heroImageUrl?: string; // AI 생성 히어로 이미지 URL (base64 data URI 또는 공개 URL)
}

export function generateLandingPageHTML(data: LandingPageData): string {
    const { businessName, description, address, photoBase64, imageAnalysis, heroImageUrl } = data;
    const encodedAddress = encodeURIComponent(address);
    const currentYear = new Date().getFullYear();

    if (imageAnalysis) {
        return generateEnhancedHTML(businessName, description, address, photoBase64, encodedAddress, currentYear, imageAnalysis, heroImageUrl);
    }

    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${businessName} - ${description}">
    <title>${businessName} - 환영합니다!</title>
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #4CAF50;
            --text-main: #333333;
            --text-muted: #666666;
            --bg-color: #f7f9fc;
            --card-bg: #ffffff;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }

        .hero {
            width: 100%;
            height: 400px;
            background-color: #ddd;
            position: relative;
            overflow: hidden;
        }

        .hero img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .hero-overlay {
            position: absolute;
            bottom: 0; left: 0; right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.7));
            padding: 40px 20px 20px;
            color: white;
            text-align: center;
        }

        .hero-overlay h1 {
            font-size: 2.5rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            margin-bottom: 10px;
        }

        .container {
            max-width: 800px;
            margin: -40px auto 40px;
            padding: 0 20px;
            position: relative;
            z-index: 10;
        }

        .card {
            background: var(--card-bg);
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            text-align: center;
        }

        .description {
            font-size: 1.25rem;
            color: var(--text-muted);
            margin-bottom: 40px;
            white-space: pre-wrap;
        }

        .divider {
            height: 1px;
            background-color: #eee;
            margin: 30px 0;
            width: 100%;
        }

        .address-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
        }

        .address-text {
            font-size: 1.2rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .map-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background-color: var(--primary-color);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 30px;
            font-size: 1.1rem;
            font-weight: 700;
            transition: transform 0.2s, background-color 0.2s;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }

        .map-btn:hover {
            background-color: #43a047;
            transform: translateY(-2px);
        }

        footer {
            text-align: center;
            padding: 30px 20px;
            color: var(--text-muted);
            font-size: 0.95rem;
        }

        @media (max-width: 600px) {
            .hero { height: 300px; }
            .hero-overlay h1 { font-size: 2rem; }
            .card { padding: 30px 20px; }
            .description { font-size: 1.1rem; }
            .map-btn { width: 100%; justify-content: center; }
        }
    </style>
</head>
<body>

    <div class="hero">
        <img src="${photoBase64}" alt="${businessName} 매장 사진">
        <div class="hero-overlay">
            <h1>${businessName}</h1>
        </div>
    </div>

    <div class="container">
        <div class="card">
            <div class="description">${description}</div>

            <div class="divider"></div>

            <div class="address-section">
                <div class="address-text">
                    📍 ${address}
                </div>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodedAddress}" class="map-btn" target="_blank" rel="noopener noreferrer">
                    🗺️ 구글 맵에서 위치 보기
                </a>
            </div>
        </div>
    </div>

    <footer>
        &copy; ${currentYear} ${businessName}. 만드신 랜딩페이지입니다.
    </footer>

</body>
</html>`;
}

function generateEnhancedHTML(
    businessName: string,
    description: string,
    address: string,
    photoBase64: string,
    encodedAddress: string,
    currentYear: number,
    analysis: ImageAnalysis,
    heroImageUrl?: string,
): string {
    const { atmosphere, menuFeatures, colorScheme, enhancedDescription, tags } = analysis;
    const primaryColor = colorScheme?.primary || '#4CAF50';
    const secondaryColor = colorScheme?.secondary || '#2196F3';
    const accentColor = colorScheme?.accent || '#FF9800';

    const atmosphereBadges = atmosphere?.length
        ? `<div class="atmosphere-badges">${atmosphere.map(a => `<span class="atmosphere-badge">${a}</span>`).join('')}</div>`
        : '';

    const tagsHtml = tags?.length
        ? `<div class="tags-section">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`
        : '';

    const featuresHtml = menuFeatures?.length
        ? `<div class="features-section">
                <div class="features-title">이런 점이 특별해요</div>
                <ul class="features-list">${menuFeatures.map(f => `<li>${f}</li>`).join('')}</ul>
            </div>`
        : '';

    // 히어로 이미지: AI 생성 이미지가 있으면 사용, 없으면 원본 사진 + 그라디언트 배경
    const heroImgSrc = heroImageUrl || photoBase64;
    const heroStyle = heroImageUrl
        ? '.hero { width: 100%; height: 450px; position: relative; overflow: hidden; }'
        : `.hero { width: 100%; height: 450px; position: relative; overflow: hidden; background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); }`;

    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${businessName} - ${enhancedDescription || description}">
    <title>${businessName} - 환영합니다!</title>
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: ${primaryColor};
            --secondary-color: ${secondaryColor};
            --accent-color: ${accentColor};
            --text-main: #333333;
            --text-muted: #666666;
            --bg-color: #f7f9fc;
            --card-bg: #ffffff;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: var(--bg-color); color: var(--text-main); line-height: 1.6; -webkit-font-smoothing: antialiased; }
        ${heroStyle}
        .hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.75)); padding: 50px 20px 25px; color: white; text-align: center; }
        .hero-overlay h1 { font-size: 2.8rem; text-shadow: 2px 2px 8px rgba(0,0,0,0.6); margin-bottom: 8px; }
        .atmosphere-badges { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
        .atmosphere-badge { background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 6px 16px; border-radius: 20px; font-size: 0.9rem; color: white; border: 1px solid rgba(255,255,255,0.3); }
        .container { max-width: 800px; margin: -50px auto 40px; padding: 0 20px; position: relative; z-index: 10; }
        .card { background: var(--card-bg); border-radius: 20px; padding: 45px; box-shadow: 0 15px 40px rgba(0,0,0,0.1); text-align: center; }
        .enhanced-desc { font-size: 1.3rem; color: var(--text-main); margin-bottom: 30px; line-height: 1.8; white-space: pre-wrap; }
        .tags-section { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 30px; }
        .tag { background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); color: white; padding: 6px 14px; border-radius: 15px; font-size: 0.85rem; font-weight: 500; }
        .features-section { background: linear-gradient(135deg, ${primaryColor}08, ${secondaryColor}08); border-radius: 16px; padding: 30px; margin-bottom: 30px; text-align: left; }
        .features-title { font-size: 1.2rem; font-weight: 700; color: var(--primary-color); margin-bottom: 15px; text-align: center; }
        .features-list { list-style: none; display: grid; gap: 12px; }
        .features-list li { display: flex; align-items: center; gap: 10px; font-size: 1.05rem; color: var(--text-main); }
        .features-list li::before { content: ''; width: 8px; height: 8px; background: var(--accent-color); border-radius: 50%; flex-shrink: 0; }
        .divider { height: 1px; background: linear-gradient(to right, transparent, #ddd, transparent); margin: 30px 0; }
        .address-section { display: flex; flex-direction: column; align-items: center; gap: 15px; }
        .address-text { font-size: 1.2rem; font-weight: 500; display: flex; align-items: center; gap: 8px; }
        .map-btn { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); color: white; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-size: 1.1rem; font-weight: 700; transition: transform 0.2s; box-shadow: 0 4px 15px ${primaryColor}40; }
        .map-btn:hover { transform: translateY(-2px); }
        footer { text-align: center; padding: 30px 20px; color: var(--text-muted); font-size: 0.95rem; }
        @media (max-width: 600px) {
            .hero { height: 300px; }
            .hero-overlay h1 { font-size: 2rem; }
            .card { padding: 30px 20px; }
            .map-btn { width: 100%; justify-content: center; }
        }
    </style>
</head>
<body>
    <div class="hero">
        <img src="${heroImgSrc}" alt="${businessName} 매장 사진">
        <div class="hero-overlay">
            <h1>${businessName}</h1>
            ${atmosphereBadges}
        </div>
    </div>
    <div class="container">
        <div class="card">
            <div class="enhanced-desc">${enhancedDescription || description}</div>
            ${tagsHtml}
            ${featuresHtml}
            <div class="divider"></div>
            <div class="address-section">
                <div class="address-text">📍 ${address}</div>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodedAddress}" class="map-btn" target="_blank" rel="noopener noreferrer">
                    🗺️ 구글 맵에서 위치 보기
                </a>
            </div>
        </div>
    </div>
    <footer>&copy; ${currentYear} ${businessName}. 만드신 랜딩페이지입니다.</footer>
</body>
</html>`;
}
