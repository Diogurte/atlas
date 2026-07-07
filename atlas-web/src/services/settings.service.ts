import { supabase } from "../lib/supabase";

export type AtlasSettings = {
  company: {
    name: string;
    nif: string;
    phone: string;
    email: string;
    website: string;
    address: string;
    pdfSignatureUrl: string;
  };
  priceEngine: {
    shopMargin: number;
    resellerMargin: number;
    onlineMargin: number;
    vat: number;
    decimals: number;
  };
  emails: {
    supplierOrderSubject: string;
    supplierOrderBody: string;
    signature: string;
  };
  repairs: {
    defaultWarranty: string;
    receiptText: string;
    deliveryText: string;
  };
  atlasAi: {
    name: string;
    language: string;
    tone: string;
  };
  system: {
    version: string;
    lastUpdated: string;
  };
};

export const DEFAULT_ATLAS_SETTINGS: AtlasSettings = {
  company: {
    name: "Maquibraga",
    nif: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    pdfSignatureUrl: "/maquibraga-signature.jpg",
  },
  priceEngine: {
    shopMargin: 40,
    resellerMargin: 20,
    onlineMargin: 15,
    vat: 23,
    decimals: 2,
  },
  emails: {
    supplierOrderSubject: "Pedido de Material - Maquibraga",
    supplierOrderBody: "Bom dia,\n\nSegue o nosso pedido de material.\n\nObrigado.",
    signature: "Maquibraga",
  },
  repairs: {
    defaultWarranty: "Não confirmado",
    receiptText: "Documento emitido pelo Atlas para consulta, impressão ou arquivo.",
    deliveryText: "Obrigado pela preferência.",
  },
  atlasAi: {
    name: "Atlas AI",
    language: "Português",
    tone: "Profissional, direto e útil",
  },
  system: {
    version: "0.9.5",
    lastUpdated: new Date().toISOString(),
  },
};

type SettingRow = {
  key: string;
  value: unknown;
};

export const SETTINGS_TABLE_SQL = `create table if not exists settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table settings enable row level security;

drop policy if exists "Allow everything settings" on settings;

create policy "Allow everything settings"
on settings
for all
using (true)
with check (true);`;

function cloneDefaultSettings(): AtlasSettings {
  return JSON.parse(JSON.stringify(DEFAULT_ATLAS_SETTINGS));
}

function normalizeSettingValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value;

  if (value === null || value === undefined) return "";

  // Supabase jsonb normalmente já chega como primitivo, mas esta proteção evita
  // que objetos estranhos rebentem a UI com [object Object].
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if ("value" in record) return normalizeSettingValue(record.value);
    if ("data" in record) return normalizeSettingValue(record.data);
  }

  return value;
}

export function mergeSettings(rows: SettingRow[] = []): AtlasSettings {
  const settings = cloneDefaultSettings();

  rows.forEach((row) => {
    if (!row.key) return;

    const [section, field] = row.key.split(".");

    if (!section || !field) return;

    const sectionObject = (settings as any)[section];

    if (!sectionObject || !(field in sectionObject)) return;

    sectionObject[field] = normalizeSettingValue(row.value);
  });

  return settings;
}

export async function getAtlasSettings(): Promise<AtlasSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .order("key", { ascending: true });

  if (error) throw error;

  if (!data || data.length === 0) {
    await seedDefaultSettings();
    return cloneDefaultSettings();
  }

  return mergeSettings(data);
}

export async function seedDefaultSettings(): Promise<void> {
  const rows = flattenSettings(cloneDefaultSettings());

  const { error } = await supabase.from("settings").upsert(rows, {
    onConflict: "key",
  });

  if (error) throw error;
}

export async function saveAtlasSettings(settings: AtlasSettings): Promise<void> {
  const rows = flattenSettings(settings);

  const { error } = await supabase.from("settings").upsert(rows, {
    onConflict: "key",
  });

  if (error) throw error;
}

export function flattenSettings(settings: AtlasSettings) {
  return Object.entries(settings).flatMap(([section, values]) =>
    Object.entries(values as Record<string, unknown>).map(([field, value]) => ({
      key: `${section}.${field}`,
      value,
      updated_at: new Date().toISOString(),
    }))
  );
}

export function getSettingsErrorMessage(error: unknown) {
  if (!error) return "Não foi possível carregar as definições.";

  if (error instanceof Error) return error.message;

  if (typeof error === "string") return error;

  if (typeof error === "object") {
    const supabaseError = error as {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
    };

    const message = supabaseError.message ?? "";
    const details = supabaseError.details ?? "";
    const hint = supabaseError.hint ?? "";
    const code = supabaseError.code ?? "";

    if (
      code === "42P01" ||
      message.toLowerCase().includes("settings") ||
      message.toLowerCase().includes("schema cache")
    ) {
      return "Falta criar ou atualizar a tabela settings no Supabase. Executa o SQL das Definições e depois faz Ctrl + F5.";
    }

    return [message, details, hint].filter(Boolean).join("\n") || JSON.stringify(error, null, 2);
  }

  return String(error);
}
