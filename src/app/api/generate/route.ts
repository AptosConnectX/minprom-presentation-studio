import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import mammoth from "mammoth";
import { writeFile, readFile, unlink } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { randomBytes } from "crypto";

export const maxDuration = 120;
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const SYSTEM_PROMPT = `Ты — специализированный ИИ-помощник Министерства промышленности, энергетики и инноваций Республики Башкортостан. Твоё имя — Башкирский Шеньжень!

Единственная задача — перерабатывать официальные справки и доклады в презентации PowerPoint.

Ты пишешь ПОЛНЫЙ рабочий Node.js-скрипт на pptxgenjs.
Скрипт должен быть самодостаточным и создавать .pptx файл.

═══ ЖЁСТКИЕ ПРАВИЛА СТИЛЯ ═══
Фон каждого слайда: #011233.
Шрифт ВЕЗДЕ: Arial.

Заголовок слайда:
- строго ВВЕРХУ, ПО ЦЕНТРУ
- Arial 20–22 pt, Bold, #FFFFFF
- ВСЕГДА КАПСОМ
- БЕЗ точек, тире, вертикальных черт, стрелок в заголовке

Крупные цифры / метрики:
- Arial 36–44 pt, Bold
- положительные: #87E1C1
- отрицательные: #F26568
- акценты: #A9C7FD или #7AE4C2

Короткие тезисы: Arial 14–16 pt, белый #FFFFFF.
Маркер списков: символ ▸.

Карточки / блоки:
- скруглённые прямоугольники (roundRect)
- граница 1.5 pt, цвет #FFFFFF, заливка прозрачная (type: "none")
- rectRadius ~0.1–0.15

Layout: wide 13.333 × 7.5 дюйма.
Максимум 10–15 слайдов. Агрегируй. Не плоди слайды под каждую мелочь.
Цифры ВСЕГДА выноси крупно отдельно.
Тезисы естественные, 5–12 слов.

═══ СРАВНЕНИЯ ═══
Если в тексте есть сравнение показателей, территорий, периодов или «было / стало» — оформляй явно.
- Было → стало: две карточки рядом. Слева базовый период, справа текущий (#87E1C1 при росте, #F26568 при снижении). Крупные цифры.
- Две территории/уровня (РБ / РФ, РБ / ПФО и т.п.): split — две колонки с крупными цифрами.
- Рост и снижение: слева зелёная зона, справа красная.
- Динамика 3+ лет: ряд метрик по годам ИЛИ нативная диаграмма (bar/line) через addChart.
- Запрещено оставлять сравнительные цифры только внутри предложения.

═══ ДИАГРАММЫ ═══
Любая диаграмма должна быть редактируемой в PowerPoint.
- Только addChart(...) — кольцевая, столбчатая, линейная.
- Запрещено имитировать диаграмму фигурами addShape.
- Doughnut: когда целое из частей и сумма долей ≈ 100%.
- На сегментах — краткие % / короткие имена. Если название длинное — проценты на кольце, полные имена в легенде справа.
- Не использовать doughnut без явных долей ≈ 100%.

═══ ВЫБОР ТИПА СЛАЙДА ═══
ВАЖНО: всё в скобках после типа — только ПРИМЕРЫ смысла, не закрытый список. Тот же тип применяй к любому аналогичному содержанию.

Базовые (часто):
- title — титул
- metrics — крупные цифры (пример: ИПП, объёмы; любые ключевые показатели)
- split — два блока (пример: рост/снижение, РБ/РФ; любое сопоставление двух сторон)
- columns — 2–3 колонки (пример: 1/2/3 место; любые равнозначные столбцы)
- cards — карточки предприятий и проектов
- list — простой список
- summary — итоги

Особые (только по смыслу, не больше 2–3 на презентацию):
1) process — хронология, планы, этапы: блоки слева направо + стрелки/шевроны
2) honeycomb — равные понятия, кластеры, резиденты: 5–7 шестиугольников или круглых ячеек
3) venn — пересечение любых 2–3 множеств (пример: наука∩бизнес∩государство — и любые другие): 2–3 полупрозрачных круга
4) doughnut — целое из частей ≈100% (пример: структура экспорта — и любая структура долей): только addChart doughnut + легенда
5) flow — процесс по шагам: до 5 блоков со стрелками
6) status — сделано/в работе/план: три зоны с цветовыми акцентами

Правила: мало данных → list/cards; кольцо только при долях ≈100%; венн только при 2–3 множествах; не декорируй каждый слайд.

═══ ФОРМАТ ОТВЕТА ═══
Верни ТОЛЬКО JavaScript-код. Без markdown, без пояснений, без code fences.
Код обязан:
1. Использовать require("pptxgenjs")
2. Создавать презентацию в переменной pptx
3. В конце:
const outPath = process.argv[2] || "/tmp/out.pptx";
pptx.writeFile({ fileName: outPath }).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

Не используй import (только require).
Не обращайся к сети, process.env, файлам кроме outPath.
Код должен быть валидным ES Node.js.`;

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractJsCode(raw: string): string {
  let code = raw.trim();
  code = code.replace(/^```(?:javascript|js|typescript|ts)?\s*/i, "");
  code = code.replace(/```\s*$/i, "");
  code = code.trim();

  if (!code.includes("pptxgenjs") && !code.includes("PptxGenJS")) {
    const match = raw.match(
      /(?:const|var|let)\s+PptxGenJS[\s\S]*writeFile[\s\S]*/i
    );
    if (match) code = match[0];
  }
  return code;
}

function sanitizeScript(code: string): string {
  const banned = [
    /require\s*\(\s*["']child_process["']\s*\)/i,
    /require\s*\(\s*["']fs["']\s*\)/i,
    /require\s*\(\s*["']net["']\s*\)/i,
    /require\s*\(\s*["']http["']\s*\)/i,
    /require\s*\(\s*["']os["']\s*\)/i,
    /process\.env/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /while\s*\(\s*true\s*\)/i,
  ];
  for (const re of banned) {
    if (re.test(code)) {
      throw new Error("Скрипт содержит запрещённые конструкции");
    }
  }
  if (!/pptxgenjs/i.test(code) && !/PptxGenJS/i.test(code)) {
    throw new Error("Скрипт не использует pptxgenjs");
  }
  return code;
}

async function runScript(code: string): Promise<Buffer> {
  const id = randomBytes(8).toString("hex");
  const scriptPath = path.join("/tmp", `pres_${id}.js`);
  const outPath = path.join("/tmp", `pres_${id}.pptx`);

  const wrapper = `
const __OUT__ = process.argv[2];
process.argv[2] = __OUT__;
${code}
`;

  await writeFile(scriptPath, wrapper, "utf8");

  try {
    await execFileAsync(process.execPath, [scriptPath, outPath], {
      timeout: 90000,
      maxBuffer: 20 * 1024 * 1024,
      env: {
        ...process.env,
        NODE_PATH: path.join(process.cwd(), "node_modules"),
        HOME: "/tmp",
      },
      cwd: process.cwd(),
    });

    const pptxBuf = await readFile(outPath);
    if (!pptxBuf || pptxBuf.length < 1000) {
      throw new Error("Скрипт не создал валидный PPTX");
    }
    return pptxBuf;
  } finally {
    unlink(scriptPath).catch(() => {});
    unlink(outPath).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const extraRaw = formData.get("extraPrompts") as string | null;
    let extraPrompts: string[] = [];
    if (extraRaw) {
      try {
        extraPrompts = JSON.parse(extraRaw);
      } catch {
        extraPrompts = [];
      }
    }

    if (!file) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromDocx(buffer);

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Не удалось извлечь текст из документа или текст слишком короткий" },
        { status: 400 }
      );
    }

    const apiKey = process.env.PROXYAPI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API-ключ не настроен на сервере" },
        { status: 500 }
      );
    }

    let system = SYSTEM_PROMPT;
    if (extraPrompts.length > 0) {
      system +=
        "\n\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ ПОЛЬЗОВАТЕЛЯ (обязательно учти при вёрстке слайдов):\n" +
        extraPrompts.map((p, i) => `${i + 1}. ${p}`).join("\n");
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: "https://api.proxyapi.ru/v1",
    });

    const completion = await openai.chat.completions.create({
      model: "x-ai/grok-4.7",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Составь полный pptxgenjs-скрипт презентации по этой справке.\n\nТребования:\n- 10–15 слайдов максимум\n- фон #011233, Arial, заголовки КАПСОМ по центру\n- цифры крупно (#87E1C1 / #F26568)\n- сравнения оформляй явно (две карточки / split)\n- диаграммы только через addChart\n- при подходящем смысле process / honeycomb / venn / doughnut / flow / status\n- сохранить в process.argv[2]\n\nТекст справки:\n\n${text.slice(0, 100000)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 32000,
    });

    const raw = completion.choices[0]?.message?.content || "";
    if (!raw || raw.length < 200) {
      return NextResponse.json(
        { error: "Модель вернула пустой или слишком короткий ответ" },
        { status: 500 }
      );
    }

    let code = extractJsCode(raw);
    try {
      code = sanitizeScript(code);
    } catch (e: any) {
      console.error("Sanitize failed:", e.message, code.slice(0, 400));
      return NextResponse.json(
        { error: e.message || "Скрипт отклонён проверкой безопасности" },
        { status: 500 }
      );
    }

    if (!code.includes('require("pptxgenjs")') && !code.includes("require('pptxgenjs')")) {
      code = `const PptxGenJS = require("pptxgenjs");\n` + code;
    }

    let pptxBuffer: Buffer;
    try {
      pptxBuffer = await runScript(code);
    } catch (e: any) {
      console.error("Script run failed:", e.message, e.stderr || "");
      const retryCompletion = await openai.chat.completions.create({
        model: "x-ai/grok-4.7",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Предыдущий скрипт упал с ошибкой: ${String(e.message || e).slice(0, 500)}\n\nПерепиши ПОЛНЫЙ исправный pptxgenjs-скрипт. Только код, require(\"pptxgenjs\"), запись в process.argv[2].\n\nСправка:\n${text.slice(0, 80000)}`,
          },
        ],
        temperature: 0.15,
        max_tokens: 32000,
      });
      const raw2 = retryCompletion.choices[0]?.message?.content || "";
      let code2 = extractJsCode(raw2);
      code2 = sanitizeScript(code2);
      if (!code2.includes('require("pptxgenjs")') && !code2.includes("require('pptxgenjs')")) {
        code2 = `const PptxGenJS = require("pptxgenjs");\n` + code2;
      }
      pptxBuffer = await runScript(code2);
    }

    const body = new Uint8Array(pptxBuffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="presentation.pptx"`,
        "X-Mode": "full-script",
      },
    });
  } catch (err: any) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: err.message || "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
