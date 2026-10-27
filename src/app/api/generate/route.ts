import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import mammoth from "mammoth";
import PptxGenJS from "pptxgenjs";

export const maxDuration = 120;
export const runtime = "nodejs";

const SYSTEM_PROMPT = `Ты — специализированный ИИ-помощник Министерства промышленности, энергетики и инноваций Республики Башкортостан.

Твоя единственная задача — перерабатывать официальные сухие текстовые справки и доклады в структурированные презентации строго в формате .pptx (PowerPoint).

При создании презентации соблюдай следующие жесткие стилистические правила:

ЦВЕТОВАЯ ПАЛИТРА:
- Основной фон слайда: Глубокий темно-синий цвет #011233

ТИПОГРАФИКА (СТРОГО ШРИФТ ARIAL):
- Заголовок слайда: ВЕРХУ, ПО ЦЕНТРУ. Arial 22 пт, Белый (#FFFFFF), Bold, ВСЕГДА КАПСОМ.
- Крупные цифры: Arial 44 пт. Цвет #87E1C1 (положительные), #F26568 (отрицательные), #A9C7FD или #7AE4C2 (акценты).
- Короткие тезисы: Arial 20 пт, Bold.
- Основной текст: Arial 14-16 пт, Белый.

КАРТОЧКИ:
- Скругленные прямоугольные рамки, толщина границы 3 пт, цвет белый, заливка прозрачная.

РАБОТА ПО ТЕКСТУ:
1. Разбей текст на логические блоки (1 блок = 1 слайд).
2. Максимум 10-11 слайдов.
3. Не копируй абзацы. Только краткие тезисы (Глагол + Существительное, до 7-10 слов).
4. Цифры выноси крупным шрифтом отдельно.
5. Заголовки чистые, КАПСОМ, без точек, тире, вертикальных черт.

Отвечай ТОЛЬКО валидным JSON-массивом слайдов. Никакого текста до или после.

Формат слайда:
{
  "title": "ЗАГОЛОВОК КАПСОМ",
  "type": "metrics" | "cards" | "list" | "timeline" | "comparison" | "title",
  "subtitle": "подзаголовок для title-слайда",
  "metrics": [{"value": "106.6%", "label": "ИПП 2026", "positive": true}],
  "cards": [{"title": "Краткий заголовок", "items": ["Тезис один", "Тезис два"]}],
  "items": ["Тезис один", "Тезис два"],
  "timeline": [{"date": "26–28 АВГУСТА 2025", "points": ["Результат 1", "Результат 2"]}],
  "comparison": {"before": {"title": "БЫЛО", "value": "95.7%", "label": "ИПП 2025"}, "after": {"title": "СТАЛО", "value": "106.6%", "label": "ИПП 2026"}}
}

Первый слайд всегда типа "title".`;

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function buildPptx(slides: any[]): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
  pptx.layout = "WIDE";

  const BG = "011233";
  const WHITE = "FFFFFF";
  const GREEN = "87E1C1";
  const RED = "F26568";
  const ACCENT = "A9C7FD";
  const TEAL = "7AE4C2";

  for (const slideData of slides) {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: "100%",
      fill: { color: BG },
    });

    if (slideData.title) {
      slide.addText(String(slideData.title).toUpperCase(), {
        x: 0.5, y: 0.3, w: 12.3, h: 0.6,
        fontSize: 22, fontFace: "Arial", color: WHITE, bold: true, align: "center",
      });
    }

    if (slideData.type === "title") {
      slide.addText(slideData.subtitle || "Министерство промышленности, энергетики и инноваций РБ", {
        x: 1, y: 3.2, w: 11.3, h: 0.5,
        fontSize: 16, fontFace: "Arial", color: ACCENT, align: "center",
      });
      if (slideData.metrics?.[0]) {
        slide.addText(String(slideData.metrics[0].value), {
          x: 1, y: 4.0, w: 11.3, h: 0.8,
          fontSize: 44, fontFace: "Arial", color: GREEN, align: "center", bold: true,
        });
      }
      continue;
    }

    if (slideData.metrics?.length) {
      const count = Math.min(slideData.metrics.length, 4);
      const cardW = 2.8;
      const gap = 0.3;
      const totalW = count * cardW + (count - 1) * gap;
      const startX = (13.333 - totalW) / 2;

      slideData.metrics.slice(0, 4).forEach((m: any, i: number) => {
        const x = startX + i * (cardW + gap);
        const color = m.positive === false ? RED : m.accent ? ACCENT : GREEN;

        slide.addShape(pptx.ShapeType.roundRect, {
          x, y: 1.3, w: cardW, h: 1.8,
          fill: { type: "none" },
          line: { color: WHITE, width: 1.5 },
          rectRadius: 0.15,
        });

        slide.addText(String(m.value), {
          x, y: 1.5, w: cardW, h: 0.9,
          fontSize: 36, fontFace: "Arial", color, bold: true, align: "center",
        });

        slide.addText(m.label || "", {
          x: x + 0.1, y: 2.5, w: cardW - 0.2, h: 0.4,
          fontSize: 12, fontFace: "Arial", color: WHITE, align: "center",
        });
      });
    }

    if (slideData.cards?.length) {
      const count = Math.min(slideData.cards.length, 3);
      const cardW = 3.7;
      const gap = 0.35;
      const totalW = count * cardW + (count - 1) * gap;
      const startX = (13.333 - totalW) / 2;
      const startY = slideData.metrics?.length ? 3.5 : 1.4;

      slideData.cards.slice(0, 3).forEach((card: any, i: number) => {
        const x = startX + i * (cardW + gap);

        slide.addShape(pptx.ShapeType.roundRect, {
          x, y: startY, w: cardW, h: 3.2,
          fill: { type: "none" },
          line: { color: WHITE, width: 1.5 },
          rectRadius: 0.12,
        });

        if (card.title) {
          slide.addText(card.title, {
            x: x + 0.2, y: startY + 0.2, w: cardW - 0.4, h: 0.4,
            fontSize: 14, fontFace: "Arial", color: TEAL, bold: true,
          });
        }

        if (card.items) {
          slide.addText(card.items.map((item: string) => "▸  " + item).join("\n"), {
            x: x + 0.2, y: startY + 0.7, w: cardW - 0.4, h: 2.3,
            fontSize: 13, fontFace: "Arial", color: WHITE, valign: "top",
          });
        }
      });
    }

    if (slideData.items?.length && !slideData.cards) {
      const startY = slideData.metrics?.length ? 3.4 : 1.4;
      slide.addText(slideData.items.map((item: string) => "▸  " + item).join("\n\n"), {
        x: 1.2, y: startY, w: 10.9, h: 5,
        fontSize: 16, fontFace: "Arial", color: WHITE, valign: "top",
      });
    }

    if (slideData.timeline?.length) {
      let y = 1.4;
      for (const t of slideData.timeline.slice(0, 3)) {
        slide.addText(t.date, {
          x: 1, y, w: 11.3, h: 0.4,
          fontSize: 18, fontFace: "Arial", color: TEAL, bold: true,
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 1, y: y + 0.45, w: 11.3, h: 0.02,
          fill: { color: TEAL },
        });
        slide.addText((t.points || []).map((p: string) => "▸  " + p).join("\n"), {
          x: 1.2, y: y + 0.6, w: 10.9, h: 1.2,
          fontSize: 14, fontFace: "Arial", color: WHITE,
        });
        y += 1.9;
      }
    }

    if (slideData.comparison) {
      const { before, after } = slideData.comparison;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 1.5, y: 2.2, w: 4.5, h: 3,
        fill: { type: "none" },
        line: { color: WHITE, width: 1.5 },
        rectRadius: 0.15,
      });
      slide.addText(before?.title || "БЫЛО", {
        x: 1.5, y: 2.5, w: 4.5, h: 0.4,
        fontSize: 14, fontFace: "Arial", color: WHITE, align: "center",
      });
      slide.addText(before?.value || "", {
        x: 1.5, y: 3.1, w: 4.5, h: 0.9,
        fontSize: 40, fontFace: "Arial", color: WHITE, align: "center", bold: true,
      });
      slide.addText(before?.label || "", {
        x: 1.5, y: 4.2, w: 4.5, h: 0.4,
        fontSize: 13, fontFace: "Arial", color: WHITE, align: "center",
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 7.3, y: 2.2, w: 4.5, h: 3,
        fill: { color: "1a5c4a" },
        line: { color: GREEN, width: 1.5 },
        rectRadius: 0.15,
      });
      slide.addText(after?.title || "СТАЛО", {
        x: 7.3, y: 2.5, w: 4.5, h: 0.4,
        fontSize: 14, fontFace: "Arial", color: WHITE, align: "center",
      });
      slide.addText(after?.value || "", {
        x: 7.3, y: 3.1, w: 4.5, h: 0.9,
        fontSize: 40, fontFace: "Arial", color: GREEN, align: "center", bold: true,
      });
      slide.addText(after?.label || "", {
        x: 7.3, y: 4.2, w: 4.5, h: 0.4,
        fontSize: 13, fontFace: "Arial", color: WHITE, align: "center",
      });
    }
  }

  const result = await pptx.write({ outputType: "nodebuffer" });
  return result as Buffer;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

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

    const openai = new OpenAI({
      apiKey,
      baseURL: "https://api.proxyapi.ru/v1",
    });

    const completion = await openai.chat.completions.create({
      model: "x-ai/grok-4.7",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Обработай следующую справку и верни ТОЛЬКО JSON-массив слайдов (максимум 11):\n\n${text.slice(0, 120000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    });

    let content = completion.choices[0]?.message?.content || "[]";
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let slides: any[];
    try {
      slides = JSON.parse(content);
      if (!Array.isArray(slides)) throw new Error("Not an array");
    } catch {
      console.error("Failed to parse LLM response:", content.slice(0, 500));
      return NextResponse.json(
        { error: "Модель вернула некорректный JSON. Попробуйте ещё раз." },
        { status: 500 }
      );
    }

    if (slides.length === 0) {
      return NextResponse.json({ error: "Не удалось сформировать слайды" }, { status: 500 });
    }

    slides = slides.slice(0, 11);
    const pptxBuffer = await buildPptx(slides);

    // Fix TypeScript: Buffer -> Uint8Array for NextResponse body
    const body = new Uint8Array(pptxBuffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="presentation.pptx"`,
        "X-Slides-Count": String(slides.length),
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
