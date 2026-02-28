/**
 * Nano Banana 2 이미지 생성 서비스
 * gemini-3.1-flash-image-preview 모델을 사용한 AI 이미지 생성
 */

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';

export interface GeneratedImage {
    data: Buffer;      // PNG 바이너리
    mimeType: string;  // 'image/png'
}

/**
 * Nano Banana 2 API로 이미지 생성
 */
export async function generateImage(
    prompt: string,
    apiKey: string,
): Promise<GeneratedImage> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
                temperature: 0.7,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Nano Banana 2 API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
        if (part.inlineData) {
            return {
                data: Buffer.from(part.inlineData.data, 'base64'),
                mimeType: part.inlineData.mimeType || 'image/png',
            };
        }
    }

    throw new Error('No image data in Nano Banana 2 response');
}

/**
 * 카드뉴스용 이미지 프롬프트 빌더
 */
export function buildCardNewsPrompt(
    businessName: string,
    cardTitle: string,
    cardBody: string,
    index: number,
    total: number,
): string {
    return `소상공인 "${businessName}"의 인스타그램 카드뉴스 ${index + 1}/${total}장을 만들어주세요.
제목: ${cardTitle}
내용: ${cardBody}
한국어 텍스트를 포함하고, 1080x1080 정사각형 비율로, 밝고 세련된 SNS 프로모션 스타일로 디자인해주세요.
텍스트는 읽기 쉽게 큰 글씨로 배치하고, 배경은 가게 분위기에 맞는 따뜻하고 깔끔한 느낌으로 만들어주세요.`;
}

/**
 * 랜딩페이지 히어로 이미지 프롬프트 빌더
 */
export function buildHeroImagePrompt(
    businessName: string,
    description: string,
    atmosphere?: string[],
    colorScheme?: { primary: string; secondary: string },
): string {
    const atmosphereText = atmosphere?.length ? atmosphere.join(', ') : '따뜻하고 환영하는';
    const colorText = colorScheme
        ? `${colorScheme.primary}, ${colorScheme.secondary} 톤 기반`
        : '자연스러운 컬러 톤';

    return `가게명: "${businessName}". 설명: ${description}.
분위기: ${atmosphereText}.
웹사이트 히어로 배너 이미지를 생성해주세요.
16:9 비율의 넓은 구도로, 텍스트 없이 분위기만 시각적으로 표현해주세요.
컬러 톤: ${colorText}.
사진처럼 자연스럽고 고품질의 이미지로 만들어주세요.`;
}
