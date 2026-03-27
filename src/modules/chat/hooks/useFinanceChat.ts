"use client";

import { useState } from "react";

export interface FinanceChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const initialMessages: FinanceChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hola! Soy tu asistente financiero. Preguntame lo que quieras sobre tus gastos, ingresos y categorías.",
  },
];

export function useFinanceChat() {
  const [messages, setMessages] = useState<FinanceChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (override?: string) => {
    const nextMessage = (override ?? input).trim();
    if (!nextMessage || loading) return;

    const userMessage: FinanceChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: nextMessage,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: nextMessage }),
      });

      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok || !payload.message) {
        throw new Error(payload.error ?? "No pude generar la respuesta.");
      }

      const assistantMessage = payload.message;

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantMessage,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude responder en este momento.");
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    input,
    setInput,
    sendMessage,
    loading,
    error,
  };
}
