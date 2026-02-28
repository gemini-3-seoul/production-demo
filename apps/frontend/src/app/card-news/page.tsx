"use client";

import { useEffect, useMemo, useState } from "react";

interface LandingPageItem {
  id: number;
  page_id: string;
  business_name: string;
  address?: string;
  created_date?: string;
  url: string;
  weatherSnapshot?: {
    temperature_C?: number;
    weatherDesc?: string;
  };
  trendSnapshot?: {
    dailyTopKeywords?: string[];
    relatedTopics?: string[];
  };
}

interface CardImage {
  order: number;
  url: string;
  fileLocation: string;
}

interface CardNewsItem {
  id: number;
  pageId: string;
  cardDate: string;
  imageCount: number;
  images: CardImage[];
  cards: Array<{
    title: string;
    body: string;
    footer: string;
    hashtags: string[];
  }>;
  instagramText: string;
  hashtags: string[];
  createdAt: string;
  updatedAt?: string;
}

const getKstDate = (): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

export default function CardNewsPage() {
  const [pages, setPages] = useState<LandingPageItem[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [cardDate, setCardDate] = useState<string>(getKstDate());
  const [imageCount, setImageCount] = useState(3);
  const [items, setItems] = useState<CardNewsItem[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [generatingProgress, setGeneratingProgress] = useState<string>("");
  const [copyText, setCopyText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPages = async () => {
      try {
        setLoadingPages(true);
        setError("");
        const res = await fetch("/api/landing-pages");
        if (!res.ok) {
          throw new Error(`랜딩페이지 조회 실패: ${res.status}`);
        }
        const data = await res.json();
        const pageList = Array.isArray(data.pages) ? data.pages : [];
        setPages(pageList);
        if (!selectedPageId && pageList.length > 0) {
          setSelectedPageId(pageList[0].page_id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setLoadingPages(false);
      }
    };
    loadPages();
  }, []);

  const selectedPage = useMemo(
    () => pages.find((p) => p.page_id === selectedPageId),
    [pages, selectedPageId]
  );

  const loadCards = async (pageId: string, targetDate: string) => {
    setLoadingCards(true);
    setError("");
    try {
      const query = new URLSearchParams({
        ...(pageId ? { pageId } : {}),
        ...(targetDate ? { cardDate: targetDate } : {}),
      });

      const res = await fetch(`/api/card-news?${query.toString()}`);
      if (!res.ok) {
        throw new Error(`카드뉴스 조회 실패: ${res.status}`);
      }
      const data = await res.json();
      const list = Array.isArray(data.cardNews) ? data.cardNews : [];
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      setItems([]);
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    if (selectedPageId) {
      loadCards(selectedPageId, cardDate);
    } else {
      setItems([]);
    }
  }, [selectedPageId, cardDate]);

  const handleGenerate = async () => {
    if (!selectedPageId) {
      setError("상호를 먼저 선택해주세요.");
      return;
    }

    setIsGenerating(true);
    setError("");
    setStatus("");
    setGeneratingProgress(`AI 이미지 생성 중... (${imageCount}장)`);
    try {
      const res = await fetch("/api/card-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: selectedPageId,
          imageCount,
          force: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `카드뉴스 생성 실패: ${res.status}`);
      }
      setStatus(data.message || "카드뉴스가 생성되었습니다.");
      await loadCards(selectedPageId, cardDate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
      setGeneratingProgress("");
    }
  };

  const handleCopyText = async (text: string) => {
    if (!navigator.clipboard) {
      setCopyText("브라우저에서 클립보드 지원이 필요합니다.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyText("복사되었습니다.");
      setTimeout(() => setCopyText(""), 1500);
    } catch {
      setCopyText("복사에 실패했습니다.");
      setTimeout(() => setCopyText(""), 1500);
    }
  };

  const todayPreview = getKstDate();

  return (
    <main className="min-h-screen bg-[#f9fafb] text-[#111827] p-6">
      <section className="max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div>
              <h1 className="text-2xl font-bold">오늘의 카드뉴스 생성</h1>
              <p className="text-sm text-[#6b7280]">
                상호를 선택하면 생성된 날씨/트렌드 기반 카드뉴스를 만들고 텍스트를 복사할 수 있습니다.
              </p>
            </div>
            <a
              href="/"
              className="text-sm text-[#7c3aed] border border-[#e5e7eb] px-3 py-2 rounded-md hover:bg-[#f3e8ff]"
            >
              ← 대시보드로 돌아가기
            </a>
          </div>
        </header>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}
        {status && (
          <div className="mb-4 p-3 rounded-md bg-[#f3e8ff] border border-[#e5e7eb] text-[#111827]">
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded-lg border border-[#e5e7eb] bg-white p-4">
            <h2 className="text-lg font-semibold mb-4">1. 상호 및 생성 옵션</h2>
            {loadingPages ? (
              <p className="text-sm text-[#6b7280]">페이지 로딩 중...</p>
            ) : (
              <>
                <label className="block mb-2 text-sm text-[#6b7280]">상호 선택</label>
                <select
                  className="w-full rounded-md bg-white border border-[#e5e7eb] px-3 py-2 mb-4"
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                >
                  <option value="">상호 선택</option>
                  {pages.map((page) => (
                    <option key={page.page_id} value={page.page_id}>
                      {page.business_name} ({page.address || "주소 없음"})
                    </option>
                  ))}
                </select>

                <label className="block mb-2 text-sm text-[#6b7280]">카드 수</label>
                <input
                  type="number"
                  className="w-full rounded-md bg-white border border-[#e5e7eb] px-3 py-2 mb-4"
                  min={1}
                  max={6}
                  value={imageCount}
                  onChange={(e) => setImageCount(Math.min(Math.max(Number(e.target.value) || 3, 1), 6))}
                />

                <label className="block mb-2 text-sm text-[#6b7280]">생성일</label>
                <input
                  type="date"
                  className="w-full rounded-md bg-white border border-[#e5e7eb] px-3 py-2 mb-4"
                  value={cardDate}
                  onChange={(e) => setCardDate(e.target.value)}
                />

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedPageId}
                  className="w-full rounded-md bg-gradient-to-r from-[#a78bfa] to-[#ec4899] text-white disabled:opacity-60 py-2"
                >
                  {isGenerating ? "AI 이미지 생성 중..." : "오늘 카드뉴스 생성"}
                </button>
                {isGenerating && generatingProgress && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-[#7c3aed]">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {generatingProgress}
                  </div>
                )}
                {selectedPage && (
                  <div className="mt-4 text-sm text-[#6b7280]">
                    <p>
                      날씨 기준: {selectedPage.weatherSnapshot?.temperature_C}°C /{" "}
                      {selectedPage.weatherSnapshot?.weatherDesc}
                    </p>
                    <p>
                      트렌드: {(selectedPage.trendSnapshot?.dailyTopKeywords || []).slice(0, 3).join(", ") || "데이터 없음"}
                    </p>
                    <p>주소: {selectedPage.address || "미확인"}</p>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="rounded-lg border border-[#e5e7eb] bg-white p-4">
            <h2 className="text-lg font-semibold mb-4">2. 카드뉴스 결과</h2>
            <p className="text-sm text-[#6b7280] mb-3">
              조회일: {cardDate} / 오늘(KST): {todayPreview}
            </p>

            {loadingCards ? (
              <p className="text-sm text-[#6b7280]">조회 중...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-[#6b7280]">
                조회 결과가 없습니다. 먼저 상단에서 생성해 주세요.
              </p>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <article key={item.id} className="border border-[#e5e7eb] rounded-md p-3 bg-white">
                    <p className="text-sm text-[#6b7280] mb-2">
                      카드일: <strong>{item.cardDate}</strong> / 이미지: <strong>{item.imageCount}</strong>장
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {item.images.map((img) => (
                        <a
                          key={img.fileLocation}
                          href={img.url}
                          download={`card-news-${item.pageId}-${item.cardDate}-${img.order}.png`}
                          target="_blank"
                          rel="noreferrer"
                          className="relative block rounded border border-[#e5e7eb] overflow-hidden"
                        >
                          <img src={img.url} alt={`card-${img.order}`} className="w-full h-auto" />
                          <span className="absolute right-2 bottom-2 text-xs bg-black/70 px-2 py-1 rounded text-white">
                            {img.order} / 다운로드
                          </span>
                        </a>
                      ))}
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-[#6b7280] mb-1">인스타 텍스트</p>
                      <textarea
                        value={item.instagramText}
                        readOnly
                        rows={5}
                        className="w-full rounded bg-white border border-[#e5e7eb] px-2 py-2 text-sm text-[#111827]"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handleCopyText(item.instagramText)}
                          className="rounded bg-[#a78bfa] hover:bg-[#7c3aed] text-white px-3 py-2 text-sm"
                        >
                          텍스트 복사
                        </button>
                        <a
                          href={`data:text/plain;charset=utf-8,${encodeURIComponent(item.instagramText)}`}
                          download={`card-news-${item.pageId}-${item.cardDate}.txt`}
                          className="rounded bg-[#f3e8ff] hover:opacity-90 px-3 py-2 text-sm text-[#111827]"
                        >
                          텍스트 파일 저장
                        </a>
                        <span className="text-xs text-[#6b7280] self-center">{copyText}</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#6b7280] mt-2">
                      해시태그: {(item.hashtags || []).join(" ")}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
