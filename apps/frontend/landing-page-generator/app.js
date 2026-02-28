document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('generator-form');
    const photoInput = document.getElementById('photo');
    const fileNameDisplay = document.getElementById('file-name');
    const resultArea = document.getElementById('result');
    const resetBtn = document.getElementById('reset-btn');

    photoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = e.target.files[0].name;
            fileNameDisplay.style.color = '#e2e8f0';
        } else {
            fileNameDisplay.textContent = '클릭하여 가게 사진을 업로드하세요';
            fileNameDisplay.style.color = '#94a3b8';
        }
    });

    function formatDate(date) {
        const yy = String(date.getFullYear()).slice(-2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yy}.${mm}.${dd} ${hh}:${min}`;
    }

    const generateTemplate = (businessName, description, address, b64Image) => {
        const encodedAddress = encodeURIComponent(address);
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

        .hero { width: 100%; height: 400px; background-color: #ddd; position: relative; overflow: hidden; }
        .hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); padding: 40px 20px 20px; color: white; text-align: center; }
        .hero-overlay h1 { font-size: 2.5rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); margin-bottom: 10px; }
        .container { max-width: 800px; margin: -40px auto 40px; padding: 0 20px; position: relative; z-index: 10; }
        .card { background: var(--card-bg); border-radius: 16px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; }
        .description { font-size: 1.25rem; color: var(--text-muted); margin-bottom: 40px; white-space: pre-wrap; }
        .divider { height: 1px; background-color: #eee; margin: 30px 0; width: 100%; }
        .address-section { display: flex; flex-direction: column; align-items: center; gap: 15px; margin-bottom: 20px; }
        .address-text { font-size: 1.2rem; font-weight: 500; display: flex; align-items: center; gap: 8px; }
        .map-btn { display: inline-flex; align-items: center; gap: 8px; background-color: var(--primary-color); color: white; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-size: 1.1rem; font-weight: 700; transition: transform 0.2s, background-color 0.2s; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3); }
        .map-btn:hover { background-color: #43a047; transform: translateY(-2px); }
        footer { text-align: center; padding: 30px 20px; color: var(--text-muted); font-size: 0.95rem; }
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
        <img src="${b64Image}" alt="${businessName} 매장 사진">
        <div class="hero-overlay"><h1>${businessName}</h1></div>
    </div>
    <div class="container">
        <div class="card">
            <div class="description">${description}</div>
            <div class="divider"></div>
            <div class="address-section">
                <div class="address-text">📍 ${address}</div>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodedAddress}" class="map-btn" target="_blank" rel="noopener noreferrer">🗺️ 구글 맵에서 위치 보기</a>
            </div>
        </div>
    </div>
    <footer>&copy; ${new Date().getFullYear()} ${businessName}. 만드신 랜딩페이지입니다.</footer>
</body>
</html>`;
    };

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
        const originalText = generateBtn.innerHTML;
        generateBtn.textContent = '⏳ 생성 중...';
        generateBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = function (event) {
            const base64Image = event.target.result;
            const htmlStr = generateTemplate(businessName, description, address, base64Image);

            const now = new Date();
            const filename = `가게소개페이지-${formatDate(now)}.html`;

            const newPage = {
                id: Date.now().toString(),
                filename: filename,
                html: htmlStr
            };

            // Send to parent window if inside an iframe
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'PAGE_GENERATED', page: newPage }, '*');
            } else {
                // Fallback: direct LocalStorage save if opened independently
                let savedPages = JSON.parse(localStorage.getItem('bizPages')) || [];
                savedPages.push(newPage);
                localStorage.setItem('bizPages', JSON.stringify(savedPages));
            }

            // UI Update
            form.style.display = 'none';
            resultArea.classList.remove('hidden');

            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        };

        reader.readAsDataURL(file);
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        fileNameDisplay.textContent = '클릭하여 가게 사진을 업로드하세요';
        fileNameDisplay.style.color = '#94a3b8';
        form.style.display = 'block';
        resultArea.classList.add('hidden');
    });
});
