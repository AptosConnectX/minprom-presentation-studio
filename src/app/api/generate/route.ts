import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import mammoth from "mammoth";
import PptxGenJS from "pptxgenjs";

export const maxDuration = 120;
export const runtime = "nodejs";

const SYSTEM_PROMPT = `Ты — специализированный ИИ-помощник Министерства промышленности, энергетики и инноваций Республики Башкортостан.

Единственная задача — перерабатывать официальные справки и доклады в структурированные презентации.

ЖЁСТКИЕ ПРАВИЛА СТИЛЯ:
- Фон слайда: #011233
- Заголовок: ВЕРХУ ПО ЦЕНТРУ, Arial 22pt, белый, Bold, СТРОГО КАПСОМ, без точек/тире/вертикальных черт
- Крупные цифры: Arial 40-44pt, цвет #87E1C1 (плюс), #F26568 (минус), #A9C7FD / #7AE4C2 (акцент)
- Тезисы: короткие, естественные, 5–12 слов. НЕ натягивай искусственно «Глагол + Существительное»
- Списки: маркер ▸
- Максимум 10–11 слайдов. Агрегируй информацию.

КАК СТРОИТЬ ХОРОШИЕ СЛАЙДЫ (ориентир на эталон):
1. Титульный слайд — название справки + период + ключевая дата.
2. ИПП / динамика — крупные цифры 2025 и 2026 рядом, подписи «ниже/выше РФ и ПФО», блоки РОСТ и СНИЖЕНИЕ.
3. Отгрузка + драйверы роста — крупные суммы + 5–6 отраслей с процентами крупно.
4. Лидерство по продукции — три колонки: 1 МЕСТО / 2 МЕСТО / 3 МЕСТО со списками.
5. Господдержка и ФРП — крупные суммы бюджета + факты по Фонду.
6. Приоритетные инвестпроекты — портфель крупно + ключевые проекты с суммами.
7. Крупные компании — карточки (Башнефть, Башкирская медь, БГК и т.д.) с суммой и кратким описанием.
8. Энергетика — мощность, выработка, инвестиции + вводы объектов.
9. Газомоторное топливо + инновации + рейтинги.
10. Кадры + итоговые приоритеты.

ЦИФРЫ ВСЕГДА ВЫНОСИ КРУПНО. Не прячь проценты и рубли внутри предложений.

Отвечай ТОЛЬКО валидным JSON-массивом. Никакого текста до/после JSON.

Схема слайда:
{
  "title": "ЗАГОЛОВОК КАПСОМ",
  "type": "title" | "metrics" | "split" | "columns" | "cards" | "list" | "timeline" | "summary",
  "subtitle": "текст под заголовком (только для title)",
  "metrics": [
    {"value": "106,6%", "label": "ИПП янв–авг 2026", "positive": true, "note": "выше РФ на 6,6 п.п."}
  ],
  "left": {"title": "РОСТ", "items": ["Обрабатывающие 110,3%", "Энергетика 100,1%"]},
  "right": {"title": "СНИЖЕНИЕ", "items": ["Добыча 94,0%", "Водоснабжение 94,3%"]},
  "columns": [
    {"title": "1 МЕСТО", "items": ["Кальцинированная сода", "Листовое стекло"]},
    {"title": "2 МЕСТО", "items": ["Синтетические каучуки"]},
    {"title": "3 МЕСТО", "items": ["Дизельное топливо"]}
  ],
  "cards": [
    {"title": "Башнефть", "value": "69,5+ млрд", "items": ["6 проектов", "УЗК, ароматика"]}
  ],
  "items": ["Тезис один", "Тезис два"],
  "timeline": [{"date": "МАЙ 2025", "points": ["ПС Инорс 50 МВА"]}],
  "footer": "дополнительная строка внизу"
}

Правила выбора type:
- title — только первый слайд
- metrics — когда главные крупные цифры (можно + left/right)
- split — два блока рядом (left + right)
- columns — 2–3 равные колонки (лидерство, сравнение)
- cards — 2–6 карточек предприятий/проектов
- list — простой список тезисов
- timeline — хроника вводов/событий
- summary — итоги + приоритеты

Первый слайд всегда type: "title".`;

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

  for (const s of slides) {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: "100%",
      fill: { color: BG },
    });

    // Title
    if (s.title) {
      slide.addText(String(s.title).toUpperCase(), {
        x: 0.4, y: 0.25, w: 12.5, h: 0.55,
        fontSize: 20, fontFace: "Arial", color: WHITE, bold: true, align: "center",
      });
    }

    // ===== TITLE SLIDE =====
    if (s.type === "title") {
      slide.addText(s.subtitle || "Министерство промышленности, энергетики и инноваций РБ", {
        x: 1, y: 2.8, w: 11.3, h: 0.5,
        fontSize: 18, fontFace: "Arial", color: ACCENT, align: "center",
      });
      if (s.metrics?.[0]) {
        slide.addText(String(s.metrics[0].value), {
          x: 1, y: 3.6, w: 11.3, h: 0.9,
          fontSize: 48, fontFace: "Arial", color: GREEN, align: "center", bold: true,
        });
        if (s.metrics[0].label) {
          slide.addText(s.metrics[0].label, {
            x: 1, y: 4.5, w: 11.3, h: 0.4,
            fontSize: 16, fontFace: "Arial", color: WHITE, align: "center",
          });
        }
      }
      continue;
    }

    // ===== METRICS (top row of big numbers) =====
    let contentStartY = 1.05;
    if (s.metrics?.length) {
      const count = Math.min(s.metrics.length, 4);
      const cardW = count === 1 ? 5.5 : count === 2 ? 5.2 : count === 3 ? 3.6 : 2.9;
      const gap = 0.25;
      const totalW = count * cardW + (count - 1) * gap;
      const startX = (13.333 - totalW) / 2;

      s.metrics.slice(0, 4).forEach((m: any, i: number) => {
        const x = startX + i * (cardW + gap);
        const color = m.positive === false ? RED : m.accent ? ACCENT : GREEN;

        slide.addShape(pptx.ShapeType.roundRect, {
          x, y: 1.05, w: cardW, h: m.note ? 2.05 : 1.7,
          fill: { type: "none" },
          line: { color: WHITE, width: 1.5 },
          rectRadius: 0.12,
        });

        slide.addText(String(m.value), {
          x, y: 1.15, w: cardW, h: 0.85,
          fontSize: count >= 4 ? 28 : 36, fontFace: "Arial", color, bold: true, align: "center",
        });

        slide.addText(m.label || "", {
          x: x + 0.1, y: 2.0, w: cardW - 0.2, h: 0.4,
          fontSize: 12, fontFace: "Arial", color: WHITE, align: "center",
        });

        if (m.note) {
          slide.addText(m.note, {
            x: x + 0.1, y: 2.4, w: cardW - 0.2, h: 0.45,
            fontSize: 11, fontFace: "Arial", color: ACCENT, align: "center",
          });
        }
      });
      contentStartY = s.metrics[0]?.note ? 3.3 : 3.0;
    }

    // ===== LEFT / RIGHT SPLIT =====
    if (s.left || s.right) {
      const y = contentStartY;
      const h = 3.6;

      if (s.left) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5, y, w: 5.9, h,
          fill: { type: "none" },
          line: { color: WHITE, width: 1.5 },
          rectRadius: 0.12,
        });
        slide.addText(s.left.title || "", {
          x: 0.7, y: y + 0.2, w: 5.5, h: 0.4,
          fontSize: 16, fontFace: "Arial", color: GREEN, bold: true,
        });
        if (s.left.items?.length) {
          slide.addText(s.left.items.map((t: string) => "▸  " + t).join("\n\n"), {
            x: 0.7, y: y + 0.75, w: 5.5, h: h - 1,
            fontSize: 15, fontFace: "Arial", color: WHITE, valign: "top",
          });
        }
      }

      if (s.right) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 6.9, y, w: 5.9, h,
          fill: { type: "none" },
          line: { color: WHITE, width: 1.5 },
          rectRadius: 0.12,
        });
        slide.addText(s.right.title || "", {
          x: 7.1, y: y + 0.2, w: 5.5, h: 0.4,
          fontSize: 16, fontFace: "Arial", color: RED, bold: true,
        });
        if (s.right.items?.length) {
          slide.addText(s.right.items.map((t: string) => "▸  " + t).join("\n\n"), {
            x: 7.1, y: y + 0.75, w: 5.5, h: h - 1,
            fontSize: 15, fontFace: "Arial", color: WHITE, valign: "top",
          });
        }
      }
      continue;
    }

    // ===== COLUMNS (1/2/3 place, equal columns) =====
    if (s.columns?.length) {
      const count = Math.min(s.columns.length, 3);
      const cardW = count === 2 ? 5.8 : 3.9;
      const gap = 0.3;
      const totalW = count * cardW + (count - 1) * gap;
      const startX = (13.333 - totalW) / 2;
      const y = contentStartY;

      s.columns.slice(0, 3).forEach((col: any, i: number) => {
        const x = startX + i * (cardW + gap);
        slide.addShape(pptx.ShapeType.roundRect, {
          x, y, w: cardW, h: 5.5,
          fill: { type: "none" },
          line: { color: WHITE, width: 1.5 },
          rectRadius: 0.12,
        });
        slide.addText(col.title || "", {
          x: x + 0.15, y: y + 0.2, w: cardW - 0.3, h: 0.45,
          fontSize: 16, fontFace: "Arial", color: TEAL, bold: true, align: "center",
        });
        if (col.items?.length) {
          slide.addText(col.items.map((t: string) => "▸  " + t).join("\n"), {
            x: x + 0.2, y: y + 0.8, w: cardW - 0.4, h: 4.4,
            fontSize: 13, fontFace: "Arial", color: WHITE, valign: "top",
          });
        }
      });
      continue;
    }

    // ===== CARDS (companies / projects) =====
    if (s.cards?.length) {
      const count = Math.min(s.cards.length, 6);
      const cols = count <= 3 ? count : 3;
      const rows = count <= 3 ? 1 : 2;
      const cardW = cols === 1 ? 8 : cols === 2 ? 5.8 : 3.9;
      const cardH = rows === 1 ? 4.8 : 2.5;
      const gapX = 0.3;
      const gapY = 0.25;
      const totalW = cols * cardW + (cols - 1) * gapX;
      const startX = (13.333 - totalW) / 2;
      const startY = contentStartY;

      s.cards.slice(0, 6).forEach((card: any, i: number) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);

        slide.addShape(pptx.ShapeType.roundRect, {
          x, y, w: cardW, h: cardH,
          fill: { type: "none" },
          line: { color: WHITE, width: 1.5 },
          rectRadius: 0.1,
        });

        slide.addText(card.title || "", {
          x: x + 0.15, y: y + 0.15, w: cardW - 0.3, h: 0.35,
          fontSize: 14, fontFace: "Arial", color: TEAL, bold: true,
        });

        if (card.value) {
          slide.addText(String(card.value), {
            x: x + 0.15, y: y + 0.5, w: cardW - 0.3, h: 0.5,
            fontSize: 22, fontFace: "Arial", color: GREEN, bold: true,
          });
        }

        if (card.items?.length) {
          const itemsY = card.value ? y + 1.1 : y + 0.6;
          slide.addText(card.items.map((t: string) => "▸  " + t).join("\n"), {
            x: x + 0.15, y: itemsY, w: cardW - 0.3, h: cardH - (itemsY - y) - 0.15,
            fontSize: 12, fontFace: "Arial", color: WHITE, valign: "top",
          });
        }
      });
      continue;
    }

    // ===== TIMELINE =====
    if (s.timeline?.length) {
      let y = contentStartY;
      for (const t of s.timeline.slice(0, 4)) {
        slide.addText(t.date || "", {
          x: 0.6, y, w: 12, h: 0.35,
          fontSize: 16, fontFace: "Arial", color: TEAL, bold: true,
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.6, y: y + 0.4, w: 12, h: 0.015,
          fill: { color: TEAL },
        });
        slide.addText((t.points || []).map((p: string) => "▸  " + p).join("   "), {
          x: 0.6, y: y + 0.5, w: 12, h: 0.7,
          fontSize: 14, fontFace: "Arial", color: WHITE,
        });
        y += 1.35;
      }
      continue;
    }

    // ===== LIST / SUMMARY / fallback =====
    if (s.items?.length) {
      const y = contentStartY;
      slide.addText(s.items.map((t: string) => "▸  " + t).join("\n\n"), {
        x: 0.8, y, w: 11.7, h: 5.5,
        fontSize: 16, fontFace: "Arial", color: WHITE, valign: "top",
      });
    }

    if (s.footer) {
      slide.addText(s.footer, {
        x: 0.5, y: 6.9, w: 12.3, h: 0.35,
        fontSize: 12, fontFace: "Arial", color: ACCENT, align: "center",
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
          content: `Обработай справку. Верни ТОЛЬКО JSON-массив слайдов (максимум 11). Цифры выноси крупно. Не делай неестественные формулировки.\n\n${text.slice(0, 120000)}`,
        },
      ],
      temperature: 0.25,
      max_tokens: 10000,
    });

    let content = completion.choices[0]?.message?.content || "[]";
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    // Try to extract JSON array if model wrapped it
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) content = jsonMatch[0];

    let slides: any[];
    try {
      slides = JSON.parse(content);
      if (!Array.isArray(slides)) throw new Error("Not an array");
    } catch {
      console.error("Failed to parse LLM response:", content.slice(0, 800));
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
