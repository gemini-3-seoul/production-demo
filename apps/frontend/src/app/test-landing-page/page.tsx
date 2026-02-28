"use client";

import { useState } from "react";

export default function TestLandingPage() {
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    pageId?: string;
    url?: string;
    error?: string;
  } | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !description || !address || !photo) {
      alert("모든 필드를 입력해주세요!");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // 이미지를 base64로 변환
      const reader = new FileReader();
      reader.onloadend = async () => {
        const photoBase64 = reader.result as string;

        // API 호출
        const response = await fetch("/api/landing-pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName,
            description,
            address,
            photoBase64,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setResult({
            success: true,
            pageId: data.pageId,
            url: data.url,
          });
          // 폼 초기화
          setBusinessName("");
          setDescription("");
          setAddress("");
          setPhoto(null);
          setPhotoPreview("");
        } else {
          setResult({
            success: false,
            error: data.error || "알 수 없는 오류가 발생했습니다.",
          });
        }
        setLoading(false);
      };

      reader.readAsDataURL(photo);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "네트워크 오류",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            랜딩페이지 생성 테스트
          </h1>
          <p className="text-gray-600 mb-8">
            비즈니스 정보를 입력하고 랜딩페이지를 생성해보세요.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 비즈니스 이름 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                비즈니스 이름 *
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="예: 카페 글링"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                설명 *
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                placeholder="예: 서울 강남구에 위치한 아늑한 카페입니다.&#10;매일 신선한 원두로 커피를 내립니다."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* 주소 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                주소 *
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="예: 서울특별시 강남구 테헤란로 123"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            {/* 사진 업로드 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                매장 사진 *
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={handlePhotoChange}
                required
              />
              {photoPreview && (
                <div className="mt-4">
                  <img
                    src={photoPreview}
                    alt="미리보기"
                    className="w-full max-h-64 object-cover rounded-lg shadow-md"
                  />
                </div>
              )}
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? "생성 중..." : "랜딩페이지 생성하기 🚀"}
            </button>
          </form>

          {/* 결과 표시 */}
          {result && (
            <div
              className={`mt-8 p-6 rounded-xl ${
                result.success
                  ? "bg-green-50 border-2 border-green-200"
                  : "bg-red-50 border-2 border-red-200"
              }`}
            >
              {result.success ? (
                <div>
                  <h3 className="text-xl font-bold text-green-800 mb-3 flex items-center gap-2">
                    ✅ 랜딩페이지 생성 완료!
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">페이지 ID:</span>{" "}
                      <code className="bg-white px-2 py-1 rounded text-green-700">
                        {result.pageId}
                      </code>
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">URL:</span>
                    </p>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-white rounded-lg border border-green-300 hover:bg-green-50 transition break-all text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {result.url} 🔗
                    </a>
                    <button
                      onClick={() => window.open(result.url, "_blank")}
                      className="mt-4 w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                    >
                      새 탭에서 열기
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold text-red-800 mb-2">
                    ❌ 오류 발생
                  </h3>
                  <p className="text-red-700">{result.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 안내 정보 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-2">💡 사용 방법</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>모든 필드를 입력하고 매장 사진을 업로드하세요.</li>
            <li>
              생성된 랜딩페이지는 Google Cloud Storage에 저장됩니다.
            </li>
            <li>URL을 공유하여 누구나 접근할 수 있습니다.</li>
            <li>
              이미지는 base64로 인코딩되어 HTML 파일에 포함됩니다.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
