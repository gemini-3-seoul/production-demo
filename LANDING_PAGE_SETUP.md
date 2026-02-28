# 랜딩페이지 생성 기능 설정 가이드

## 📋 개요

이 프로젝트는 비즈니스 랜딩페이지를 자동으로 생성하고 Google Cloud Storage(GCS)에 업로드하여 public URL을 제공하는 기능을 포함합니다.

## 🔧 사전 준비 사항

### 1. Google Cloud Storage 버킷 생성

```bash
# GCP 프로젝트 ID 설정 (cloudbuild.yaml에서 확인)
export PROJECT_ID="project-035a75f4-af33-4445-a86"

# GCS 버킷 생성
gsutil mb -p $PROJECT_ID gs://product-demo

# 예시: 랜딩페이지 전용 버킷
gsutil mb -p $PROJECT_ID gs://product-demo-landing-pages
```

### 2. 버킷 CORS 설정 (선택사항 - 프론트엔드에서 직접 접근 시)

`cors-config.json` 파일 생성:

```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

적용:

```bash
gsutil cors set cors-config.json gs://YOUR-BUCKET-NAME
```

### 3. Cloud Run 서비스 계정 권한 설정

```bash
# Cloud Run 서비스 계정 확인 (cloudbuild.yaml에서)
export SERVICE_ACCOUNT="product-demo-for-gemini-3--677@project-035a75f4-af33-4445-a86.iam.gserviceaccount.com"

# Storage Object Admin 권한 부여
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/storage.objectAdmin"
```

## 🔐 환경변수 설정

### Cloud Run 배포 시 환경변수 추가

`cloudbuild.yaml` 파일의 Cloud Run 배포 단계에 환경변수 추가:

```yaml
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: gcloud
  args:
    - 'run'
    - 'deploy'
    - 'cloudrun-demo'
    - '--image'
    - 'gcr.io/cloudrun-demo-452905/cloudrun-demo:$COMMIT_SHA'
    - '--region'
    - 'asia-northeast3'
    - '--platform'
    - 'managed'
    - '--allow-unauthenticated'
    - '--service-account'
    - 'product-demo-for-gemini-3--677@project-035a75f4-af33-4445-a86.iam.gserviceaccount.com'
    - '--set-env-vars'
    - 'GCS_BUCKET_NAME=product-demo-landing-pages'  # 👈 추가
```

또는 배포 후 gcloud 명령어로 설정:

```bash
gcloud run services update cloudrun-demo \
  --region=asia-northeast3 \
  --set-env-vars=GCS_BUCKET_NAME=product-demo-landing-pages
```

### 로컬 개발 시 환경변수

`.env` 파일 생성 (apps/backend/.env):

```env
GCS_BUCKET_NAME=product-demo-landing-pages
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## 📡 API 사용법

### 랜딩페이지 생성 엔드포인트

**Endpoint:** `POST /api/landing-pages`

**Request Body:**

```json
{
  "businessName": "카페 글링",
  "description": "서울 강남구에 위치한 아늑한 카페입니다.\n매일 신선한 원두로 커피를 내립니다.",
  "address": "서울특별시 강남구 테헤란로 123",
  "photoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**필수 필드:**
- `businessName`: 비즈니스 이름
- `description`: 설명 (줄바꿈 가능)
- `address`: 주소 (구글 맵 연동)
- `photoBase64`: base64 인코딩된 이미지 (data:image/... 형식)

**Response (성공):**

```json
{
  "success": true,
  "pageId": "xY3k9pL2mQ",
  "url": "https://storage.googleapis.com/cloudrun-demo-landing-pages/landing-pages/xY3k9pL2mQ.html",
  "message": "Landing page created successfully"
}
```

**Response (실패):**

```json
{
  "error": "Missing required fields",
  "required": ["businessName", "description", "address", "photoBase64"]
}
```

## 🧪 테스트 방법

### 1. cURL로 테스트

```bash
# 이미지를 base64로 인코딩
BASE64_IMAGE=$(base64 -i test-image.jpg)

# API 호출
curl -X POST http://localhost:8081/api/landing-pages \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "테스트 카페",
    "description": "테스트 설명입니다.",
    "address": "서울특별시 강남구 테헤란로 123",
    "photoBase64": "data:image/jpeg;base64,'$BASE64_IMAGE'"
  }'
```

### 2. 생성된 URL 접속

응답으로 받은 `url`을 브라우저에서 열어 랜딩페이지 확인

## 📁 생성된 파일 구조

```
apps/backend/src/
├── index.ts                    # 메인 Express 서버 (API 엔드포인트 포함)
├── utils/
│   └── templateGenerator.ts    # HTML 템플릿 생성 유틸리티
└── services/
    └── storageService.ts       # GCS 업로드 서비스
```

## 🚀 배포 확인

```bash
# Cloud Run 서비스 환경변수 확인
gcloud run services describe cloudrun-demo \
  --region=asia-northeast3 \
  --format="value(spec.template.spec.containers[0].env)"

# GCS 버킷 내용 확인
gsutil ls -r gs://cloudrun-demo-landing-pages/landing-pages/
```

## 🔍 문제 해결

### "GCS_BUCKET_NAME environment variable is not set" 오류

- Cloud Run 서비스에 환경변수가 설정되었는지 확인
- `gcloud run services update` 명령어로 환경변수 추가

### "Permission denied" 오류

- Cloud Run 서비스 계정에 Storage Object Admin 권한이 있는지 확인
- IAM 설정 재확인

### 이미지가 표시되지 않음

- photoBase64가 `data:image/...;base64,` 형식인지 확인
- 이미지 크기가 너무 크지 않은지 확인 (10MB 제한)

## 📊 데이터베이스 스키마

생성된 랜딩페이지 메타데이터는 SQLite DB에 저장됩니다:

```sql
CREATE TABLE landing_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 커스터마이징

HTML 템플릿 수정: [apps/backend/src/utils/templateGenerator.ts](apps/backend/src/utils/templateGenerator.ts)

- CSS 스타일 변경
- 레이아웃 수정
- 추가 필드 지원
