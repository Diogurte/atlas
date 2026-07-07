export type RepairEventStyle = {
  icon: string;
  title: string;
  tone: "cyan" | "emerald" | "amber" | "blue" | "rose" | "slate" | "violet";
};

const eventStyles: Record<string, RepairEventStyle> = {
  created: {
    icon: "📥",
    title: "Reparação recebida",
    tone: "cyan",
  },
  diagnosis: {
    icon: "🔍",
    title: "Diagnóstico",
    tone: "blue",
  },
  in_store_repair: {
    icon: "🔧",
    title: "Reparação em loja",
    tone: "emerald",
  },
  waiting_parts: {
    icon: "📦",
    title: "A aguardar peças",
    tone: "amber",
  },
  parts_received: {
    icon: "📦",
    title: "Peças recebidas",
    tone: "emerald",
  },
  supplier: {
    icon: "🚚",
    title: "Fornecedor",
    tone: "violet",
  },
  supplier_received: {
    icon: "📥",
    title: "Recebida do fornecedor",
    tone: "violet",
  },
  supplier_repaired: {
    icon: "🔧",
    title: "Reparada pelo fornecedor",
    tone: "emerald",
  },
  customer_notified: {
    icon: "📞",
    title: "Cliente avisado",
    tone: "blue",
  },
  waiting_pickup: {
    icon: "🏁",
    title: "A aguardar levantamento",
    tone: "amber",
  },
  delivered: {
    icon: "✅",
    title: "Máquina entregue",
    tone: "emerald",
  },
  reassessment: {
    icon: "🔀",
    title: "Reavaliação",
    tone: "violet",
  },
  no_repair: {
    icon: "❌",
    title: "Sem reparação",
    tone: "rose",
  },
  generic: {
    icon: "📌",
    title: "Registo da reparação",
    tone: "slate",
  },
};

export function mapRepairEvent(event: string): RepairEventStyle {
  const lower = event.toLowerCase();

  if (lower.includes("reavaliada")) return eventStyles.reassessment;
  if (lower.includes("criada") || lower.includes("máquina recebida")) return eventStyles.created;
  if (lower.includes("peças foram recebidas")) return eventStyles.parts_received;
  if (lower.includes("peças")) return eventStyles.waiting_parts;
  if (lower.includes("diagnóstico")) return eventStyles.diagnosis;
  if (lower.includes("sem reparação")) return eventStyles.no_repair;
  if (lower.includes("regressou do fornecedor reparada")) return eventStyles.supplier_repaired;
  if (lower.includes("recebida do fornecedor") || lower.includes("recebido do fornecedor")) return eventStyles.supplier_received;
  if (lower.includes("fornecedor")) return eventStyles.supplier;
  if (lower.includes("loja")) return eventStyles.in_store_repair;
  if (lower.includes("cliente foi avisado")) return eventStyles.customer_notified;
  if (lower.includes("aguardar levantamento")) return eventStyles.waiting_pickup;
  if (lower.includes("entregue")) return eventStyles.delivered;

  return eventStyles.generic;
}

export function getToneClasses(tone: RepairEventStyle["tone"], active: boolean) {
  const tones = {
    cyan: active
      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
      : "border-cyan-400/20 bg-cyan-400/5 text-cyan-300",
    emerald: active
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
      : "border-emerald-400/20 bg-emerald-400/5 text-emerald-300",
    amber: active
      ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
      : "border-amber-400/20 bg-amber-400/5 text-amber-300",
    blue: active
      ? "border-blue-400/40 bg-blue-400/10 text-blue-300"
      : "border-blue-400/20 bg-blue-400/5 text-blue-300",
    rose: active
      ? "border-rose-400/40 bg-rose-400/10 text-rose-300"
      : "border-rose-400/20 bg-rose-400/5 text-rose-300",
    violet: active
      ? "border-violet-400/40 bg-violet-400/10 text-violet-300"
      : "border-violet-400/20 bg-violet-400/5 text-violet-300",
    slate: active
      ? "border-slate-500/60 bg-slate-800 text-slate-200"
      : "border-slate-800 bg-slate-900 text-slate-300",
  };

  return tones[tone];
}
