"use server";

import { categorizeTransactions } from "@/lib/ai/categorization";
import { createClient } from "@/lib/supabase/server";
import type { ImportedTransactionInput } from "./import-ingestion";

interface ImportTransactionsInput {
  filename: string;
  transactions: ImportedTransactionInput[];
}

interface ImportTransactionsResult {
  ok: boolean;
  imported: number;
  duplicates: number;
  categorized: number;
  batchId?: string;
  error?: string;
}

function normalizeDescription(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function importTransactionsAction(
  input: ImportTransactionsInput
): Promise<ImportTransactionsResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      imported: 0,
      duplicates: 0,
      categorized: 0,
      error: "Necesitás iniciar sesión para importar transacciones.",
    };
  }

  const preparedTransactions = input.transactions.filter(
    (transaction) => transaction.date && transaction.description.trim()
  );

  if (!preparedTransactions.length) {
    return {
      ok: false,
      imported: 0,
      duplicates: 0,
      categorized: 0,
      error: "No encontré filas válidas para importar.",
    };
  }

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      user_id: user.id,
      filename: input.filename,
      row_count: preparedTransactions.length,
      categorized_count: 0,
      status: "processing",
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return {
      ok: false,
      imported: 0,
      duplicates: 0,
      categorized: 0,
      error: "No pude crear el lote de importación.",
    };
  }

  const dates = [...new Set(preparedTransactions.map((transaction) => transaction.date))];

  const { data: existingTransactions, error: existingError } = await supabase
    .from("transactions")
    .select("date, amount, description")
    .eq("user_id", user.id)
    .in("date", dates);

  if (existingError) {
    return {
      ok: false,
      imported: 0,
      duplicates: 0,
      categorized: 0,
      error: "No pude validar duplicados antes de importar.",
    };
  }

  const existingKeys = new Set(
    (existingTransactions ?? []).map((transaction) =>
      [
        transaction.date,
        Number(transaction.amount).toFixed(2),
        normalizeDescription(transaction.description ?? ""),
      ].join("::")
    )
  );

  const uniqueTransactions = preparedTransactions.filter((transaction) => {
    const key = [
      transaction.date,
      transaction.amount.toFixed(2),
      normalizeDescription(transaction.description),
    ].join("::");

    if (existingKeys.has(key)) {
      return false;
    }

    existingKeys.add(key);
    return true;
  });

  if (!uniqueTransactions.length) {
    await supabase
      .from("import_batches")
      .update({ status: "completed" })
      .eq("id", batch.id)
      .eq("user_id", user.id);

    return {
      ok: true,
      imported: 0,
      duplicates: preparedTransactions.length,
      categorized: 0,
      batchId: batch.id,
    };
  }

  const [{ data: categories }, { data: aliases }] = await Promise.all([
    supabase.from("categories").select("id, name, parent_id"),
    supabase
      .from("merchant_aliases")
      .select("raw_pattern, merchant_name, category_id")
      .eq("user_id", user.id),
  ]);

  const categorizations = await categorizeTransactions(
    uniqueTransactions.map((transaction) => ({
      description: transaction.description,
      amount: transaction.amount,
    })),
    categories ?? [],
    aliases ?? []
  );

  const categorizedCount = categorizations.filter((item) => item.categoryId).length;

  const { error: insertError } = await supabase.from("transactions").insert(
    uniqueTransactions.map((transaction, index) => ({
      user_id: user.id,
      amount: transaction.amount,
      description: transaction.description,
      merchant_name: categorizations[index]?.merchantName ?? null,
      category_id: categorizations[index]?.categoryId ?? null,
      date: transaction.date,
      import_batch_id: batch.id,
      metadata: transaction.metadata,
      ai_confidence: categorizations[index]?.confidence ?? null,
      user_verified: false,
      is_recurring: false,
    }))
  );

  if (insertError) {
    await supabase
      .from("import_batches")
      .update({ status: "failed" })
      .eq("id", batch.id)
      .eq("user_id", user.id);

    return {
      ok: false,
      imported: 0,
      duplicates: 0,
      categorized: 0,
      error: "Falló la inserción de transacciones en la base.",
    };
  }

  await supabase
    .from("import_batches")
    .update({
      status: "completed",
      categorized_count: categorizedCount,
    })
    .eq("id", batch.id)
    .eq("user_id", user.id);

  return {
    ok: true,
    imported: uniqueTransactions.length,
    duplicates: preparedTransactions.length - uniqueTransactions.length,
    categorized: categorizedCount,
    batchId: batch.id,
  };
}

export async function updateTransactionCategoryAction(input: {
  transactionId: string;
  categoryId: string | null;
  createAlias?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sesión inválida." };
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .update({ category_id: input.categoryId, user_verified: true })
    .eq("id", input.transactionId)
    .eq("user_id", user.id)
    .select("description")
    .single();

  if (transactionError) {
    return { ok: false, error: "No pude actualizar la categoría." };
  }

  if (input.createAlias && transaction?.description) {
    await supabase.from("merchant_aliases").upsert(
      {
        user_id: user.id,
        raw_pattern: transaction.description,
        merchant_name: transaction.description,
        category_id: input.categoryId,
      },
      { onConflict: "user_id,raw_pattern" }
    );
  }

  return { ok: true };
}
