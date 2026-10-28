"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { eventsByDate, type CalendarEvent } from "../lib/reports";

type Msg = { role: "user" | "assistant"; content: string; fileName?: string };

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const STAGES = [
  "Читаю документ…",
  "Выделяю ключевые тезисы и цифры…",
  "Формирую структуру слайдов…",
  "Собираю презентацию…",
];

const EXTRA_KEY = "minprom_extra_prompts";

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<"chat" | "calendar">("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [slidesCount, setSlidesCount] = useState(0);
  const [extraPrompts, setExtraPrompts] = useState<string[]>([]);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(EXTRA_KEY);
      if (saved) setExtraPrompts(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(EXTRA_KEY, JSON.stringify(extraPrompts));
  }, [extraPrompts]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, downloadUrl]);

  const eventMap = useMemo(() => eventsByDate(calYear), [calYear]);

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

  /** Secret prompt commands */
  function handleSecretCommands(raw: string): { handled: boolean; clean: string; notice?: string } {
    const lower = raw.toLowerCase();

    // Add: "банановый кексик <prompt>"
    const addIdx = lower.indexOf("банановый кексик");
    if (addIdx !== -1) {
      const after = raw.slice(addIdx + "банановый кексик".length).trim();
      if (after) {
        setExtraPrompts((prev) => [...prev, after]);
        return {
          handled: true,
          clean: "",
          notice: `Доп. промпт сохранён (всего ${extraPrompts.length + 1}). Основной промпт не тронут.`,
        };
      }
      return { handled: true, clean: "", notice: "После «банановый кексик» напишите текст промпта." };
    }

    // Remove: count of "шоколадный вкуснее"
    const removeToken = "шоколадный вкуснее";
    if (lower.includes(removeToken)) {
      const parts = lower.split(removeToken);
      const count = parts.length - 1;
      setExtraPrompts((prev) => {
        const next = prev.slice(0, Math.max(0, prev.length - count));
        return next;
      });
      return {
        handled: true,
        clean: "",
        notice:
          count === 1
            ? "Удалён последний доп. промпт."
            : `Удалено доп. промптов: ${count}.`,
      };
    }

    return { handled: false, clean: raw };
  }

  const sendMessage = async () => {
    if (loading) return;
    const raw = text.trim();

    // File + generate presentation
    if (file && (!raw || /презентац|сгенерир|сделай|создай/i.test(raw))) {
      await handleGenerate();
      return;
    }

    if (!raw && !file) return;

    const secret = handleSecretCommands(raw);
    if (secret.handled) {
      setText("");
      setMessages((m) => [
        ...m,
        { role: "user", content: raw },
        { role: "assistant", content: secret.notice || "Ок." },
      ]);
      return;
    }

    const userMsg: Msg = {
      role: "user",
      content: raw || (file ? `Файл: ${file.name}` : ""),
      fileName: file?.name,
    };
    setMessages((m) => [...m, userMsg]);
    setText("");
    setLoading(true);
    setError(null);

    try {
      const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, extraPrompts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка чата");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setError(e.message || "Не удалось получить ответ");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Ошибка: " + (e.message || "не удалось ответить") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setDownloadUrl(null);
    setStage(0);
    setMessages((m) => [
      ...m,
      {
        role: "user",
        content: text.trim() || "Сделай презентацию",
        fileName: file.name,
      },
    ]);
    setText("");

    const progressTimer = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 1800);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("extraPrompts", JSON.stringify(extraPrompts));

      const res = await fetch("/api/generate", { method: "POST", body: form });
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
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Презентация готова${slidesCount || Number(res.headers.get("X-Slides-Count") || 0) ? ` · ${res.headers.get("X-Slides-Count")} слайдов` : ""}. Скачайте файл ниже.`,
        },
      ]);
      setFile(null);
    } catch (e: any) {
      clearInterval(progressTimer);
      setError(e.message || "Не удалось сгенерировать презентацию");
      setStage(0);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Ошибка генерации: " + (e.message || "") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Calendar grid
  const firstDay = new Date(calYear, calMonth, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const formatDate = (d: number) =>
    `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const hoverEvents: CalendarEvent[] = hoverDate ? eventMap[hoverDate] || [] : [];

  return (
    <main>
      <nav className="sidebar">
        <button
          className={`side-link ${view === "chat" ? "active" : ""}`}
          title="Студия / Чат"
          onClick={() => setView("chat")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        </button>
        <button
          className={`side-link ${view === "calendar" ? "active" : ""}`}
          title="Календарь отчётности"
          onClick={() => setView("calendar")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
      </nav>

      <header className="brand">
        <span>Министерство промышленности РБ</span>
        <svg width="22" height="22" viewBox="0 0 48 48" style={{ marginLeft: 4 }}>
          <circle cx="24" cy="24" r="10" fill="#ffd43b" opacity="0.9" />
          <circle cx="24" cy="24" r="4" fill="#161309" />
        </svg>
        {extraPrompts.length > 0 && (
          <span className="extra-badge" title={`${extraPrompts.length} доп. промпт(ов)`}>
            +{extraPrompts.length}
          </span>
        )}
      </header>

      {view === "chat" && (
        <>
          {messages.length === 0 && !file && !loading && (
            <section className="hero-copy">
              <span className="eyebrow">
                <i /> AI PRESENTATION STUDIO
              </span>
              <h1>
                Превратим документ
                <br />в ясную историю.
              </h1>
              <p>
                Загрузите .docx или напишите сообщение.
                <br />
                Чат с Grok 4.7 · генерация презентаций в стиле Министерства.
              </p>
            </section>
          )}

          <section className="conversation">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "user-row" : "ai-message"}>
                {m.role === "user" ? (
                  <div className="user-bubble">
                    {m.fileName && (
                      <div className="file-chip">
                        <span className="doc-icon">W</span>
                        {m.fileName}
                      </div>
                    )}
                    {m.content && <p>{m.content}</p>}
                  </div>
                ) : (
                  <>
                    <div className="ai-avatar">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffd43b" strokeWidth="1.8">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div className="ai-body">
                      <p style={{ whiteSpace: "pre-wrap" }}>{m.content}</p>
                    </div>
                  </>
                )}
              </div>
            ))}

            {loading && !downloadUrl && (
              <div className="ai-message">
                <div className="ai-avatar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffd43b" strokeWidth="1.8">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="ai-body">
                  <strong>{file || stage > 0 ? STAGES[Math.min(stage, STAGES.length - 1)] : "Думаю…"}</strong>
                  {(file || stage > 0) && (
                    <div className="progress">
                      <span style={{ width: `${20 + stage * 25}%` }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {downloadUrl && (
              <div className="result-card">
                <h3>Презентация сформирована</h3>
                <p>
                  {slidesCount > 0
                    ? `Собрано ${slidesCount} слайдов в фирменном стиле.`
                    : "Слайды готовы к скачиванию."}
                </p>
                <a href={downloadUrl} download="presentation.pptx" className="download-btn">
                  Скачать .pptx
                </a>
              </div>
            )}

            {error && <div className="error-box">{error}</div>}
            <div ref={chatEndRef} />
          </section>

          <div className="composer-wrap">
            {file && (
              <div className="file-pending">
                <span className="doc-icon">W</span>
                <span>{file.name}</span>
                <button type="button" onClick={() => setFile(null)} aria-label="Убрать файл">
                  ×
                </button>
              </div>
            )}
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
              <textarea
                ref={textRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                  file
                    ? "Напишите «сделай презентацию» или просто отправьте…"
                    : "Сообщение или загрузите .docx…"
                }
                rows={1}
                disabled={loading}
              />
              <button
                className="send"
                onClick={sendMessage}
                disabled={loading || (!text.trim() && !file)}
                aria-label="Отправить"
              >
                {loading ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" className="spin">
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
            <p className="paste-hint">DOCX · чат с Grok 4.7 · Enter — отправить</p>
          </div>
        </>
      )}

      {view === "calendar" && (
        <section className="calendar-view">
          <div className="cal-header">
            <button type="button" onClick={() => {
              if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
              else setCalMonth((m) => m - 1);
            }}>‹</button>
            <h2>
              {MONTHS[calMonth]} {calYear}
            </h2>
            <button type="button" onClick={() => {
              if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
              else setCalMonth((m) => m + 1);
            }}>›</button>
          </div>

          <div className="cal-year-switch">
            <button type="button" className={calYear === 2026 ? "on" : ""} onClick={() => setCalYear(2026)}>2026</button>
            <button type="button" className={calYear === 2027 ? "on" : ""} onClick={() => setCalYear(2027)}>2027</button>
          </div>

          <div className="cal-weekdays">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="cal-grid">
            {cells.map((d, i) => {
              if (d === null) return <div key={`e-${i}`} className="cal-cell empty" />;
              const dateStr = formatDate(d);
              const has = !!eventMap[dateStr]?.length;
              const isWeekend = i % 7 >= 5;
              return (
                <div
                  key={dateStr}
                  className={`cal-cell ${has ? "gold" : ""} ${isWeekend ? "weekend" : ""}`}
                  onMouseEnter={(e) => {
                    if (has) {
                      setHoverDate(dateStr);
                      setHoverPos({ x: e.clientX, y: e.clientY });
                    }
                  }}
                  onMouseMove={(e) => {
                    if (has) setHoverPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoverDate(null)}
                >
                  <span className="day-num">{d}</span>
                  {has && <span className="gold-dot" />}
                </div>
              );
            })}
          </div>

          <p className="cal-legend">
            <span className="gold-swatch" /> — срок сдачи отчёта (наведите для деталей)
          </p>

          {hoverDate && hoverEvents.length > 0 && (
            <div
              className="cal-tooltip"
              style={{
                left: Math.min(hoverPos.x + 12, window.innerWidth - 340),
                top: Math.min(hoverPos.y + 12, window.innerHeight - 200),
              }}
            >
              <div className="tip-date">{hoverDate}</div>
              {hoverEvents.map((ev, idx) => (
                <div key={idx} className="tip-item">
                  <strong>{ev.report.name}</strong>
                  <span>{ev.report.park}</span>
                  <span className="tip-meta">{ev.periodLabel} · {ev.report.fromTo}</span>
                  <span className="tip-rule">{ev.report.deadlineRule}</span>
                  <span className="tip-basis">{ev.report.basis}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
