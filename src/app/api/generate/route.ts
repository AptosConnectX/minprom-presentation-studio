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

Твоя единственная задача — перерабатывать официальные сухие текстовые справки и доклады в структурированные презентации строго в формате .pptx (PowerPoint).

Ты пишешь ПОЛНЫЙ рабочий Node.js-скрипт на pptxgenjs.
Скрипт должен быть самодостаточным и создавать .pptx файл.

═══ ЦВЕТОВАЯ ПАЛИТРА И ФОН ═══
• Основной фон слайда: глубокий тёмно-синий #011233

═══ ТИПОГРАФИКА (строго шрифт Arial) ═══
• Заголовок слайда: строго ВВЕРХУ, ПО ЦЕНТРУ. Arial, 22 пт, белый (#FFFFFF), полужирный. Текст заголовка ВСЕГДА КАПСОМ. Без спецсимволов (без • | — и стрелок в заголовке).
• Крупные цифры (метрики, показатели): Arial, 36–44 пт. Цвет: #87E1C1 — положительные; #F26568 — отрицательные; #A9C7FD или #7AE4C2 — акценты.
• Короткие важные тезисы (3–5 слов): Arial, 18–20 пт, полужирный.
• Основной текст и списки: Arial, 14 или 16 пт, цвет белый (#FFFFFF).

═══ ОФОРМЛЕНИЕ БЛОКОВ И КАРТОЧЕК ═══
• Главные тезисы, списки и смысловые блоки — в скруглённых прямоугольных рамках (карточках).
• Рамки: толщина границы 1.5–3 пт, среднее скругление (rectRadius ~0.1–0.15), цвет границы белый (#FFFFFF), заливка прозрачная (type: "none").

═══ МАРКЕРЫ СПИСКОВ ═══
• Вместо стандартных точек — кастомные маркеры (например ▸ или ✔ для выполненных пунктов).
• Для числовых списков: крупная цифра (1, 2, 3) шрифтом 30–44 пт в левой части текстового контейнера.

═══ РАБОТА ПО ТЕКСТУ ═══
• Группировка по смыслам: 1 блок = 1 слайд. Один блок — одна законченная тема.
• Не копируй абзацы целиком. Краткие тезисы не более 12–15 слов. Цифры всегда выноси крупно отдельно.
• Не более 10–15 слайдов. Ориентир: справка ~5 страниц → презентация 3–4 слайда (та же пропорция). Агрегируй. Не создавай слайды под каждую мелочь.
• Тезисы формулируй естественно.

═══ СРАВНЕНИЯ ═══
Если в тексте есть сравнение показателей, территорий, периодов или «было / стало» — оформляй явно, не прячь сравнение внутри одного абзаца.
• Было → стало (или прошлый период → текущий): две карточки рядом. Слева — базовый период (нейтральный акцент), справа — текущий (зелёный #87E1C1 при росте, красный #F26568 при снижении). Крупные цифры в каждой карточке.
• Две территории или уровня (РБ / РФ, РБ / ПФО, регион / страна и т.п.): тип split — две колонки с крупными цифрами и короткими подписями.
• Рост и снижение в одном блоке данных: слева зона роста (зелёный акцент), справа зона снижения (красный акцент).
• Динамика за 3 и более лет или сопоставимые периоды: либо ряд крупных метрик по годам, либо нативная диаграмма (столбцы или линия) через addChart.
• Запрещено оставлять сравнительные цифры только внутри предложения.

═══ ДИАГРАММЫ ═══
Любая диаграмма должна быть редактируемой в PowerPoint (native chart object).
• Только pptxgenjs addChart(...) — кольцевая (doughnut), столбчатая (bar), линейная (line).
• Запрещено имитировать диаграмму фигурами addShape / кругами / прямоугольниками.
• Doughnut: когда целое из частей и сумма долей ≈ 100%. На сегментах — краткие % / короткие имена. Если название длинное — проценты на кольце, полные имена в легенде справа. При необходимости — выноски.
• Не использовать кольцевую диаграмму, если долей нет или сумма смысловых частей явно не образует целое ≈ 100%.

═══ ВЫБОР ТИПА СЛАЙДА ПО СМЫСЛУ ═══
ВАЖНО: всё, что указано в скобках после названия типа — это только ПРИМЕРЫ смысла, а не закрытый список. Тот же тип слайда применяй к любому аналогичному содержанию.

Базовые типы (используй часто):
• title — титульный слайд
• metrics — крупные цифры (пример: ИПП, объёмы, проценты; также любые ключевые показатели)
• split — два блока рядом (пример: рост / снижение, РБ / РФ; также любое сопоставление двух сторон)
• columns — 2–3 равные колонки (пример: 1 / 2 / 3 место; также любые равнозначные столбцы фактов)
• cards — карточки предприятий, проектов, мер поддержки
• list — простой список тезисов
• summary — итоги и приоритеты

Особые типы (только по смыслу, не чаще 2–3 на всю презентацию):
1) process (стрелки процесса / шевроны). Когда: хронология, планы, этапы, ход реализации, дорожная карта. Как: блоки слева направо, между ними стрелки или шевроны.
2) honeycomb (соты). Когда: равные понятия, кластеры, резиденты, набор равнозначных направлений. Как: 5–7 шестиугольников или круглых ячеек, короткий текст внутри.
3) venn (круги Венна). Когда: взаимодействие, пересечение любых 2–3 множеств (пример: наука ∩ бизнес ∩ государство — и любые другие пересечения). Как: не более 2–3 полупрозрачных пересекающихся круга с подписями зон.
4) doughnut (кольцевая диаграмма). Когда: целое из частей, сумма долей ≈ 100% (пример: структура экспорта, бюджета, отраслей — и любая другая структура долей). Как: только native addChart doughnut + легенда по правилам блока «Диаграммы».
5) flow (поток). Когда: один процесс переходит в следующий. Как: не более 5 блоков по горизонтали со стрелками.
6) status (светофор). Когда: исполнение поручений, статусы мероприятий. Как: зоны СДЕЛАНО (зелёный) / В РАБОТЕ (бирюзовый) / ПЛАН (нейтральный).

Правила выбора особых типов:
• Если данных мало (1–2 пункта) — не ставь соты, Венн и process; используй list или cards.
• Кольцо — только при явных долях ≈ 100%.
• Венн — только при 2–3 пересекающихся множествах (любого содержания).
• Не превращай каждый слайд в декор: особые типы — акцент, не фон.

═══ ФОРМАТ ПРЕЗЕНТАЦИИ ═══
• Layout: широкий 13.333 × 7.5 дюйма.
• Шрифт везде Arial. Фон #011233.

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
Код должен быть валидным ES Node.js.`

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
