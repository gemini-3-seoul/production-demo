/**
 * Google Trends 래퍼 서비스
 * 인기 검색어 및 관련 검색어 조회
 */

import { dailyTrends, relatedQueries } from 'google-trends-api';

export interface FoodTrendsResult {
    dailyTopKeywords: string[];
    relatedTopics: string[];
    risingTopics: string[];
}

export async function getFoodTrends(
    keyword: string,
    geo: string = 'KR'
): Promise<FoodTrendsResult> {
    const result: FoodTrendsResult = {
        dailyTopKeywords: [],
        relatedTopics: [],
        risingTopics: [],
    };

    // dailyTrends 조회
    try {
        const dailyRaw = await dailyTrends({ geo, trendDate: new Date() });
        const dailyData = JSON.parse(dailyRaw);
        const searches =
            dailyData?.default?.trendingSearchesDays?.[0]?.trendingSearches || [];
        result.dailyTopKeywords = searches
            .slice(0, 10)
            .map((s: any) => s.title?.query || '')
            .filter(Boolean);
    } catch (err) {
        console.warn('dailyTrends failed:', err);
    }

    // relatedQueries 조회
    try {
        const relatedRaw = await relatedQueries({ keyword, geo });
        const relatedData = JSON.parse(relatedRaw);
        const defaultObj = relatedData?.default;

        const topArr = defaultObj?.rankedList?.[0]?.rankedKeyword || [];
        result.relatedTopics = topArr
            .slice(0, 10)
            .map((k: any) => k.query || '')
            .filter(Boolean);

        const risingArr = defaultObj?.rankedList?.[1]?.rankedKeyword || [];
        result.risingTopics = risingArr
            .slice(0, 10)
            .map((k: any) => k.query || '')
            .filter(Boolean);
    } catch (err) {
        console.warn('relatedQueries failed:', err);
    }

    return result;
}
