import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import mammoth from "mammoth";
// @ts-ignore
import { convertJsonOutline, jsonToPptx } from "outline-to-slides";

export const maxDuration = 60;
export const runtime = "nodejs";

const MODEL = "@cf/openai/gpt-oss-120b";

const STEP1_SYSTEM = 
  "Ты — редактор презентаций для Министерства промышленности, энергетики и инноваций Республики Башкортостан. Твоё имя — Башкирский Шеньжень.";

function step1User(doc: string) {
  return `Сделай презентацию в министерском стиле на основе документа ниже.

Документ:
${doc}`;
}

const STEP2_SYSTEM = "Ты — дизайнер презентаций. Ответ — ТОЛЬКО валидный JSON.";

// Промпт, который просит ИИ использовать простые типы слайдов
function step2User(structure: string) {
  return `Переведи текстовую структуру презентации в JSON.
Твоя задача — выбрать подходящий тип (type) для каждого слайда и заполнить его данными.

ДОСТУПНЫЕ ТИПЫ (type):
1. "content" — Обычный текст. (content: "текст абзаца")
2. "bullets" — Список. (points: ["пункт 1", "пункт 2"])
3. "quote" — Цитата. (content: "текст цитаты")
4. "two_column" — Две колонки. (left: { heading: "Слева", content: "..." }, right: { heading: "Справа", content: "..." })
5. "metrics" — Блок с важными цифрами. (metrics: [{ title: "Выручка", value: "100 млн", description: "Рост 10%" }])
6. "chart" — График. (chart_type: "bar" | "line" | "pie", chart_json: "{\"labels\": [\"A\",\"B\"], \"datasets\": [{\"data\":[10,20]}]}", text_heading: "...", text_body: "...")
7. "table" — Таблица. (headers: ["Колонка 1", "Колонка 2"], rows: [["данные", "данные"]])

СХЕМА JSON:
{
  "title": "Название всей презентации",
  "author": "Министерство промышленности РБ",
  "theme": "default",
  "slides": [
    {
      "title": "Заголовок слайда",
      "type": "выбранный_тип",
      ...поля_для_этого_типа...
    }
  ]
}

ЖЕСТКИЕ ПРАВИЛА:
- Не придумывай координаты! Только выбирай тип и заполняй контент.
- Текст в "points" должен быть кратким (до 15 слов).
- Сохрани ВСЮ информацию из текста.

Текст структуры:
${structure}`;
}

// ... (функция repairJson и normalizePlan остаются без изменений)
function repairJson(raw: string): string {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = s.indexOf("{"); if (start === -1) return s; s = s.slice(start);
  let ob = 0, ok = 0, is = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]; if (esc) { esc = false; continue; } if (c === "\\") { esc = true; continue; }
    if (c === '"') { is = !is; continue; } if (!is) { if (c === "{") ob++; if (c === "}") ob--; if (c === "[") ok++; if (c === "]") ok--; }
  }
  if (is) s += '"'; while (ok > 0) { s += "]"; ok--; } while (ob > 0) { s += "}"; ob--; } return s;
}

function normalizePlan(raw: any): any {
  // outline-to-slides ожидает объект с полем slides
  return { ...raw, slides: (raw?.slides || []).map((s: any) => ({ ...s })) };
}


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Нет файла" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = (await mammoth.extractRawText({ buffer })).value;

    const apiKey = process.env.CLOUDFLARE_API_KEY;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!apiKey || !accountId) return NextResponse.json({ error: "Нет ключей" }, { status: 500 });

    const openai = new OpenAI({ 
      apiKey, 
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1` 
    });

    console.log(">>> ШАГ 1: Генерация текста...");
    const step1 = await openai.chat.completions.create({
      model: MODEL, 
      messages: [
        { role: "system", content: STEP1_SYSTEM }, 
        { role: "user", content: step1User(text.slice(0, 200000)) }
      ], 
      max_tokens: 20000, 
      temperature: 0.2,
      reasoning_effort: "high" 
    } as any);
    
    const structureText = step1.choices[0]?.message?.content || "";
    
    console.log("ШАГ 1 готов. Символов:", structureText.length);

    console.log(">>> ШАГ 2: Перевод в JSON для outline-to-slides...");
    const step2 = await openai.chat.completions.create({
      model: MODEL, 
      messages: [
        { role: "system", content: STEP2_SYSTEM }, 
        { role: "user", content: step2User(structureText) }
      ], 
      max_tokens: 20000, 
      temperature: 0.1, 
      response_format: { type: "json_object" },
    });
    
    const jsonRaw = step2.choices[0]?.message?.content || "";
    const plan = normalizePlan(JSON.parse(repairJson(jsonRaw)));
    console.log("ШАГ 2 готов. Слайдов:", plan.slides.length);

    console.log(">>> РЕНДЕРИНГ через outline-to-slides...");
    // Конвертируем наш JSON в формат, понятный библиотеке
    const presentation = convertJsonOutline(plan);
    
    // Генерируем файл во временную директорию
    const tempPath = `/tmp/presentation_${Date.now()}.pptx`;
    await jsonToPptx(presentation, tempPath);

    // Читаем файл и отдаем пользователю
    const fs = require('fs');
    const pptxBuffer = fs.readFileSync(tempPath);
    
    // Удаляем временный файл (по желанию)
    try { fs.unlinkSync(tempPath); } catch (e) {}

    return new NextResponse(new Uint8Array(pptxBuffer), { 
      status: 200, 
      headers: { 
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", 
        "Content-Disposition": `attachment; filename="presentation.pptx"` 
      } 
    });

  } catch (err: any) {
    console.error("КРИТИЧЕСКАЯ ОШИБКА:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}