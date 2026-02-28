"use client";

import { useState, useEffect, useRef } from "react";

// Types
interface PageData {
  id: string;
  filename: string;
  html: string;
  businessName?: string;
  description?: string;
  address?: string;
  photoBase64?: string;
  gcsUrl?: string;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  isHtml?: boolean;
}

// Format Date Utility
const formatDate = (date: Date) => {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yy}.${mm}.${dd} ${hh}:${min}`;
};

// Static HTML Template Function
const generateStaticHtml = (businessName: string, description: string, address: string, b64Image: string) => {
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

export default function Dashboard() {
  const [activeView, setActiveView] = useState('view-chat');
  const [savedPages, setSavedPages] = useState<PageData[]>([]);
  const [currentPreview, setCurrentPreview] = useState<PageData | null>(null);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    sender: 'ai',
    text: `안녕하세요! 사장님의 비즈니스를 돕는 ✨ <strong>제미나이 AI 비서</strong>입니다.<br><br>
저와 대화하면서 아주 쉽게 가게소개페이지를 만드실 수 있습니다!<br><br>
👉 <i>"우리 가게 랜딩페이지 만들어줘"</i> 라고 첫 마디를 건네보세요!`,
    isHtml: true
  }]);

  // Need raw history for the Gemini proxy
  const conversationHistory = useRef<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generator State
  const [genForm, setGenForm] = useState({ name: '', desc: '', address: '' });
  const [genFile, setGenFile] = useState<File | null>(null);
  const [genStatus, setGenStatus] = useState<'idle' | 'generating' | 'success'>('idle');

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('bizPages');
    if (saved) {
      try {
        setSavedPages(JSON.parse(saved));
      } catch (e) {
        console.error("Localstorage parsing error", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('bizPages', JSON.stringify(savedPages));
  }, [savedPages]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const addPage = (page: PageData) => {
    setSavedPages([...savedPages, page]);
    setCurrentPreview(page);
    setUploadStatus('idle');
    setActiveView('view-preview');
  };

  // Chat Logic
  const handleChat = async (directText?: string) => {
    const text = (directText || chatInput).trim();
    if (!text || isChatLoading) return;

    setChatInput('');
    setIsChatLoading(true);

    const newUserMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text };
    setChatMessages(prev => [...prev, newUserMsg]);

    const SYSTEM_PROMPT = `당신은 한국의 소상공인을 도와주는 매우 친절하고 상냥한 AI 비서 '제미나이'입니다.
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

    let messageText = text;
    if (conversationHistory.current.length === 0) {
      messageText = SYSTEM_PROMPT + "\n\n사용자 메시지: " + text;
    }

    conversationHistory.current.push({ role: "user", parts: [{ text: messageText }] });

    const aiMsgId = Date.now().toString();
    // 스트리밍 중 실시간으로 업데이트할 AI 메시지를 미리 추가
    setChatMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', text: '', isHtml: true }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: conversationHistory.current })
      });

      if (!response.ok) throw new Error(`Server Error: ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // SSE 형식 파싱: "data: {...}\n\n" 에서 JSON 추출
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const partText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            fullText += partText;
            // 실시간 메시지 업데이트
            const displayText = fullText.replace(/```json\n[\s\S]*?```/g, '').replace(/\n/g, '<br/>');
            setChatMessages(prev =>
              prev.map(msg => msg.id === aiMsgId ? { ...msg, text: displayText } : msg)
            );
          } catch {
            // 불완전한 JSON 청크는 무시
          }
        }
      }

      conversationHistory.current.push({ role: "model", parts: [{ text: fullText }] });

      // 스트리밍 완료 후 JSON 블록 확인
      const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        const displayMsg = fullText.replace(/```json\n[\s\S]*?```/, '').replace(/\n/g, '<br/>');

        // 최종 텍스트로 갱신
        setChatMessages(prev =>
          prev.map(msg => msg.id === aiMsgId ? { ...msg, text: displayMsg } : msg)
        );

        // 사진 업로드 UI 추가
        const uploadHtmlId = `upload-${Date.now()}`;
        setChatMessages(prev => [...prev, {
          id: uploadHtmlId,
          sender: 'ai',
          text: JSON.stringify(parsed),
          isHtml: false
        }]);
      } else {
        // 최종 텍스트 반영
        setChatMessages(prev =>
          prev.map(msg => msg.id === aiMsgId ? { ...msg, text: fullText.replace(/\n/g, '<br/>') } : msg)
        );
      }
    } catch (e) {
      console.error(e);
      setChatMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== aiMsgId);
        return [...filtered, { id: Date.now().toString(), sender: 'ai', text: '❌ 통신 중 오류가 발생했습니다. 백엔드 서버(Proxy)가 실행중인지 확인해주세요.' }];
      });
      conversationHistory.current.pop();
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, pageDataStr: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const pageData = JSON.parse(pageDataStr);
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      const htmlStr = generateStaticHtml(pageData.businessName, pageData.description, pageData.address, b64);
      const filename = `가게소개페이지-${formatDate(new Date())}.html`;

      addPage({
        id: Date.now().toString(),
        filename,
        html: htmlStr,
        businessName: pageData.businessName,
        description: pageData.description,
        address: pageData.address,
        photoBase64: b64,
      });
    };
    reader.readAsDataURL(file);
  };

  // Generator Logic
  const handleGeneratorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genFile) {
      alert("사진을 업로드해주세요!");
      return;
    }
    setGenStatus('generating');

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      const htmlStr = generateStaticHtml(genForm.name, genForm.desc, genForm.address, b64);
      const filename = `가게소개페이지-${formatDate(new Date())}.html`;

      setTimeout(() => {
        addPage({ id: Date.now().toString(), filename, html: htmlStr });
        setGenStatus('success');
      }, 500); // Small artificial delay
    };
    reader.readAsDataURL(genFile);
  };

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');

  const handleUploadToGCS = async (page: PageData) => {
    if (!page.businessName || !page.photoBase64) return;
    setUploadStatus('uploading');

    try {
      const res = await fetch('/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: page.businessName,
          description: page.description,
          address: page.address,
          photoBase64: page.photoBase64,
        }),
      });

      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      const data = await res.json();

      // gcsUrl을 PageData에 저장
      const updated = { ...page, gcsUrl: data.url };
      setSavedPages(prev => prev.map(p => p.id === page.id ? updated : p));
      setCurrentPreview(updated);
      setUploadStatus('done');
    } catch (e) {
      console.error('GCS upload error:', e);
      setUploadStatus('error');
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🚀 BizPage AI</h2>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-btn ${activeView === 'view-chat' ? 'active' : ''}`}
            onClick={() => setActiveView('view-chat')}
          >
            💬 AI chat
          </button>
          <button
            className={`nav-btn ${activeView === 'view-generator' ? 'active' : ''}`}
            onClick={() => { setActiveView('view-generator'); setGenStatus('idle'); }}
          >
            ✨ 가게소개페이지 만들기
          </button>

          <div className="nav-section">
            <span className="section-title">📂 가게소개페이지들</span>
            <ul className="page-list">
              {savedPages.map(page => (
                <li
                  key={page.id}
                  className={`page-item ${currentPreview?.id === page.id && activeView === 'view-preview' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentPreview(page);
                    setActiveView('view-preview');
                  }}
                >
                  📄 {page.filename}
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">

        {/* Chat View */}
        {activeView === 'view-chat' && (
          <section className="view-section active">
            <div className="chat-wrapper">
              <div className="chat-header">
                <h2>AI 비서</h2>
                <p>시스템 내 기능들을 대화로 쉽게 이용해보세요.</p>
              </div>
              <div className="chat-messages">
                {chatMessages.map((msg, i) => {
                  if (msg.id.startsWith('upload-')) {
                    // Render Photo Upload Block
                    return (
                      <div key={msg.id} className="message ai-msg" style={{ background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--brand-primary)', width: '100%', maxWidth: '350px' }}>
                        <p style={{ marginBottom: '10px', fontWeight: 'bold', color: '#4ade80' }}>✅ 가게 메인 사진만 남았습니다!</p>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'block', marginBottom: '10px', width: '100%', color: 'white' }}
                          onChange={(e) => handleChatPhotoUpload(e, msg.text)}
                        />
                        <p style={{ fontSize: '0.8rem', color: '#ccc' }}>사진을 선택하면 바로 최종 페이지가 생성됩니다.</p>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id || i} className={`message ${msg.sender === 'user' ? 'user-msg' : 'ai-msg'}`}>
                      {msg.isHtml ? <span dangerouslySetInnerHTML={{ __html: msg.text }} /> : msg.text}
                    </div>
                  );
                })}
                {isChatLoading && (
                  <div className="message ai-msg">⏳ 생각 중...</div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input-area">
                {chatMessages.length <= 1 && !isChatLoading && (
                  <div className="chat-suggestions">
                    <button
                      className="suggestion-btn"
                      onClick={() => handleChat('우리 가게 랜딩페이지 만들어줘')}
                    >
                      ✨ 우리 가게 랜딩페이지 만들어줘
                    </button>
                  </div>
                )}
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChat()}
                  placeholder="메시지를 입력하세요..."
                  disabled={isChatLoading}
                />
                <button onClick={() => handleChat()} disabled={isChatLoading}>전송</button>
              </div>
              </div>
            </div>
          </section>
        )}

        {/* Generator View */}
        {activeView === 'view-generator' && (
          <section className="view-section active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="generator-container">
              <header className="text-center">
                <h2>랜딩페이지 생성기</h2>
                <p>소상공인 사장님을 위한 초간단 랜딩페이지 만들기</p>
              </header>

              {genStatus === 'idle' && (
                <form onSubmit={handleGeneratorSubmit}>
                  <div className="form-group">
                    <label>상호명 (가게 이름)</label>
                    <input type="text" value={genForm.name} onChange={e => setGenForm({ ...genForm, name: e.target.value })} placeholder="예: 맛있는 빵집" required />
                  </div>
                  <div className="form-group">
                    <label>가게 소개 (인삿말)</label>
                    <textarea value={genForm.desc} onChange={e => setGenForm({ ...genForm, desc: e.target.value })} rows={3} placeholder="고객에게 전할 간단하고 친절한 인사말을 적어주세요!" required></textarea>
                  </div>
                  <div className="form-group">
                    <label>가게 주소</label>
                    <input type="text" value={genForm.address} onChange={e => setGenForm({ ...genForm, address: e.target.value })} placeholder="예: 서울특별시 강남구 테헤란로 123" required />
                  </div>
                  <div className="form-group">
                    <label>대표 사진</label>
                    <div className="file-upload-wrapper">
                      <input type="file" accept="image/*" onChange={e => setGenFile(e.target.files?.[0] || null)} required />
                      <div className="file-upload-visual">
                        <span>{genFile ? genFile.name : "클릭하여 가게 사진을 업로드하세요"}</span>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="generate-btn">
                    ✨ 마법처럼 랜딩페이지 만들기
                  </button>
                </form>
              )}

              {genStatus === 'generating' && (
                <div className="result-area">
                  <p>⏳ 생성 중...</p>
                </div>
              )}

              {genStatus === 'success' && (
                <div className="result-area">
                  <p>✅ 랜딩페이지가 성공적으로 생성 및 자동 저장되었습니다!</p>
                  <p className="preview-hint">좌측 메뉴의 <strong>'📂 가게소개페이지들'</strong> 목록에서 확인하실 수 있습니다.</p>
                  <button onClick={() => { setGenStatus('idle'); setGenForm({ name: '', desc: '', address: '' }); setGenFile(null); }} className="secondary-btn">새로운 페이지 만들기</button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Preview View */}
        {activeView === 'view-preview' && currentPreview && (
          <section className="view-section active">
            <div className="preview-header">
              <h2>미리보기: {currentPreview.filename}</h2>
              <div className="preview-actions">
                {currentPreview.gcsUrl ? (
                  <a href={currentPreview.gcsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-success">
                    🌐 배포된 페이지 열기
                  </a>
                ) : currentPreview.businessName ? (
                  <button
                    className="btn-primary"
                    onClick={() => handleUploadToGCS(currentPreview)}
                    disabled={uploadStatus === 'uploading'}
                  >
                    {uploadStatus === 'uploading' ? '⏳ 업로드 중...' : '🚀 웹에 배포하기'}
                  </button>
                ) : null}
                {uploadStatus === 'error' && (
                  <span className="upload-error">업로드 실패. 다시 시도해주세요.</span>
                )}
              </div>
            </div>
            <div className="iframe-wrapper">
              <iframe srcDoc={currentPreview.html} title="landing page preview" />
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
