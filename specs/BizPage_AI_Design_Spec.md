# 🎨 BizPage AI — 디자인 스펙 (개발자용)
> 이 문서는 개발자가 UI를 구현할 때 바로 복붙해서 쓸 수 있도록 작성되었습니다.

---

## 1. 컬러 토큰 (Color Tokens)

```css
/* ✅ 그대로 복붙해서 CSS 변수로 사용하세요 */

:root {
  /* Primary */
  --color-accent:       #A78BFA;  /* Soft Purple — 버튼, 아이콘, 활성 상태 */
  --color-accent-dark:  #7C3AED;  /* Deep Purple — 사용자 말풍선, hover 상태 */
  --color-secondary:    #F3E8FF;  /* Light Lavender — AI 말풍선 배경, 카드 하이라이트 */

  /* CTA Gradient */
  --gradient-cta: linear-gradient(to right, #A78BFA, #EC4899);
  /* 사용처: "마법처럼 랜딩페이지 만들기" 버튼 */

  /* Layout */
  --color-sidebar:      #18181B;  /* Deep Dark — 왼쪽 사이드바 배경 */
  --color-body:         #F9FAFB;  /* Off White — 메인 채팅/폼 영역 배경 */
  --color-white:        #FFFFFF;  /* 순백 — AI 말풍선, 카드 배경 */

  /* Text */
  --color-text-primary:   #111827;  /* 본문 텍스트 */
  --color-text-secondary: #6B7280;  /* 서브 텍스트, 타임스탬프, placeholder */

  /* Border */
  --color-border:       #E5E7EB;  /* 카드 테두리, 구분선 */
}
```

---

## 2. 컬러 사용처 요약표

| 구분 | 헥스값 | 적용 위치 |
|------|--------|----------|
| Main Accent | `#A78BFA` | 사이드바 활성 버튼, 전송 버튼, 포인트 아이콘 |
| Accent Dark | `#7C3AED` | 사용자 채팅 말풍선, 버튼 hover |
| Secondary | `#F3E8FF` | AI(Gemini) 말풍선 배경, 카드 하이라이트 |
| CTA Gradient | `#A78BFA → #EC4899` | "마법처럼 만들기" 메인 CTA 버튼 |
| Sidebar BG | `#18181B` | 왼쪽 메뉴 사이드바 전체 배경 |
| Main Body | `#F9FAFB` | 채팅 영역, 폼 입력 배경 |
| White | `#FFFFFF` | AI 말풍선, 카드, 팝업 배경 |
| Text Primary | `#111827` | 본문 텍스트 전체 |
| Text Secondary | `#6B7280` | 서브 텍스트, 타임스탬프, placeholder |
| Border | `#E5E7EB` | 카드 테두리, 섹션 구분선 |

---

## 3. 타이포그래피 (Typography)

```css
/* Font: Inter (Google Fonts) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  font-family: 'Inter', sans-serif;
}

/* 사용 규칙 */
/* H1 — 페이지 타이틀 */     font-size: 24px; font-weight: 700;
/* H2 — 섹션 타이틀 */       font-size: 18px; font-weight: 600;
/* Body — 본문 */             font-size: 14px; font-weight: 400;
/* Caption — 타임스탬프 등 */ font-size: 12px; font-weight: 400; color: #6B7280;
/* Button */                  font-size: 14px; font-weight: 600;
```

---

## 4. 화면별 레이아웃 스펙

### 4-1. 전체 레이아웃 구조
```
┌─────────────┬────────────────────────────────────┐
│             │                                    │
│  SIDEBAR    │         MAIN CONTENT               │
│  240px      │         flex-1                     │
│  #18181B    │         #F9FAFB                    │
│             │                                    │
└─────────────┴────────────────────────────────────┘
```

### 4-2. 사이드바 (Sidebar)
- 너비: `240px` 고정
- 배경: `#18181B`
- 상단: 로고 + 서비스명 `BizPage AI`
- 메뉴 항목:
  - 💬 AI chat
  - ✨ 가게소개페이지 만들기
  - 📁 가게소개페이지들
- 활성 메뉴: 배경 `#A78BFA`, 텍스트 `#FFFFFF`
- 비활성 메뉴: 텍스트 `#9CA3AF`

**레퍼런스:** Image 1 (Skillzone) 사이드바 구조

---

### 4-3. AI Chat 화면
```
┌─────────────────────────────────────────┐
│  AI 비서                                │  ← 헤더: #FFFFFF, 하단 border #E5E7EB
│  시스템 내 기능들을 대화로 쉽게 이용해보세요. │
├─────────────────────────────────────────┤
│                                         │
│  [AI 말풍선]                             │  ← 배경 #F3E8FF, 텍스트 #111827
│  안녕하세요! 사장님의 비즈니스를 돕는...   │     border-radius: 12px
│                                         │
│                    [사용자 말풍선]        │  ← 배경 #7C3AED, 텍스트 #FFFFFF
│                    안녕하세요!           │     border-radius: 12px
│                                         │
├─────────────────────────────────────────┤
│  [입력창 placeholder...]    [전송 버튼]  │  ← 전송 버튼: #A78BFA
└─────────────────────────────────────────┘
```

**레퍼런스:** Image 2 (Attmosfire) 채팅 말풍선 레이아웃

---

### 4-4. 가게소개페이지 만들기 (폼 화면)
- 배경: `#F9FAFB`
- 카드 컨테이너: `#FFFFFF`, `border: 1px solid #E5E7EB`, `border-radius: 16px`
- 입력 필드: `border: 1px solid #E5E7EB`, `border-radius: 8px`, `padding: 12px 16px`
- 입력 필드 focus: `border-color: #A78BFA`, `box-shadow: 0 0 0 3px #F3E8FF`
- CTA 버튼: `background: linear-gradient(to right, #A78BFA, #EC4899)`, `border-radius: 12px`

---

### 4-5. 페이지 미리보기 화면
- 상단 헤더: 파일명 표시 + `HTML 파일 다운로드` 버튼 (`#A78BFA`)
- 미리보기 영역: iframe 또는 렌더링 컨테이너
- 다운로드 버튼: outline 스타일, `border: 1px solid #A78BFA`, `color: #A78BFA`

---

## 5. 컴포넌트 스펙

### 버튼
```css
/* Primary Button (전송, 주요 액션) */
.btn-primary {
  background: #A78BFA;
  color: #FFFFFF;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 600;
  font-size: 14px;
}

/* CTA Button (마법처럼 만들기) */
.btn-cta {
  background: linear-gradient(to right, #A78BFA, #EC4899);
  color: #FFFFFF;
  border-radius: 12px;
  padding: 14px 24px;
  font-weight: 700;
  font-size: 16px;
  width: 100%;
}

/* Ghost Button (다운로드 등) */
.btn-ghost {
  background: transparent;
  border: 1px solid #A78BFA;
  color: #A78BFA;
  border-radius: 8px;
  padding: 8px 16px;
}
```

### 카드
```css
.card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  padding: 24px;
}
```

### 말풍선
```css
/* AI (Gemini) 말풍선 */
.bubble-ai {
  background: #F3E8FF;
  color: #111827;
  border-radius: 4px 12px 12px 12px;
  padding: 12px 16px;
  max-width: 70%;
}

/* 사용자 말풍선 */
.bubble-user {
  background: #7C3AED;
  color: #FFFFFF;
  border-radius: 12px 4px 12px 12px;
  padding: 12px 16px;
  max-width: 70%;
  margin-left: auto;
}
```

---

## 6. 레이아웃 — Bento Grid (기능 소개 섹션)

랜딩페이지 하단 기능 소개 섹션에 적용

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* 큰 카드 (2칸 차지) */
.bento-large {
  grid-column: span 2;
}
```

**레퍼런스:** Image 3 (Trickly) 기능 소개 섹션 구조

---

## 7. 디자인 레퍼런스 요약

| 화면 | 참고 레퍼런스 | 가져올 요소 |
|------|-------------|------------|
| 전체 레이아웃 + 사이드바 | Image 1 Skillzone | 다크 사이드바 + 밝은 메인 대비 구조 |
| AI Chat 말풍선 | Image 2 Attmosfire | 말풍선 스타일 + 좌우 정렬 구조 |
| 기능 소개 랜딩 | Image 3 Trickly | Bento Grid, Hero → 기능 → CTA 흐름 |

---

*BizPage AI | Gemini 3 서울 해커톤 | 2026.02.28*
