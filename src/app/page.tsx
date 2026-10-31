"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  eventsByDate,
  mergeReports,
  type CalendarEvent,
  type ReportItem,
} from "../lib/reports";

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
const CUSTOM_KEY = "minprom_custom_reports";
const REMOVED_KEY = "minprom_removed_ids";

const emptyForm = (): Omit<ReportItem, "id"> => ({
  period: "quarterly",
  name: "",
  park: "",
  deadlineRule: "не позднее 10-го рабочего дня месяца, следующего за отчетным кварталом",
  fromTo: "",
  eBudget: "Да",
  basis: "",
});

function monthCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const tipHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [calMonth, setCalMonth] = useState(() => Math.floor(new Date().getMonth() / 3) * 3);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const [customReports, setCustomReports] = useState<ReportItem[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(EXTRA_KEY);
      if (saved) setExtraPrompts(JSON.parse(saved));
      const c = localStorage.getItem(CUSTOM_KEY);
      if (c) setCustomReports(JSON.parse(c));
      const r = localStorage.getItem(REMOVED_KEY);
      if (r) setRemovedIds(JSON.parse(r));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(EXTRA_KEY, JSON.stringify(extraPrompts));
  }, [extraPrompts]);
  useEffect(() => {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(customReports));
  }, [customReports]);
  useEffect(() => {
    localStorage.setItem(REMOVED_KEY, JSON.stringify(removedIds));
  }, [removedIds]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, downloadUrl]);

  const activeReports = useMemo(
    () => mergeReports(customReports, removedIds),
    [customReports, removedIds]
  );
  const eventMap = useMemo(
    () => eventsByDate(calYear, activeReports),
    [calYear, activeReports]
  );

  const quarterStart = Math.floor(calMonth / 3) * 3;
  const quarterMonths = [quarterStart, quarterStart + 1, quarterStart + 2];
  const quarterNum = Math.floor(calMonth / 3) + 1;
  const realNow = new Date();
  const isCurrentYear = calYear === realNow.getFullYear();
  const currentRealMonth = realNow.getMonth();

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

  function handleSecretCommands(raw: string): { handled: boolean; clean: string; notice?: string } {
    const lower = raw.toLowerCase();
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
    const removeToken = "шоколадный вкуснее";
    if (lower.includes(removeToken)) {
      const count = lower.split(removeToken).length - 1;
      setExtraPrompts((prev) => prev.slice(0, Math.max(0, prev.length - count)));
      return {
        handled: true,
        clean: "",
        notice: count === 1 ? "Удалён последний доп. промпт." : `Удалено доп. промптов: ${count}.`,
      };
    }
    return { handled: false, clean: raw };
  }

  const sendMessage = async () => {
    if (loading) return;
    const raw = text.trim();
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
      { role: "user", content: text.trim() || "Сделай презентацию", fileName: file.name },
    ]);
    setText("");
    const progressTimer = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 1800);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("extraPrompts", JSON.stringify(extraPrompts));
      const res = await fetch("/api/generate", { method: "POST", body: formData });
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
      setMessages((m) => [...m, { role: "assistant", content: "Презентация готова. Скачайте файл ниже." }]);
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

  const showTip = (dateStr: string, x: number, y: number) => {
    if (tipHideTimer.current) {
      clearTimeout(tipHideTimer.current);
      tipHideTimer.current = null;
    }
    setHoverDate(dateStr);
    setHoverPos({ x, y });
  };
  const scheduleHideTip = () => {
    if (tipHideTimer.current) clearTimeout(tipHideTimer.current);
    tipHideTimer.current = setTimeout(() => setHoverDate(null), 180);
  };
  const cancelHideTip = () => {
    if (tipHideTimer.current) {
      clearTimeout(tipHideTimer.current);
      tipHideTimer.current = null;
    }
  };

  const hoverEvents: CalendarEvent[] = hoverDate ? eventMap[hoverDate] || [] : [];

  const shiftQuarter = (dir: -1 | 1) => {
    let m = quarterStart + dir * 3;
    let y = calYear;
    if (m < 0) {
      m = 9;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setCalMonth(m);
    setCalYear(y);
  };

  const submitAdd = () => {
    if (!form.name.trim() || !form.park.trim()) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomReports((prev) => [
      ...prev,
      { ...form, id, name: form.name.trim(), park: form.park.trim() },
    ]);
    setForm(emptyForm());
    setShowAdd(false);
  };

  const removeReport = (id: string) => {
    if (id.startsWith("custom-")) {
      setCustomReports((prev) => prev.filter((r) => r.id !== id));
    } else {
      setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  const removableList = activeReports;

  return (
    <main>
      <nav className="sidebar">
        <button className={`side-link ${view === "chat" ? "active" : ""}`} title="Студия / Чат" onClick={() => setView("chat")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
        </button>
        <button className={`side-link ${view === "calendar" ? "active" : ""}`} title="Календарь отчётности" onClick={() => setView("calendar")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
        </button>
      </nav>

      <header className="brand">
        <span className="brand-text">
          Отдел технологического, инфраструктурного и{" "}
          <span className="brand-gold">ИННОВАЦИОННОГО</span> развития
        </span>
        <img src="/bee-logo.png" alt="" className="brand-logo" width={52} height={52} />
        {extraPrompts.length > 0 && (
          <span className="extra-badge" title={`${extraPrompts.length} доп. промпт(ов)`}>+{extraPrompts.length}</span>
        )}
      </header>

      {view === "chat" && (
        <>
          {messages.length === 0 && !file && !loading && (
            <section className="hero-copy">
              <h1>Превратим документ<br />в ясную историю.</h1>
              <p>
                Загрузите .docx или напишите сообщение.
                <br />
                Генерация презентаций в стиле Министерства промышленности, энергетики и инноваций Республики Башкортостан
              </p>
            </section>
          )}

          <section className="conversation">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "user-row" : "ai-message"}>
                {m.role === "user" ? (
                  <div className="user-bubble">
                    {m.fileName && (<div className="file-chip"><span className="doc-icon">W</span>{m.fileName}</div>)}
                    {m.content && <p>{m.content}</p>}
                  </div>
                ) : (
                  <>
                    <div className="ai-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffd43b" strokeWidth="1.8"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg></div>
                    <div className="ai-body"><p style={{ whiteSpace: "pre-wrap" }}>{m.content}</p></div>
                  </>
                )}
              </div>
            ))}

            {loading && !downloadUrl && (
              <div className="ai-message">
                <div className="ai-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffd43b" strokeWidth="1.8"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg></div>
                <div className="ai-body">
                  <strong>{file || stage > 0 ? STAGES[Math.min(stage, STAGES.length - 1)] : "Думаю…"}</strong>
                  {(file || stage > 0) && (<div className="progress"><span style={{ width: `${20 + stage * 25}%` }} /></div>)}
                </div>
              </div>
            )}

            {downloadUrl && (
              <div className="result-card">
                <h3>Презентация сформирована</h3>
                <p>{slidesCount > 0 ? `Собрано ${slidesCount} слайдов в фирменном стиле.` : "Слайды готовы к скачиванию."}</p>
                <a href={downloadUrl} download="presentation.pptx" className="download-btn">Скачать .pptx</a>
              </div>
            )}

            {error && <div className="error-box">{error}</div>}
            <div ref={chatEndRef} />
          </section>

          <div className="composer-wrap">
            {file && (
              <div className="file-pending">
                <span className="doc-icon">W</span><span>{file.name}</span>
                <button type="button" onClick={() => setFile(null)} aria-label="Убрать файл">×</button>
              </div>
            )}
            <div className="composer">
              <button className="upload" onClick={() => inputRef.current?.click()} aria-label="Загрузить DOCX" disabled={loading}>+</button>
              <input ref={inputRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(e) => acceptFile(e.target.files?.[0])} />
              <textarea ref={textRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} placeholder={file ? "Напишите «сделай презентацию» или просто отправьте…" : "Сообщение или загрузите .docx…"} rows={1} disabled={loading} />
              <button className="send" onClick={sendMessage} disabled={loading || (!text.trim() && !file)} aria-label="Отправить">
                {loading ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" className="spin"><circle cx="12" cy="12" r="10" stroke="#111" strokeWidth="3" fill="none" opacity="0.25" /><path d="M12 2a10 10 0 019.9 8.5" stroke="#111" strokeWidth="3" fill="none" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {view === "calendar" && (
        <section className="calendar-view">
          <div className="cal-header">
            <button type="button" onClick={() => shiftQuarter(-1)} aria-label="Предыдущий квартал">‹</button>
            <h2>{quarterNum} квартал {calYear}</h2>
            <button type="button" onClick={() => shiftQuarter(1)} aria-label="Следующий квартал">›</button>
          </div>

          <div className="cal-toolbar">
            <div className="cal-year-switch">
              <button type="button" className={calYear === 2026 ? "on" : ""} onClick={() => setCalYear(2026)}>2026</button>
              <button type="button" className={calYear === 2027 ? "on" : ""} onClick={() => setCalYear(2027)}>2027</button>
            </div>
            <div className="cal-actions">
              <button type="button" className="cal-icon-btn" title="Добавить отчёт" onClick={() => { setForm(emptyForm()); setShowAdd(true); }}>+</button>
              <button type="button" className="cal-icon-btn" title="Удалить отчёт" onClick={() => setShowRemove(true)}>−</button>
            </div>
          </div>

          <div className="cal-quarter">
            {quarterMonths.map((monthIdx) => {
              const cells = monthCells(calYear, monthIdx);
              const isCurrentMonth = isCurrentYear && monthIdx === currentRealMonth;
              return (
                <div key={monthIdx} className={`cal-month-block ${isCurrentMonth ? "current-month" : ""}`}>
                  <div className="cal-month-title">{MONTHS[monthIdx]}</div>
                  <div className="cal-weekdays mini">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => <span key={d}>{d}</span>)}</div>
                  <div className="cal-grid mini">
                    {cells.map((d, i) => {
                      if (d === null) return <div key={`e-${monthIdx}-${i}`} className="cal-cell empty" />;
                      const dateStr = `${calYear}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const has = !!eventMap[dateStr]?.length;
                      const isWeekend = i % 7 >= 5;
                      return (
                        <div
                          key={dateStr}
                          className={`cal-cell ${has ? "gold" : ""} ${isWeekend ? "weekend" : ""}`}
                          onMouseEnter={(e) => { if (has) showTip(dateStr, e.clientX, e.clientY); }}
                          onMouseMove={(e) => { if (has && hoverDate === dateStr) setHoverPos({ x: e.clientX, y: e.clientY }); }}
                          onMouseLeave={() => scheduleHideTip()}
                        >
                          <span className="day-num">{d}</span>
                          {has && <span className="gold-dot" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="cal-legend"><span className="gold-swatch" /> — срок сдачи отчёта (наведите для деталей)</p>

          {hoverDate && hoverEvents.length > 0 && (
            <div
              className="cal-tooltip interactive"
              style={{
                left: Math.min(hoverPos.x + 12, typeof window !== "undefined" ? window.innerWidth - 360 : 400),
                top: Math.min(hoverPos.y + 12, typeof window !== "undefined" ? window.innerHeight - 240 : 200),
              }}
              onMouseEnter={cancelHideTip}
              onMouseLeave={scheduleHideTip}
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

          {showAdd && (
            <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <h3>Добавить отчёт</h3>
                <p className="modal-hint">Заполните поля. Отчёт автоматически появится на всех сроках по правилу.</p>
                <label>Наименование отчёта *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Отчет о расходах…" /></label>
                <label>Предприятие / парк *<input value={form.park} onChange={(e) => setForm({ ...form, park: e.target.value })} placeholder="Индустриальный парк…" /></label>
                <label>Периодичность
                  <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value as "quarterly" | "annual" })}>
                    <option value="quarterly">Ежеквартально</option>
                    <option value="annual">Ежегодно</option>
                  </select>
                </label>
                <label>Правило срока
                  <select value={form.deadlineRule} onChange={(e) => setForm({ ...form, deadlineRule: e.target.value })}>
                    <option value="не позднее 5 рабочего дня, следующего за отчетным кварталом">5 раб. день после квартала</option>
                    <option value="не позднее 10-го рабочего дня месяца, следующего за отчетным кварталом">10 раб. день месяца после квартала</option>
                    <option value="не позднее 15-го рабочего дня месяца, следующего за отчетным кварталом">15 раб. день месяца после квартала</option>
                    <option value="не позднее 10-го числа месяца, следующего за отчетным кварталом">10-е число месяца после квартала</option>
                    <option value="не позднее 5 рабочего дня, следующего за отчетным годом">5 раб. день после года</option>
                    <option value="не позднее 30 рабочих дней месяца, следующего за отчетным годом">30 раб. дней после года</option>
                    <option value="до 1 марта года, следующего за отчетным годом">до 1 марта</option>
                    <option value="до 1 апреля года, следующего за отчетным годом">до 1 апреля</option>
                  </select>
                </label>
                <label>От кого → кому<input value={form.fromTo} onChange={(e) => setForm({ ...form, fromTo: e.target.value })} placeholder="УК → Минпром РБ" /></label>
                <label>Электронный бюджет
                  <select value={form.eBudget} onChange={(e) => setForm({ ...form, eBudget: e.target.value })}>
                    <option value="Да">Да</option>
                    <option value="Нет (СЭД)">Нет (СЭД)</option>
                    <option value="Частично">Частично</option>
                    <option value="—">—</option>
                  </select>
                </label>
                <label>Основание<input value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value })} placeholder="Соглашение …, ПП РФ № …" /></label>
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowAdd(false)}>Отмена</button>
                  <button type="button" className="btn-primary" onClick={submitAdd} disabled={!form.name.trim() || !form.park.trim()}>Добавить</button>
                </div>
              </div>
            </div>
          )}

          {showRemove && (
            <div className="modal-backdrop" onClick={() => setShowRemove(false)}>
              <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
                <h3>Удалить отчёт из календаря</h3>
                <p className="modal-hint">Одинаковые названия различаются по предприятию и основанию.</p>
                <div className="remove-list">
                  {removableList.map((r) => (
                    <button key={r.id} type="button" className="remove-item" onClick={() => removeReport(r.id)}>
                      <strong>{r.name}</strong>
                      <span className="rm-park">{r.park}</span>
                      <span className="rm-meta">{r.period === "quarterly" ? "ежеквартально" : "ежегодно"} · {r.fromTo}</span>
                      <span className="rm-rule">{r.deadlineRule}</span>
                      <span className="rm-basis">{r.basis}</span>
                      <span className="rm-del">Удалить</span>
                    </button>
                  ))}
                  {removableList.length === 0 && <p className="modal-hint">Список пуст</p>}
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowRemove(false)}>Закрыть</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
