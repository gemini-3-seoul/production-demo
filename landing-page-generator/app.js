document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('generator-form');
    const photoInput = document.getElementById('photo');
    const fileNameDisplay = document.getElementById('file-name');
    const resultArea = document.getElementById('result');
    const downloadBtn = document.getElementById('download-btn');
    
    let generatedHtmlStr = '';

    // 바닐라 HTML 템플릿 코드 생성기
    const generateTemplate = (businessName, description, address, b64Image) => {
        const encodedAddress = encodeURIComponent(address);
        
        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${businessName} - ${description}">
    <title>${businessName} - 환영합니다!</title>
    <!-- 구글 폰트 적용 (보기 좋게 기본 제공) -->
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        /* 누구나 보기 쉬운 직관적이고 깔끔한 바닐라 CSS */
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

    <!-- 매장 사진 영역 -->
    <div class="hero">
        <img src="${b64Image}" alt="${businessName} 매장 사진">
        <div class="hero-overlay">
            <h1>${businessName}</h1>
        </div>
    </div>

    <!-- 메인 컨텐츠 영역 -->
    <div class="container">
        <div class="card">
            <div class="description">${description}</div>
            
            <div class="divider"></div>
            
            <div class="address-section">
                <!-- 주소 텍스트 -->
                <div class="address-text">
                    📍 ${address}
                </div>
                <!-- 구글 맵 연동 링크 -->
                <a href="https://www.google.com/maps/search/?api=1&query=${encodedAddress}" class="map-btn" target="_blank" rel="noopener noreferrer">
                    🗺️ 구글 맵에서 위치 보기
                </a>
            </div>
        </div>
    </div>

    <footer>
        &copy; ${new Date().getFullYear()} ${businessName}. 만드신 랜딩페이지입니다.
    </footer>

</body>
</html>`;
    };

    photoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = e.target.files[0].name;
            fileNameDisplay.style.color = '#e2e8f0';
        } else {
            fileNameDisplay.textContent = '클릭하여 가게 사진을 업로드하세요';
            fileNameDisplay.style.color = '#94a3b8';
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const businessName = document.getElementById('business-name').value;
        const description = document.getElementById('description').value;
        const address = document.getElementById('address').value;
        const file = photoInput.files[0];

        if (!file) {
            alert("사진을 업로드해주세요!");
            return;
        }

        const generateBtn = document.querySelector('.generate-btn');
        generateBtn.textContent = '⏳ 생성 중...';
        generateBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = function(event) {
            // 파일을 base64 포맷으로 변환하여 HTML 내부 코드로 완전히 삽입
            const base64Image = event.target.result;
            
            generatedHtmlStr = generateTemplate(
                businessName,
                description,
                address,
                base64Image
            );

            // UI 업데이트
            form.style.display = 'none';
            resultArea.classList.remove('hidden');
        };
        
        // 추가 작업이 편리한 단일 static HTML 파일을 위해 이미지도 Data URL 형태로 포함
        reader.readAsDataURL(file);
    });

    downloadBtn.addEventListener('click', () => {
        // 생성된 HTML 문자열을 파일로 변환하여 다운로드 트리거
        const blob = new Blob([generatedHtmlStr], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'index.html'; // 1개의 누구나 사용하기 쉬운 Static 파일로 완성됨
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});
