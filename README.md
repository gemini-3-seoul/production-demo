# 🚀 BizPage AI
> **AI-powered marketing agent for small business owners**
> Gemini 3 Seoul Hackathon | For Good Track | 2026.02.28

---

## 💬 "사장님은 요리만 하세요. 나머지는 BizPage AI가 합니다."
> *"You focus on cooking. BizPage AI handles the rest."*

---

## 🔥 What is BizPage AI?

In Korea, **1 million small businesses close every year** — 86.7% due to poor sales. Most owners have no time, budget, or technical skills for digital marketing.

BizPage AI solves this with a single Gemini-powered agent:

- 📸 Upload a photo → AI reads your store's vibe
- 💬 Chat with AI → Landing page generated in minutes
- 📱 Instagram card news & Reels auto-created
- 🌐 Deployed to GCP Cloud Run with a unique URL — instantly

**No coding. No marketing agency. Just Gemini.**

---

## ✨ Key Features

### Step 1 — AI Chat Onboarding
The owner simply chats. Gemini asks questions to gather store name, highlights, address, and photo — all within the conversation. No separate forms.

```
Owner: "우리 가게 랜딩페이지 만들어줘"
Gemini: "반갑습니다! 가게 이름이 어떻게 되시나요? 📸 사진도 올려주시면 분위기를 분석해드릴게요!"
```

### Step 2 — Multimodal Photo Analysis
Gemini analyzes the uploaded photo and automatically extracts:
- ✅ Hashtags (e.g. `#혼밥맛집` `#감성카페` `#단체석가능`)
- ✅ Top 3–5 selling points of the store
- ✅ Owner reviews and approves before proceeding

### Step 3 — Landing Page Auto-Generation
One click → professional HTML landing page, instantly:
```
[Hero]   Store name overlay + hero photo
[Body]   Greeting · highlights · address · hashtags
[Footer] "View on Google Maps" button
```
UTM parameter-based dynamic optimization — hero copy and image automatically adapt per traffic source.

### Step 4 — GCP Cloud Run Auto-Deployment
- Unique URL issued instantly (e.g. `bizpage.ai/[store-name]`)
- No server setup, no domain purchase needed
- HTML file download also provided

### Step 5 — AI Agent: Instagram Content (MVP)
After landing page is live, the AI agent auto-creates:
- 📰 **Card News** — 1:1 square image slides for Instagram feed
- 🎬 **Reels** — 9:16 vertical video, 15–30 seconds

Owner previews → approves → downloads → posts directly to Instagram.

---

## 🗺️ User Journey

```
💬 Chat with AI
      ↓
📸 Upload photo → Gemini analyzes
      ↓
✅ Review hashtags & strengths → Approve
      ↓
🌐 Landing page generated & deployed
      ↓
📱 Instagram card news & Reels auto-created
      ↓
🎉 Done. Owner just clicks approve.
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js |
| AI Model | Gemini 3 Flash (Multimodal) |
| Page Generation | HTML / Tailwind CSS |
| SNS Content | Gemini Multimodal + Video Generation API |
| Deployment | GCP Cloud Run |
| Storage | Firestore |
| Post-MVP | Google Trends API + Autonomous AI Agent |

---

## 🚀 Post-MVP Roadmap

- **Google Trends Auto-Monitoring** — AI detects trend shifts and proactively suggests landing page updates
  > *"'혼술' searches are surging. Want to update your hero copy to '혼자 와도 편한 우리 가게'?"*
- **Instagram Auto-Publishing** — Trend detected → notification sent → owner approves → content posted
- **SEO Auto-Optimization Loop** — Landing page always reflects latest trending keywords

---

## 📊 Impact

| Metric | Data |
|--------|------|
| Annual small business closures in Korea | 1,000,000+ |
| Closures due to poor sales | 86.7% |
| Owners who can't afford marketing agencies | Most |
| Time to generate landing page with BizPage AI | < 3 minutes |

---

## 🎬 Demo Flow (3 min)

| Time | Content |
|------|---------|
| 0:00–0:20 | Problem — "1M small businesses close in Korea every year" |
| 0:20–1:30 | Live demo — Chat → photo upload → hashtags → landing page |
| 1:30–2:00 | Result — Landing page live URL + Instagram content download |
| 2:00–2:30 | Impact — "No agency. No coding. 3 minutes." |
| 2:30–3:00 | Why Gemini — Multimodal reads photos, reasons about strengths |

---

## 👥 Team

| Name | Role |
|------|------|
| 박규하 | Full-stack (Next.js / Node.js / GCP) |
| 오설화 | Frontend (Next.js / Vite) |
| 이창훈 | Backend (Python / GCP) |
| Journey | PM / Planning / Demo |

---

## ⚡ Getting Started

```bash
# Clone
git clone https://github.com/[team]/bizpage-ai.git
cd bizpage-ai

# Install
npm install

# Set environment variables
cp .env.example .env.local
# Add your GEMINI_API_KEY and GCP credentials

# Run locally
npm run dev
```

---

## 🔑 Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
GCP_PROJECT_ID=your_gcp_project_id
FIRESTORE_DATABASE_ID=your_firestore_id
```

---

*Built with ❤️ at Gemini 3 Seoul Hackathon | For Good Track | 2026.02.28*
