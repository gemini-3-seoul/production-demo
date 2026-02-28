/**
 * 랜딩페이지 HTML 생성기
 * 1-create-static 브랜치의 템플릿 기반
 */

export interface LandingPageData {
    businessName: string;
    description: string;
    address: string;
    photoBase64: string; // data:image/...;base64,xxx 형식
}

export function generateLandingPageHTML(data: LandingPageData): string {
    const { businessName, description, address, photoBase64 } = data;
    const encodedAddress = encodeURIComponent(address);
    const currentYear = new Date().getFullYear();

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
