/**
 * 날씨 조회 서비스 (wttr.in API)
 * API 키 불필요, 한국어 주소 지원
 */

export interface WeatherResult {
    location: string;
    temperature_C: number;
    feelsLike_C: number;
    humidity: number;
    weatherDesc: string;
}

export async function getWeather(location: string): Promise<WeatherResult> {
    const encoded = encodeURIComponent(location);
    const url = `https://wttr.in/${encoded}?format=j1`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) {
            throw new Error(`wttr.in responded with ${res.status}`);
        }

        const data = await res.json();
        const current = data.current_condition?.[0];

        if (!current) {
            throw new Error('No current weather data');
        }

        return {
            location,
            temperature_C: Number(current.temp_C),
            feelsLike_C: Number(current.FeelsLikeC),
            humidity: Number(current.humidity),
            weatherDesc: current.lang_ko?.[0]?.value || current.weatherDesc?.[0]?.value || 'Unknown',
        };
    } finally {
        clearTimeout(timeout);
    }
}
