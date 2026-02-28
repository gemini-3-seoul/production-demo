/**
 * 랜딩페이지 저장 서비스
 * - GCS_BUCKET_NAME 설정 시: Google Cloud Storage 업로드
 * - 미설정 시: 로컬 파일 저장 (데모)
 */

import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.join(__dirname, '../../public');
const API_PORT = process.env.API_PORT || 8081;
const BACKEND_PUBLIC_BASE_URL = process.env.BACKEND_PUBLIC_BASE_URL || `http://localhost:${API_PORT}`;

const getBucketName = () => process.env.GCS_BUCKET_NAME;

export interface UploadResult {
    pageId: string;
    publicUrl: string;
    fileLocation: string;
}

export interface SavedFileResult {
    fileLocation: string;
    publicUrl: string;
}

/**
 * 랜딩페이지 저장
 */
export async function uploadLandingPageToGCS(
    htmlContent: string,
    existingPageId?: string,
): Promise<UploadResult> {
    const pageId = existingPageId || nanoid(10);
    const fileName = `landing-pages/${pageId}.html`;
    const cacheControl = existingPageId
        ? 'no-cache, max-age=0'
        : 'public, max-age=3600';

    const result = await saveTextFile(fileName, htmlContent, 'text/html; charset=utf-8', cacheControl);

    return {
        pageId,
        publicUrl: result.publicUrl,
        fileLocation: result.fileLocation,
    };
}

/**
 * 카드뉴스 에셋 저장 (텍스트 또는 바이너리)
 */
export async function saveCardNewsAsset(
    pageId: string,
    fileName: string,
    content: string | Buffer,
    options: { contentType?: string; cacheControl?: string } = {},
): Promise<SavedFileResult> {
    const key = `card-news/${pageId}/${fileName}`;
    const cacheControl = options.cacheControl || 'public, max-age=3600';

    if (Buffer.isBuffer(content)) {
        const contentType = options.contentType || 'image/png';
        return saveBinaryFile(key, content, contentType, cacheControl);
    }

    const contentType = options.contentType || 'image/svg+xml; charset=utf-8';
    return saveTextFile(key, content, contentType, cacheControl);
}

/**
 * 바이너리 파일 저장 (PNG 등)
 */
export async function saveBinaryFile(
    filePath: string,
    buffer: Buffer,
    contentType: string,
    cacheControl: string = 'public, max-age=3600',
): Promise<SavedFileResult> {
    const bucketName = getBucketName();

    if (bucketName) {
        const { Storage } = await import('@google-cloud/storage');
        const storage = new Storage();
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(filePath);
        await file.save(buffer, {
            contentType,
            metadata: { cacheControl },
        });
        return {
            fileLocation: `gs://${bucketName}/${filePath}`,
            publicUrl: `https://storage.googleapis.com/${bucketName}/${filePath}`,
        };
    }

    // 로컬 저장
    const absolutePath = path.join(PUBLIC_DIR, filePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, buffer);
    const relativePath = path.relative(PUBLIC_DIR, absolutePath).split(path.sep).join('/');
    return {
        fileLocation: absolutePath,
        publicUrl: `${BACKEND_PUBLIC_BASE_URL.replace(/\/$/, '')}/${relativePath}`,
    };
}

/**
 * 지정된 키 경로에 텍스트 파일 저장
 */
async function saveTextFile(
    filePath: string,
    content: string,
    contentType: string,
    cacheControl: string,
): Promise<SavedFileResult> {
    const bucketName = getBucketName();

    if (bucketName) {
        const { Storage } = await import('@google-cloud/storage');
        const storage = new Storage();
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(filePath);
        await file.save(content, {
            contentType,
            metadata: { cacheControl },
        });
        return {
            fileLocation: `gs://${bucketName}/${filePath}`,
            publicUrl: `https://storage.googleapis.com/${bucketName}/${filePath}`,
        };
    }

    // 로컬 저장
    const absolutePath = path.join(PUBLIC_DIR, filePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, 'utf-8');
    const relativePath = path.relative(PUBLIC_DIR, absolutePath).split(path.sep).join('/');
    return {
        fileLocation: absolutePath,
        publicUrl: `${BACKEND_PUBLIC_BASE_URL.replace(/\/$/, '')}/${relativePath}`,
    };
}

/**
 * fileLocation 기반으로 공개 URL 생성
 */
export function getPublicUrl(fileLocation: string): string {
    if (fileLocation.startsWith('gs://')) {
        const pathWithoutScheme = fileLocation.replace('gs://', '');
        const firstSlash = pathWithoutScheme.indexOf('/');
        if (firstSlash === -1) return '';
        const bucketName = pathWithoutScheme.slice(0, firstSlash);
        const objectPath = pathWithoutScheme.slice(firstSlash + 1);
        return `https://storage.googleapis.com/${bucketName}/${objectPath}`;
    }

    // Local file path
    const relativePath = path.relative(PUBLIC_DIR, path.resolve(fileLocation)).split(path.sep).join('/');
    if (relativePath.startsWith('..')) return '';
    return `${BACKEND_PUBLIC_BASE_URL.replace(/\/$/, '')}/${relativePath}`;
}

/**
 * 저장된 HTML 파일 읽기
 */
export async function readStoredFile(fileLocation: string): Promise<string | null> {
    if (fileLocation.startsWith('gs://')) {
        try {
            const { Storage } = await import('@google-cloud/storage');
            const storage = new Storage();
            const pathWithoutScheme = fileLocation.replace('gs://', '');
            const firstSlash = pathWithoutScheme.indexOf('/');
            if (firstSlash === -1) return null;
            const bucketName = pathWithoutScheme.slice(0, firstSlash);
            const filePath = pathWithoutScheme.slice(firstSlash + 1);
            const [content] = await storage.bucket(bucketName).file(filePath).download();
            return content.toString('utf-8');
        } catch (err) {
            console.warn('Failed to read from GCS:', err);
            return null;
        }
    }

    // Local file
    try {
        return fs.readFileSync(fileLocation, 'utf-8');
    } catch {
        return null;
    }
}

/**
 * 저장된 파일 삭제
 */
export async function deleteStoredFile(fileLocation: string): Promise<void> {
    if (fileLocation.startsWith('gs://')) {
        const bucketName = getBucketName();
        if (!bucketName) return;
        const pathWithoutScheme = fileLocation.replace('gs://', '');
        const firstSlash = pathWithoutScheme.indexOf('/');
        if (firstSlash === -1) return;
        const fileName = pathWithoutScheme.slice(firstSlash + 1);
        const { Storage } = await import('@google-cloud/storage');
        const storage = new Storage();
        await storage.bucket(bucketName).file(fileName).delete();
        return;
    }

    if (fs.existsSync(fileLocation)) {
        fs.unlinkSync(fileLocation);
    }
}
