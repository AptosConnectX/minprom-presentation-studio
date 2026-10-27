"use client";

import { useRef, useState, useCallback } from "react";

const STAGES = [
  "Читаю документ…",
  "Выделяю ключевые тезисы и цифры…",
  "Формирую структуру слайдов…",
  "Собираю презентацию…",
];

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [slidesCount, setSlidesCount] = useState(0);

  const acceptFile = useCallback((f?: File | null) => {
    if (!f) return;
    if (
      !f.name.toLowerCase().endsWith(".docx") &&
      f.type !==
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      setError("Поддерживается только формат .docx");
      return;
    }
    setFile(f);
    setError(null);
    setDownloadUrl(null);
    setSlidesCount(0);
  }, []);

  const handleGenerate = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setDownloadUrl(null);
    setStage(0);

    const progressTimer = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 1800);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/generate", {
        method: "POST",
        body: form,
      });

      clearInterval(progressTimer);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Ошибка ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setSlidesCount(Number(res.headers.get("X-Slides-Count") || 0));
      setStage(STAGES.length);
    } catch (e: any) {
      clearInterval(progressTimer);
      setError(e.message || "Не удалось сгенерировать презентацию");
      setStage(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <nav className="sidebar">
        <a className="side-link active" title="Студия">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        </a>
        <a className="side-link" title="История" style={{ opacity: 0.4, pointerEvents: "none" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </a>
      </nav>

      <header className="brand">
        <span>Министерство промышленности РБ</span>
        <svg width="22" height="22" viewBox="0 0 48 48" style={{ marginLeft: 4 }}>
          <circle cx="24" cy="24" r="10" fill="#ffd43b" opacity="0.9" />
          <circle cx="24" cy="24" r="4" fill="#161309" />
        </svg>
      </header>

      {!file ? (
        <section className="hero-copy">
          <span className="eyebrow">
            <i /> AI PRESENTATION STUDIO
          </span>
          <h1>
            Превратим документ
            <br />в ясную историю.
          </h1>
          <p>
            Загрузите .docx — мы соберём структуру, тезисы
            <br />и презентацию в стиле Министерства.
          </p>
        </section>
      ) : (
        <section className="conversation">
          <div className="file-bubble">
            <span className="doc-icon">W</span>
            <span>
              <b>{file.name}</b>
              <small>{(file.size / 1024).toFixed(1)} КБ · DOCX</small>
            </span>
          </div>

          <div className="ai-message">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#ffd43b22",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffd43b" strokeWidth="1.8">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <strong>
                {stage >= STAGES.length
                  ? "Презентация готова"
                  : loading
                  ? STAGES[stage]
                  : "Документ загружен. Нажмите «Сгенерировать»"}
              </strong>

              {loading && stage < STAGES.length && (
                <div className="progress">
                  <span style={{ width: `${20 + stage * 25}%` }} />
                </div>
              )}

              {stage >= STAGES.length && downloadUrl && (
                <div className="result-card">
                  <h3>Презентация сформирована</h3>
                  <p>
                    {slidesCount > 0
                      ? `Собрано ${slidesCount} слайдов в фирменном стиле.`
                      : "Слайды готовы к скачиванию."}
                  </p>
                  <a
                    href={downloadUrl}
                    download={`${file.name.replace(/\.docx$/i, "")}_presentation.pptx`}
                    className="download-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Скачать .pptx
                  </a>
                </div>
              )}

              {error && <div className="error-box">{error}</div>}
            </div>
          </div>
        </section>
      )}

      <div className="composer-wrap">
        <div className="composer">
          <button
            className="upload"
            onClick={() => inputRef.current?.click()}
            aria-label="Загрузить DOCX"
            disabled={loading}
          >
            +
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            hidden
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
          <span>
            {file
              ? loading
                ? "Генерация…"
                : "Готово к генерации"
              : "Перетащите или вставьте документ…"}
          </span>
          <button
            className="send"
            onClick={file ? handleGenerate : () => inputRef.current?.click()}
            disabled={loading}
            aria-label="Сгенерировать"
          >
            {loading ? (
              <svg width="18" height="18" viewBox="0 0 24 24" className="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="#111" strokeWidth="3" fill="none" opacity="0.25" />
                <path d="M12 2a10 10 0 019.9 8.5" stroke="#111" strokeWidth="3" fill="none" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
        <p className="paste-hint">
          DOCX · можно вставить через <kbd>CTRL</kbd> + <kbd>V</kbd>
        </p>
      </div>
    </main>
  );
}
