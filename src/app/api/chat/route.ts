import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildFinanceSystemPrompt,
  buildFinanceUserPrompt,
  buildLocalFinanceFallback,
} from "@/lib/ai/chat";
import type { Category, TransactionWithDetails } from "@/modules/transactions/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string };
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Falta el mensaje." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const [{ data: transactions }, { data: categories }] = await Promise.all([
      supabase
        .from("transactions")
        .select("*, category:categories(*), account:accounts(*)")
        .order("date", { ascending: false })
        .limit(200),
      supabase
        .from("categories")
        .select("*")
        .order("is_system", { ascending: false })
        .order("name", { ascending: true }),
    ]);

    const context = {
      transactions: (transactions ?? []) as TransactionWithDetails[],
      categories: (categories ?? []) as Category[],
    };

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        message: buildLocalFinanceFallback(message, context),
        mode: "fallback",
      });
    }

    const result = await generateText({
      model: anthropic("claude-sonnet-4-5"),
      system: buildFinanceSystemPrompt(context),
      prompt: buildFinanceUserPrompt(message),
      temperature: 0.2,
    });

    return NextResponse.json({
      message: result.text,
      mode: "llm",
    });
  } catch (error) {
    console.error("/api/chat failed", error);
    return NextResponse.json(
      { error: "No pude procesar tu consulta financiera." },
      { status: 500 }
    );
  }
}
