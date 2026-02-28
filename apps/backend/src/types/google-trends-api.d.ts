declare module 'google-trends-api' {
    interface TrendsOptions {
        trendDate?: Date;
        geo?: string;
        hl?: string;
        timezone?: number;
        category?: number;
    }

    interface RelatedQueriesOptions {
        keyword: string;
        startTime?: Date;
        endTime?: Date;
        geo?: string;
        hl?: string;
        timezone?: number;
        category?: number;
    }

    function dailyTrends(options?: TrendsOptions): Promise<string>;
    function relatedQueries(options: RelatedQueriesOptions): Promise<string>;
    function interestOverTime(options: RelatedQueriesOptions): Promise<string>;

    export { dailyTrends, relatedQueries, interestOverTime };
}
