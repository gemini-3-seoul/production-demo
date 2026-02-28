document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const navBtns = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');
    const pageList = document.getElementById('page-list');

    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send');
    const chatMessages = document.getElementById('chat-messages');

    const previewIframe = document.getElementById('preview-iframe');
    function switchView(viewId) {
        navBtns.forEach(btn => {
            if (btn.dataset.target === viewId) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        document.querySelectorAll('.page-item').forEach(item => item.classList.remove('active'));

        viewSections.forEach(section => {
            if (section.id === viewId) section.classList.add('active');
            else section.classList.remove('active');
        });
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.target));
    });

    // Date formatter
    function formatDate(date) {
        const yy = String(date.getFullYear()).slice(-2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yy}.${mm}.${dd} ${hh}:${min}`;
    }

    // Render Saved Pages List
    function renderPageList() {
        pageList.innerHTML = '';
        savedPages.forEach(page => {
            const li = document.createElement('li');
            li.className = 'page-item';
            li.textContent = `📄 ${page.filename}`;
            li.addEventListener('click', () => {
                showPreview(page);
                navBtns.forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.page-item').forEach(i => i.classList.remove('active'));
                li.classList.add('active');
            });
            pageList.appendChild(li);
        });
    }

    function showPreview(page) {
        currentPreviewPage = page;
        previewTitle.textContent = page.filename;
        previewIframe.srcdoc = page.html;

        viewSections.forEach(section => section.classList.remove('active'));
        document.getElementById('view-preview').classList.add('active');
    }

    // Preview Download Button
    downloadCurrentBtn.addEventListener('click', () => {
        if (!currentPreviewPage) return;

        const blob = new Blob([currentPreviewPage.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = currentPreviewPage.filename;
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // --- GEMINI AI CHAT LOGIC ---
    let conversationHistory = [];

    // Base prompt hiding in the first user message
    const SYSTEM_PROMPT = `
당신은 한국의 소상공인을 도와주는 매우 친절하고 상냥한 AI 비서 '제미나이'입니다.
당신의 유일한 목표는 사용자와 자연스럽게 대화하며 '가게 랜딩페이지'를 만들기 위한 3가지 필수 정보를 모두 수집하는 것입니다.

필수 정보 3가지:
1. 상호명 (가게 이름)
2. 가게 소개말 (고객에게 전할 친절하고 짧은 소개/인사말)
3. 가게 주소 (구글 지도에 검색될 수 있는 주소)

지시사항:
- 한 번에 너무 많은 것을 묻지 말고 대화하듯 자연스럽게 질문해 주세요.
- 위 3가지 정보가 아직 다 모이지 않았다면, 빠진 정보를 알려달라고 친절하게 요청하세요.
- 만약 위 3가지 정보가 **모두 수집되었다면**, 사용자에게 완료되었다는 멘트와 함께 대답 맨 마지막에 반드시 아래 형식의 JSON 블록을 추가해야 합니다.

\`\`\`json
{
  "action": "generate",
  "businessName": "수집된 가게 이름",
  "description": "수집된 소개말",
  "address": "수집된 주소"
}
\`\`\`
위 JSON 블록 이외에는 어떤 다른 JSON도 출력하지 마세요.`;

    function appendMessage(sender, htmlContent) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender === 'user' ? 'user-msg' : 'ai-msg'}`;
        msgDiv.innerHTML = htmlContent;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function handleChat() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Append User Message to UI
        appendMessage('user', text);
        chatInput.value = '';
        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        // Add to history
        let messageText = text;
        if (conversationHistory.length === 0) {
            messageText = SYSTEM_PROMPT + "\n\n사용자 메시지: " + text;
        }

        conversationHistory.push({
            role: "user",
            parts: [{ text: messageText }]
        });

        // Add temporary loading message
        const loadingId = 'loading-' + Date.now();
        appendMessage('ai', `<span id="${loadingId}">⏳ 생각 중...</span>`);

        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: conversationHistory })
            });

            if (!response.ok) {
                throw new Error(`Server Error: ${response.status}`);
            }

            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;

            // Save AI response to history
            conversationHistory.push({
                role: "model",
                parts: [{ text: aiText }]
            });

            // Remove loading
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.parentElement.remove();

            // Check for JSON action
            const jsonMatch = aiText.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/);

            if (jsonMatch) {
                // Parsing JSON and show upload UI
                const parsed = JSON.parse(jsonMatch[1]);
                const displayMsg = aiText.replace(/\`\`\`json\n([\s\S]*?)\n\`\`\`/, '').replace(/\n/g, '<br>');

                // Show AI text
                appendMessage('ai', displayMsg);

                // Inject Photo Upload UI
                injectPhotoUploadUI(parsed);

            } else {
                // Normal chat response
                appendMessage('ai', aiText.replace(/\n/g, '<br>'));
            }

        } catch (error) {
            console.error(error);
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.parentElement.remove();
            appendMessage('ai', '❌ 통신 중 오류가 발생했습니다. API Key를 확인하시거나 다시 시도해주세요.');
            // Remove the failed user message from history to allow retry
            conversationHistory.pop();
        } finally {
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            chatInput.focus();
        }
    }

    chatSendBtn.addEventListener('click', handleChat);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !chatInput.disabled) handleChat();
    });

    // --- PHOTO UPLOAD & PAGE GENERATION VIA CHAT ---
    function injectPhotoUploadUI(pageData) {
        const uploadAreaId = 'upload-area-' + Date.now();
        const html = `
            <div style="margin-top: 15px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px dashed var(--primary);">
                <p style="margin-bottom: 10px; font-weight: bold; color: #4ade80;">✅ 가게 메인 사진만 남았습니다!</p>
                <input type="file" id="chat-photo-${uploadAreaId}" accept="image/*" style="display: block; margin-bottom: 10px; width: 100%; color: white;">
                <button id="chat-generate-${uploadAreaId}" class="btn-primary" style="width: 100%;">🚀 최종 랜딩페이지 생성</button>
            </div>
        `;
        appendMessage('ai', html);

        const photoInput = document.getElementById(`chat-photo-${uploadAreaId}`);
        const generateBtn = document.getElementById(`chat-generate-${uploadAreaId}`);

        generateBtn.addEventListener('click', () => {
            const file = photoInput.files[0];
            if (!file) {
                alert("가게 사진을 먼저 선택해주세요!");
                return;
            }

            generateBtn.textContent = '⏳ 페이지 생성 중...';
            generateBtn.disabled = true;

            const reader = new FileReader();
            reader.onload = function (event) {
                const base64Image = event.target.result;
                const htmlStr = generateStaticHtml(pageData.businessName, pageData.description, pageData.address, base64Image);

                const now = new Date();
                const filename = `가게소개페이지-${formatDate(now)}.html`;

                const newPage = {
                    id: Date.now().toString(),
                    filename: filename,
                    html: htmlStr
                };

                // Save to LocalStorage
                savedPages = JSON.parse(localStorage.getItem('bizPages')) || [];
                savedPages.push(newPage);
                try {
                    localStorage.setItem('bizPages', JSON.stringify(savedPages));
                } catch (e) {
                    console.error("Storage error: ", e);
                }

                renderPageList();

                appendMessage('ai', `🎉 <strong>완료!</strong> '${filename}' 페이지가 성공적으로 생성되었습니다.<br>좌측 메뉴에서 선택하여 미리보기를 확인하세요!`);
                switchView('view-preview');
                showPreview(newPage);

                generateBtn.textContent = '✅ 완료';
            };

            reader.readAsDataURL(file);
        });
    }

    // Static HTML Template Function
    const generateStaticHtml = (businessName, description, address, b64Image) => {
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
        :root { --primary-color: #4CAF50; --text-main: #333333; --text-muted: #666666; --bg-color: #f7f9fc; --card-bg: #ffffff; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Pretendard', sans-serif; background-color: var(--bg-color); color: var(--text-main); line-height: 1.6; -webkit-font-smoothing: antialiased; }
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
        .map-btn { display: inline-flex; align-items: center; gap: 8px; background-color: var(--primary-color); color: white; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-size: 1.1rem; font-weight: 700; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3); }
        .map-btn:hover { background-color: #43a047; transform: translateY(-2px); }
        footer { text-align: center; padding: 30px 20px; color: var(--text-muted); font-size: 0.95rem; }
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
                <a href="https://www.google.com/maps/search/?api=1&query=${encodedAddress}" class="map-btn" target="_blank">🗺️ 구글 맵에서 위치 보기</a>
            </div>
        </div>
    </div>
    <footer>&copy; ${new Date().getFullYear()} ${businessName}</footer>
</body>
</html>`;
    };

    // Listen for messages from the iframe generator
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PAGE_GENERATED') {
            const newPage = event.data.page;
            savedPages = JSON.parse(localStorage.getItem('bizPages')) || [];
            savedPages.push(newPage);
            try {
                localStorage.setItem('bizPages', JSON.stringify(savedPages));
            } catch (e) {
                console.error("Storage error: ", e);
            }
            renderPageList();
        }
    });

    // Initialization
    renderPageList();
});
