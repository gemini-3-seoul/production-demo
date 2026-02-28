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
 * @returns pageId와 public URL
 */
export async function uploadLandingPageToGCS(
    htmlContent: string
): Promise<UploadResult> {
    const bucketName = process.env.GCS_BUCKET_NAME;

    if (!bucketName) {
        throw new Error('GCS_BUCKET_NAME environment variable is not set');
    }

    // 고유 페이지 ID 생성 (URL-safe, 10자)
    const pageId = nanoid(10);
    const fileName = `landing-pages/${pageId}.html`;

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // HTML 파일 업로드
    await file.save(htmlContent, {
        contentType: 'text/html; charset=utf-8',
        metadata: {
            cacheControl: 'public, max-age=3600', // 1시간 캐시
        },
    });

    // Note: Uniform bucket-level access를 사용하므로 개별 파일의 makePublic() 호출 불필요
    // 버킷 레벨에서 allUsers에게 Storage Object Viewer 권한을 부여하면 모든 파일이 public됨

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
