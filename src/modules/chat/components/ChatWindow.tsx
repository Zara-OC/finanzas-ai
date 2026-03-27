"use client";

import { useEffect, useRef } from "react";
import { Loader2, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFinanceChat } from "@/modules/chat/hooks/useFinanceChat";

const suggestedQuestions = [
  "¿Cuánto gasté este mes?",
  "¿Cuál fue mi gasto más grande?",
  "¿En qué categoría gasto más?",
];

export function ChatWindow() {
  const { messages, input, setInput, sendMessage, loading, error } = useFinanceChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card className="min-h-0 flex-1 overflow-hidden py-0">
        <CardContent className="flex h-[calc(100vh-11rem)] min-h-[28rem] flex-col p-0">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap md:max-w-[70%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Analizando tus finanzas...
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-4 md:p-6">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestedQuestions.map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(question)}
                  disabled={loading}
                >
                  {question}
                </Button>
              ))}
            </div>

            <form
              className="flex flex-col gap-3 md:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ej: ¿Cuánto gasté en delivery este mes?"
                className="min-h-24 flex-1 resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none ring-0 transition focus:border-primary"
              />
              <Button type="submit" disabled={loading || !input.trim()} className="md:self-end">
                <SendHorizonal className="size-4" />
                Enviar
              </Button>
            </form>

            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
