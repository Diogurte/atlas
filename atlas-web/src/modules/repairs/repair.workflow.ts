export type RepairStatus =
  | "A aguardar diagnóstico"
  | "Em diagnóstico"
  | "A reparar"
  | "A aguardar peças"
  | "No fornecedor"
  | "Recebida fornecedor"
  | "Reparação concluída"
  | "Cliente avisado"
  | "A aguardar levantamento"
  | "Entregue"
  | "Sem reparação";

export type WorkflowAction = {
  label: string;
  nextStatus: RepairStatus;
  event: string;
};

export function getNextActions(status: string): WorkflowAction[] {
  switch (status) {
    case "Recebida":
    case "A aguardar diagnóstico":
      return [
        {
          label: "▶ Iniciar diagnóstico",
          nextStatus: "Em diagnóstico",
          event: "Diagnóstico iniciado.",
        },
      ];

    case "Em diagnóstico":
      return [
        {
          label: "🔧 Reparar em loja",
          nextStatus: "A reparar",
          event: "Foi decidido reparar a máquina em loja.",
        },
        {
          label: "🚚 Enviar fornecedor",
          nextStatus: "No fornecedor",
          event: "A máquina foi enviada para fornecedor.",
        },
        {
          label: "❌ Sem reparação",
          nextStatus: "Sem reparação",
          event: "A reparação foi marcada como sem reparação.",
        },
      ];

    case "A reparar":
      return [
        {
          label: "📦 Aguardar peças",
          nextStatus: "A aguardar peças",
          event: "A reparação ficou a aguardar peças.",
        },
        {
          label: "✔ Reparação concluída",
          nextStatus: "Reparação concluída",
          event: "A reparação foi concluída.",
        },
        {
          label: "❌ Sem reparação",
          nextStatus: "Sem reparação",
          event: "A reparação foi marcada como sem reparação.",
        },
      ];

    case "A aguardar peças":
      return [
        {
          label: "✔ Peças recebidas",
          nextStatus: "A reparar",
          event: "As peças foram recebidas. A reparação voltou para oficina.",
        },
      ];

    case "No fornecedor":
      return [
        {
          label: "📥 Recebida do fornecedor",
          nextStatus: "Recebida fornecedor",
          event: "A máquina foi recebida do fornecedor.",
        },
      ];

    case "Recebida fornecedor":
      return [
        {
          label: "✔ Veio reparada",
          nextStatus: "Reparação concluída",
          event: "A máquina regressou do fornecedor reparada.",
        },
        {
          label: "❌ Veio sem reparação",
          nextStatus: "Sem reparação",
          event: "A máquina regressou do fornecedor sem reparação.",
        },
      ];

    case "Reparação concluída":
      return [
        {
          label: "📞 Cliente avisado",
          nextStatus: "Cliente avisado",
          event: "O cliente foi avisado.",
        },
      ];

    case "Cliente avisado":
      return [
        {
          label: "📥 Aguardar levantamento",
          nextStatus: "A aguardar levantamento",
          event: "A reparação ficou a aguardar levantamento pelo cliente.",
        },
      ];

    case "A aguardar levantamento":
      return [
        {
          label: "✅ Entregue ao cliente",
          nextStatus: "Entregue",
          event: "A máquina foi entregue ao cliente.",
        },
      ];

    default:
      return [];
  }
}

export function getWorkflowSuggestion(status: string) {
  switch (status) {
    case "Recebida":
    case "A aguardar diagnóstico":
      return "Esta máquina ainda aguarda diagnóstico.";

    case "Em diagnóstico":
      return "Depois do diagnóstico, escolhe se será reparada em loja, enviada ao fornecedor ou marcada sem reparação.";

    case "A reparar":
      return "A reparação está em curso. Podes concluir, colocar a aguardar peças ou marcar sem reparação.";

    case "A aguardar peças":
      return "Esta reparação está parada à espera de peças.";

    case "No fornecedor":
      return "Esta máquina está no fornecedor.";

    case "Recebida fornecedor":
      return "A máquina regressou do fornecedor. Indica se veio reparada ou sem reparação.";

    case "Reparação concluída":
      return "A reparação terminou. O próximo passo é avisar o cliente.";

    case "Cliente avisado":
      return "O cliente já foi avisado. Agora falta levantar a máquina.";

    case "A aguardar levantamento":
      return "A máquina está pronta e aguarda levantamento.";

    case "Entregue":
      return "Esta reparação foi concluída e entregue ao cliente.";

    case "Sem reparação":
      return "Esta reparação ficou sem reparação. Pode seguir para retoma ou devolução ao cliente.";

    default:
      return "O Atlas vai indicar aqui a próxima ação recomendada.";
  }
}