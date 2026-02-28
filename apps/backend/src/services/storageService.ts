/**
 * Google Cloud Storage 업로드 서비스
 */

import { Storage } from '@google-cloud/storage';
import { nanoid } from 'nanoid';

// GCS 클라이언트 초기화
const storage = new Storage();

export interface UploadResult {
    pageId: string;
    publicUrl: string;
}

/**
 * HTML 파일을 GCS에 업로드하고 public URL 반환
 * @param htmlContent - 업로드할 HTML 내용
 * @param existingPageId - 기존 페이지 ID (업데이트 시 같은 경로 덮어쓰기)
 * @returns pageId와 public URL
 */
export async function uploadLandingPageToGCS(
    htmlContent: string,
    existingPageId?: string
): Promise<UploadResult> {
    const bucketName = process.env.GCS_BUCKET_NAME;

    if (!bucketName) {
        throw new Error('GCS_BUCKET_NAME environment variable is not set');
    }

    // 기존 pageId가 있으면 재사용, 없으면 새로 생성
    const pageId = existingPageId || nanoid(10);
    const fileName = `landing-pages/${pageId}.html`;

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // 업데이트 시 캐시 무효화, 신규 시 1시간 캐시
    const cacheControl = existingPageId
        ? 'no-cache, max-age=0'
        : 'public, max-age=3600';

    // HTML 파일 업로드
    await file.save(htmlContent, {
        contentType: 'text/html; charset=utf-8',
        metadata: {
            cacheControl,
        },
    });

    // Public URL 생성
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    return {
        pageId,
        publicUrl,
    };
}

/**
 * 특정 랜딩페이지 삭제 (선택사항)
 * @param pageId - 삭제할 페이지 ID
 */
export async function deleteLandingPage(pageId: string): Promise<void> {
    const bucketName = process.env.GCS_BUCKET_NAME;

    if (!bucketName) {
        throw new Error('GCS_BUCKET_NAME environment variable is not set');
    }

    const fileName = `landing-pages/${pageId}.html`;
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    await file.delete();
}
