import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { officeOpenTools } from "office-open/ai";
import { generatePresentationSync } from "office-open/pptx";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import {
  PPTX_PRELOADED_SCHEMAS,
  PRELOADED_SCHEMA_NAMES,
} from "@/lib/pptx-preloaded-schemas";

export const maxDuration = 600;
export const runtime = "nodejs";

const MODEL = "@cf/openai/gpt-oss-120b";

function isSuccessfulPptxResult(raw: unknown): boolean {
  if (raw == null) return false;
  if (Buffer.isBuffer(raw) && raw.length > 1000) return true;
  if (raw instanceof Uint8Array && raw.length > 1000) return true;
  if (typeof raw !== "object") return false;

  const r = raw as Record<string, unknown>;
  if (r.isError === true) return false;

  if (typeof r.base64 === "string" && r.base64.length > 100) return true;

  const file = r.file;
  if (file && typeof file === "object") {
    const b64 = (file as Record<string, unknown>).base64;
    if (typeof b64 === "string" && b64.length > 100) return true;
  }

  const output = r.output;
  if (output && typeof output === "object") {
    const b64 = (output as Record<string, unknown>).base64;
    if (typeof b64 === "string" && b64.length > 100) return true;
  }

  if (Buffer.isBuffer(r.buffer) && (r.buffer as Buffer).length > 1000) {
    return true;
  }

  const data = r.data;
  if (Buffer.isBuffer(data) && data.length > 1000) return true;
  if (typeof data === "string" && data.length > 100) return true;

  return false;
}

function extractPptxRaw(toolResults: any[]): unknown {
  const hit = toolResults.find((r: any) => r.toolName === "generate-pptx");
  return hit?.output ?? hit?.result ?? null;
}

function stopWhenPptxSucceeded({
  steps,
}: {
  steps: Array<{ toolResults?: any[] }>;
}) {
  const all = steps.flatMap((s) => s.toolResults ?? []);
  return isSuccessfulPptxResult(extractPptxRaw(all));
}

function logSchemaLookupActivity(
  steps: Array<{ toolCalls?: any[]; toolResults?: any[] }>
) {
  const preloaded = new Set<string>(
    PRELOADED_SCHEMA_NAMES as unknown as string[]
  );

  for (const step of steps) {
    for (const call of step.toolCalls ?? []) {
      if (call.toolName !== "office-open-schema-lookup") continue;

      const input = call.input ?? call.args ?? {};
      const defs: string[] = Array.isArray(input.definitions)
        ? input.definitions
        : typeof input.type === "string"
          ? [input.type]
          : [];

      console.log(
        "[schemas] lookup запрос:",
        defs.length ? defs.join(", ") : JSON.stringify(input)
      );

      for (const name of defs) {
        if (!preloaded.has(name)) {
          console.warn(
            `[schemas] НЕТ в контракте → при необходимости уточните: ${name}`
          );
        } else {
          console.log(
            `[schemas] уже в контракте (модель всё равно спросила): ${name}`
          );
        }
      }
    }

    for (const res of step.toolResults ?? []) {
      if (res.toolName !== "office-open-schema-lookup") continue;
      const out = res.output ?? res.result;
      const text = typeof out === "string" ? out : JSON.stringify(out ?? "");
      const isErr =
        /unknown|not found|no such|UnknownDefinition|не найден/i.test(text) ||
        (out && typeof out === "object" && (out as any).isError === true);

      if (isErr) {
        console.warn(
          "[schemas] lookup ОШИБКА / неизвестный тип:",
          text.slice(0, 500)
        );
      } else {
        console.log("[schemas] lookup OK, символов ответа:", text.length);
      }
    }
  }
}

function toPptxBuffer(rawResult: unknown): Buffer | null {
  if (rawResult == null) return null;
  if (Buffer.isBuffer(rawResult)) return rawResult;
  if (rawResult instanceof Uint8Array) return Buffer.from(rawResult);
  if (typeof rawResult !== "object") return null;

  const r = rawResult as Record<string, unknown>;

  if (typeof r.base64 === "string" && r.base64.length > 0) {
    return Buffer.from(r.base64, "base64");
  }

  const file = r.file;
  if (file && typeof file === "object") {
    const b64 = (file as Record<string, unknown>).base64;
    if (typeof b64 === "string") return Buffer.from(b64, "base64");
  }

  const output = r.output;
  if (output && typeof output === "object") {
    const b64 = (output as Record<string, unknown>).base64;
    if (typeof b64 === "string") return Buffer.from(b64, "base64");
  }

  if (Buffer.isBuffer(r.buffer)) return r.buffer as Buffer;
  if (r.buffer instanceof Uint8Array) return Buffer.from(r.buffer);

  if (Buffer.isBuffer(r.data)) return r.data as Buffer;
  if (r.data instanceof Uint8Array) return Buffer.from(r.data);
  if (typeof r.data === "string") return Buffer.from(r.data, "base64");

  return null;
}

function findGeneratePptxArgs(
  steps: Array<{ toolCalls?: any[] }>
): unknown {
  for (const step of steps) {
    for (const call of step.toolCalls ?? []) {
      if (call.toolName !== "generate-pptx") continue;
      return call.input ?? call.args ?? null;
    }
  }
  return null;
}

function tryParseSlidesJson(text: string): unknown {
  if (!text) return null;
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as any).slides)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }

  const start = trimmed.indexOf('{"slides"');
  if (start >= 0) {
    try {
      const parsed = JSON.parse(trimmed.slice(start));
      if (parsed && Array.isArray((parsed as any).slides)) return parsed;
    } catch {
      /* ignore */
    }
  }

  return null;
}

function buildPptxFromOptions(options: unknown): Buffer | null {
  if (!options || typeof options !== "object") return null;
  try {
    const out = generatePresentationSync(options as any);
    if (Buffer.isBuffer(out)) return out;
    if (out instanceof Uint8Array) return Buffer.from(out);
    if (out && typeof out === "object") {
      const o = out as Record<string, unknown>;
      if (Buffer.isBuffer(o.buffer)) return o.buffer as Buffer;
      if (typeof o.base64 === "string") {
        return Buffer.from(o.base64, "base64");
      }
    }
    return null;
  } catch (e) {
    console.error("[fallback] generatePresentationSync failed:", e);
    return null;
  }
}

function isValidPptxBuffer(buf: Buffer): boolean {
  return buf.length >= 1000 && buf[0] === 0x50 && buf[1] === 0x4b;
}

function isToolChoiceViolation(err: unknown): boolean {
  const e = err as any;
  const name = String(e?.name ?? "");
  const msg = String(e?.message ?? e ?? "");
  return (
    name === "AI_ToolChoiceViolationError" ||
    /ToolChoiceViolation/i.test(msg) ||
    /did not contain a call to the required tool/i.test(msg)
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Нет файла" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = (await mammoth.extractRawText({ buffer })).value;

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Текст слишком короткий" },
        { status: 400 }
      );
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiKey = process.env.CLOUDFLARE_API_KEY;
    if (!accountId || !apiKey) {
      return NextResponse.json(
        { error: "Нет ключей Cloudflare" },
        { status: 500 }
      );
    }

    const workersai = createWorkersAI({ accountId, apiKey });
    console.log(
      "Доступные инструменты office-open:",
      Object.keys(officeOpenTools)
    );

    const schemasLen = PPTX_PRELOADED_SCHEMAS?.length ?? 0;
    console.log(
      `[schemas] Контракт: ${schemasLen > 200 ? "OK" : "ПУСТО"} (${schemasLen} символов), типы: ${PRELOADED_SCHEMA_NAMES.join(", ")}`
    );

    // ——— ШАГ 1: Структура ———
    console.log(">>> ШАГ 1: Генерация текстовой структуры...");
    const step1 = await generateText({
      model: workersai(MODEL),
      prompt: `Сделай подробную и информативную структуру презентации в министерском стиле на основе документа ниже.
Не упускай важные детали и цифры. 
1 Слайд - 1 законченная мысль. Не более 10 слайдов.

Документ:
${text.slice(0, 120000)}`,
      maxOutputTokens: 16000,
      temperature: 0.2,
    });

    const structureText = step1.text;
    console.log("ШАГ 1 готов. Символов:", structureText.length);

    // =========================================================================
    // ДОБАВЛЕНО ТОЛЬКО ДЛЯ ОТЛАДКИ: Вывод структуры в консоль и файл
    // =========================================================================
    console.log("\n================ НАЧАЛО ТЕКСТОВОЙ СТРУКТУРЫ ================");
    console.log(structureText);
    console.log("================ КОНЕЦ ТЕКСТОВОЙ СТРУКТУРЫ ================\n");
    
    try {
      const debugPath = path.join(process.cwd(), "step1_structure.txt");
      fs.writeFileSync(debugPath, structureText, "utf8");
      console.log(`[debug] Структура сохранена в файл: ${debugPath}`);
    } catch (e) {
      console.warn("[debug] Не удалось сохранить структуру в файл", e);
    }
    // =========================================================================

    if (!structureText || structureText.length < 1000) {
      console.error(
        "Структура слишком короткая или пустая:",
        structureText
      );
      return NextResponse.json(
        {
          error:
            "Модель не смогла построить структуру. Попробуйте ещё раз.",
        },
        { status: 500 }
      );
    }

    // ——— ШАГ 2: Дизайн и сборка ———
    console.log(">>> ШАГ 2: Дизайн и сборка PPTX...");

    const systemStep2 = `Ты — ведущий дизайнер презентаций для Министерства промышленности Республики Башкортостан.

ГЛАВНАЯ ЦЕЛЬ: вызвать инструмент generate-pptx с валидным JSON.
Не пиши JSON презентации обычным текстом — только через generate-pptx.

Типы из контракта (lookup для них не нужен): ${PRELOADED_SCHEMA_NAMES.join(", ")}

===== КОНТРАКТ generate-pptx =====
${PPTX_PRELOADED_SCHEMAS}
===== КОНЕЦ КОНТРАКТА =====

Сразу вызови generate-pptx с полным массивом slides.`;

    const promptStep2 = `Создай презентацию по структуре ниже.

Структура:
${structureText}`;

    const generateOptsBase = {
      model: workersai(MODEL),
      system: systemStep2,
      prompt: promptStep2,
      tools: officeOpenTools,
      maxOutputTokens: 16384,
      temperature: 0.1 as const,
      stopWhen: [stopWhenPptxSucceeded, stepCountIs(4)],
    };

    let result: Awaited<ReturnType<typeof generateText>>;

    try {
      result = await generateText({
        ...generateOptsBase,
        // мягче, чем force одного tool — меньше ToolChoiceViolation на Workers AI
        toolChoice: "required",
      });
    } catch (e) {
      if (!isToolChoiceViolation(e)) throw e;
      console.warn(
        "[retry] toolChoice violation → повтор без toolChoice"
      );
      result = await generateText({
        ...generateOptsBase,
        // без toolChoice; сработает fallback из args/text
      });
    }

    logSchemaLookupActivity(result.steps);

    const allToolResults = result.steps.flatMap((s) => s.toolResults ?? []);
    const allToolCalls = result.steps.flatMap((s) => s.toolCalls ?? []);
    console.log(
      "Все вызовы инструментов:",
      allToolCalls.map((c) => c.toolName)
    );

    let pptxBuffer: Buffer | null = null;

    const rawResult = extractPptxRaw(allToolResults);
    if (rawResult) {
      if (
        typeof rawResult === "object" &&
        rawResult !== null &&
        (rawResult as any).isError === true
      ) {
        console.error("generate-pptx вернул ошибку:", rawResult);
      } else {
        console.log(
          "Форма результата generate-pptx (первые 300 символов):",
          JSON.stringify(rawResult)?.slice(0, 300)
        );
        pptxBuffer = toPptxBuffer(rawResult);
      }
    }

    if (!pptxBuffer) {
      const args = findGeneratePptxArgs(result.steps);
      console.warn(
        "[fallback] toolResults пуст или невалиден. Args generate-pptx:",
        args ? "есть" : "нет"
      );
      if (args) {
        pptxBuffer = buildPptxFromOptions(args);
        if (pptxBuffer) {
          console.log(
            "[fallback] PPTX из args tool call, байт:",
            pptxBuffer.length
          );
        }
      }
    }

    if (!pptxBuffer) {
      const fromText = tryParseSlidesJson(result.text ?? "");
      console.warn(
        "[fallback] parse result.text slides:",
        fromText ? "OK" : "fail"
      );
      if (fromText) {
        pptxBuffer = buildPptxFromOptions(fromText);
        if (pptxBuffer) {
          console.log(
            "[fallback] PPTX из result.text, байт:",
            pptxBuffer.length
          );
        }
      }
    }

    if (!pptxBuffer) {
      console.error(
        "Не удалось получить PPTX ни из tool, ни из fallback."
      );
      console.error(
        "result.text (первые 500):",
        (result.text ?? "").slice(0, 500)
      );
      console.error(
        "toolResults:",
        JSON.stringify(allToolResults, null, 2)
      );
      return NextResponse.json(
        {
          error:
            "Модель подготовила структуру, но файл PPTX не собрался. Попробуйте ещё раз.",
        },
        { status: 500 }
      );
    }

    if (!isValidPptxBuffer(pptxBuffer)) {
      console.error("Буфер не похож на PPTX. Размер:", pptxBuffer.length);
      return NextResponse.json(
        { error: "Получен повреждённый файл." },
        { status: 500 }
      );
    }

    if (pptxBuffer.length < 30_000) {
      console.warn(
        "PPTX подозрительно мал:",
        pptxBuffer.length,
        "байт. Возможно, слайды почти пустые."
      );
    }

    console.log(
      "Презентация успешно собрана. Размер:",
      pptxBuffer.length,
      "байт"
    );

    return new NextResponse(new Uint8Array(pptxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="presentation.pptx"`,
      },
    });
  } catch (err: any) {
    console.error("КРИТИЧЕСКАЯ ОШИБКА:", err);
    return NextResponse.json(
      { error: err.message || "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}