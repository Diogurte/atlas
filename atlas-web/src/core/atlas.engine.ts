import type { RepairListItem } from "../services/repairs.service";

export type AtlasPriority = "high" | "medium" | "normal";

export type AtlasWorkQueue = {
  key: string;
  title: string;
  icon: string;
  description: string;
  statuses: string[];
  priority: AtlasPriority;
};

export type OperationBucket = AtlasWorkQueue & {
  count: number;
};

export type RepairMission = {
  title: string;
  description: string;
  priority: AtlasPriority;
  badge: string;
};

export type AtlasOperationCenter = {
  repairs: RepairListItem[];
  buckets: OperationBucket[];
  activeRepairs: RepairListItem[];
  totalActions: number;
  primarySuggestion: string;
};

export const ATLAS_WORK_QUEUES: AtlasWorkQueue[] = [
  {
    key: "diagnose",
    title: "Diagnosticar",
    icon: "🔍",
    description: "Máquinas recebidas e ainda sem diagnóstico.",
    statuses: ["Recebida", "A aguardar diagnóstico"],
    priority: "high",
  },
  {
    key: "workshop",
    title: "Oficina",
    icon: "🛠️",
    description: "Máquinas em diagnóstico ou reparação em loja.",
    statuses: ["Em diagnóstico", "A reparar"],
    priority: "medium",
  },
  {
    key: "parts",
    title: "Aguardar peças",
    icon: "📦",
    description: "Reparações paradas até chegarem peças.",
    statuses: ["A aguardar peças"],
    priority: "high",
  },
  {
    key: "supplier",
    title: "Fornecedor",
    icon: "🚚",
    description: "Máquinas no fornecedor ou acabadas de regressar.",
    statuses: ["No fornecedor", "Recebida fornecedor"],
    priority: "medium",
  },
  {
    key: "notify",
    title: "Avisar clientes",
    icon: "📞",
    description: "Reparações concluídas que precisam de contacto.",
    statuses: ["Reparação concluída"],
    priority: "high",
  },
  {
    key: "pickup",
    title: "Levantamentos",
    icon: "🏁",
    description: "Máquinas prontas para o cliente levantar.",
    statuses: ["Cliente avisado", "A aguardar levantamento"],
    priority: "normal",
  },
  {
    key: "no-repair",
    title: "Sem reparação",
    icon: "❌",
    description: "Casos que precisam de devolução, retoma ou nova decisão.",
    statuses: ["Sem reparação"],
    priority: "medium",
  },
];

export function getActiveRepairs(repairs: RepairListItem[]) {
  return repairs.filter((repair) => repair.status !== "Entregue");
}

export function getOperationBuckets(repairs: RepairListItem[]): OperationBucket[] {
  return ATLAS_WORK_QUEUES.map((queue) => ({
    ...queue,
    count: repairs.filter((repair) => queue.statuses.includes(repair.status)).length,
  }));
}

export function getPrimarySuggestion(buckets: OperationBucket[]) {
  const diagnose = buckets.find((bucket) => bucket.key === "diagnose");
  const notify = buckets.find((bucket) => bucket.key === "notify");
  const parts = buckets.find((bucket) => bucket.key === "parts");
  const supplier = buckets.find((bucket) => bucket.key === "supplier");
  const pickup = buckets.find((bucket) => bucket.key === "pickup");

  if ((diagnose?.count ?? 0) > 0) {
    return `Começa pelos diagnósticos. Tens ${diagnose?.count} máquina(s) à espera de avaliação.`;
  }

  if ((notify?.count ?? 0) > 0) {
    return `Há ${notify?.count} cliente(s) para avisar. É uma boa prioridade para desbloquear entregas.`;
  }

  if ((parts?.count ?? 0) > 0) {
    return `Existem ${parts?.count} reparação(ões) à espera de peças. Confirma se há novidades.`;
  }

  if ((supplier?.count ?? 0) > 0) {
    return `Há ${supplier?.count} máquina(s) ligadas a fornecedor. Verifica se alguma precisa de seguimento.`;
  }

  if ((pickup?.count ?? 0) > 0) {
    return `Tens ${pickup?.count} máquina(s) prontas para levantamento. Mantém esta caixa limpa.`;
  }

  return "O trabalho está controlado. O Atlas vai destacar aqui o que precisar da tua atenção.";
}

export function buildOperationCenter(repairs: RepairListItem[]): AtlasOperationCenter {
  const buckets = getOperationBuckets(repairs);
  const activeRepairs = getActiveRepairs(repairs);

  return {
    repairs,
    buckets,
    activeRepairs,
    totalActions: buckets.reduce((total, bucket) => total + bucket.count, 0),
    primarySuggestion: getPrimarySuggestion(buckets),
  };
}

export function getRepairMission(status: string): RepairMission {
  switch (status) {
    case "Recebida":
    case "A aguardar diagnóstico":
      return {
        title: "Diagnóstico pendente",
        description: "Esta máquina deve ser avaliada antes de escolher o caminho.",
        priority: "high",
        badge: "Diagnosticar",
      };

    case "Em diagnóstico":
      return {
        title: "Escolher estratégia",
        description: "Depois do diagnóstico, decide se segue loja, fornecedor ou sem reparação.",
        priority: "high",
        badge: "Decidir",
      };

    case "A reparar":
      return {
        title: "Reparação em curso",
        description: "A máquina está em trabalho de oficina.",
        priority: "medium",
        badge: "Oficina",
      };

    case "A aguardar peças":
      return {
        title: "Aguardar peças",
        description: "Está parada até chegarem peças ou haver nova decisão.",
        priority: "high",
        badge: "Peças",
      };

    case "No fornecedor":
      return {
        title: "No fornecedor",
        description: "Acompanha o tempo e confirma novidades com o fornecedor.",
        priority: "medium",
        badge: "Fornecedor",
      };

    case "Recebida fornecedor":
      return {
        title: "Confirmar resultado",
        description: "Indica se regressou reparada ou sem reparação.",
        priority: "high",
        badge: "Confirmar",
      };

    case "Reparação concluída":
      return {
        title: "Avisar cliente",
        description: "A reparação terminou. Falta contactar o cliente.",
        priority: "high",
        badge: "Avisar",
      };

    case "Cliente avisado":
    case "A aguardar levantamento":
      return {
        title: "Aguardar levantamento",
        description: "O cliente já foi avisado. Falta entregar a máquina.",
        priority: "normal",
        badge: "Levantar",
      };

    case "Sem reparação":
      return {
        title: "Decidir saída",
        description: "Pode seguir para devolução, retoma ou nova reavaliação.",
        priority: "medium",
        badge: "Sem reparação",
      };

    case "Entregue":
      return {
        title: "Concluída",
        description: "Esta reparação já terminou e foi entregue ao cliente.",
        priority: "normal",
        badge: "Concluída",
      };

    default:
      return {
        title: "Acompanhar reparação",
        description: "O Atlas vai indicar aqui a missão atual.",
        priority: "normal",
        badge: "Atlas",
      };
  }
}

export function getPriorityClasses(priority: AtlasPriority) {
  const classes = {
    high: "border-cyan-400/30 bg-cyan-400/5",
    medium: "border-slate-700 bg-slate-900",
    normal: "border-slate-800 bg-slate-900",
  };

  return classes[priority];
}
