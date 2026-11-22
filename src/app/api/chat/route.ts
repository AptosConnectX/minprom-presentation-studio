import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;
export const runtime = "nodejs";

const CHAT_SYSTEM = `Ты — помощник Министерства промышленности, энергетики и инноваций Республики Башкортостан.
Отвечай по-русски, кратко и по делу. Помогаешь с отчётностью, субсидиями, индустриальными парками, презентациями и промышленной политикой РБ.
Если пользователь просит сделать презентацию из документа — попроси загрузить .docx через кнопку «+» и нажать отправку.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages as { role: string; content: string }[];
    const extraPrompts = (body.extraPrompts as string[]) || [];

    if (!messages?.length) {
      return NextResponse.json({ error: "Нет сообщений" }, { status: 400 });
    }

    // Читаем ключи Cloudflare из переменных окружения
    const apiKey = process.env.CLOUDFLARE_API_KEY;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!apiKey || !accountId) {
      return NextResponse.json(
        { error: "API-ключ или Account ID Cloudflare не настроены" }, 
        { status: 500 }
      );
    }

    // Настраиваем клиент OpenAI на работу с Cloudflare
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
    });

    let system = CHAT_SYSTEM;
    if (extraPrompts.length) {
      system +=
        "\n\nДополнительные инструкции пользователя (применяй при ответах):\n" +
        extraPrompts.map((p, i) => `${i + 1}. ${p}`).join("\n");
    }

    const completion = await openai.chat.completions.create({
      // Используем быструю и бесплатную модель от Meta
      model: "@cf/meta/llama-3.1-8b-instruct-fp8",
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const reply = completion.choices[0]?.message?.content || "Не удалось получить ответ.";
    
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: err.message || "Ошибка чата" },
      { status: 500 }
    );
  }
}