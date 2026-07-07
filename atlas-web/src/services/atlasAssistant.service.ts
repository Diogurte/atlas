import type { RepairFormData } from "../modules/repairs/components/RepairForm";
import { createRepair, type CreatedRepair } from "./repairs.service";
import {
  getSuppliers,
  parseRequisitionLines,
  sendSupplierTextRequisition,
  type Supplier,
} from "./suppliers.service";

export type AtlasAssistantMessage = {
  role: "user" | "assistant";
  content: string;
  actionLink?: {
    label: string;
    href: string;
  };
};

export type AtlasAssistantResult = {
  answer: AtlasAssistantMessage;
  repair?: CreatedRepair;
  requisition?: {
    supplier: Supplier;
    orderNumber: string;
    lines: string[];
    mailto: string;
  };
};

const FIELD_ALIASES: Record<string, string[]> = {
  customer: ["cliente", "nome", "nome cliente"],
  phone: ["telefone", "telemovel", "telemóvel", "tlm", "contacto", "numero", "número"],
  taxNumber: ["nif", "contribuinte"],
  email: ["email", "e-mail", "mail"],
  brand: ["marca"],
  model: ["modelo", "máquina", "maquina"],
  serialNumber: ["serie", "série", "numero serie", "número série", "n serie", "nº série"],
  problem: ["problema", "avaria", "defeito"],
  internalNotes: ["observacoes", "observações", "notas", "nota"],
  accessories: ["acessorios", "acessórios", "traz", "material entregue"],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getField(text: string, field: keyof RepairFormData) {
  const aliases = FIELD_ALIASES[field] ?? [];

  for (const alias of aliases) {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|\\n)\\s*${escapedAlias}\\s*[:=-]\\s*(.+)`, "i");
    const match = text.match(regex);

    if (match?.[1]) {
      return match[1].split("\n")[0].trim();
    }
  }

  return "";
}

function inferPhone(text: string) {
  return text.match(/(?:\+351\s*)?(9\d{2}\s?\d{3}\s?\d{3})/)?.[1]?.replace(/\s/g, "") ?? "";
}

function inferNif(text: string) {
  return text.match(/(?:nif|contribuinte)?\s*[:=-]?\s*([1235689]\d{8})/i)?.[1] ?? "";
}

function parseRepairCommand(command: string): RepairFormData {
  const phone = getField(command, "phone") || inferPhone(command);
  const taxNumber = getField(command, "taxNumber") || inferNif(command);

  return {
    customer: getField(command, "customer"),
    phone,
    taxNumber,
    email: getField(command, "email"),
    brand: getField(command, "brand"),
    model: getField(command, "model"),
    serialNumber: getField(command, "serialNumber"),
    problem: getField(command, "problem"),
    internalNotes: getField(command, "internalNotes"),
    accessories: getField(command, "accessories"),
    warranty: "Não confirmado",
  };
}

function getMissingRepairFields(form: RepairFormData) {
  const missing = [];

  if (!form.customer) missing.push("cliente");
  if (!form.phone) missing.push("telemóvel");
  if (!form.brand) missing.push("marca");
  if (!form.model) missing.push("modelo");
  if (!form.problem) missing.push("problema");

  return missing;
}

function getSupplierNameFromCommand(command: string) {
  const explicit = command.match(/(?:fornecedor|à|a)\s*[:=-]?\s*([^\n]+)/i)?.[1]?.trim();

  if (explicit) {
    return explicit
      .replace(/^pedido\s+/i, "")
      .replace(/^enviar\s+/i, "")
      .trim();
  }

  return "";
}

function getRequestText(command: string, supplier?: Supplier) {
  const materialMatch = command.match(/(?:material|pedido|linhas|artigos)\s*[:=-]\s*([\s\S]+)/i);

  if (materialMatch?.[1]) {
    return materialMatch[1].trim();
  }

  const lines = command
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^pedido/i.test(line))
    .filter((line) => !/^fornecedor\s*[:=-]/i.test(line))
    .filter((line) => !/^enviar/i.test(line))
    .filter((line) => !supplier || !normalize(line).includes(normalize(supplier.name)));

  return lines.join("\n").trim();
}

async function executeRepairCommand(command: string): Promise<AtlasAssistantResult> {
  const form = parseRepairCommand(command);
  const missing = getMissingRepairFields(form);

  if (missing.length > 0) {
    return {
      answer: {
        role: "assistant",
        content: `Consigo criar a ficha, mas faltam estes dados: ${missing.join(", ")}.\n\nUsa este formato rápido:\ncliente: João Silva\ntelemóvel: 912345678\nmarca: Bosch\nmodelo: GSB 18V-55\nproblema: Não liga`,
      },
    };
  }

  const repair = await createRepair(form);

  return {
    repair,
    answer: {
      role: "assistant",
      content: `Ficha criada com sucesso: ${repair.repair_number}.\nCliente: ${form.customer}\nMáquina: ${form.brand} ${form.model}`,
      actionLink: {
        label: "Abrir ficha da reparação",
        href: `/repairs/${repair.id}`,
      },
    },
  };
}

async function executeSupplierOrderCommand(command: string): Promise<AtlasAssistantResult> {
  const suppliers = await getSuppliers();
  const requestedSupplierName = getSupplierNameFromCommand(command);
  const normalizedCommand = normalize(command);

  const supplier = suppliers.find((item) => {
    const supplierName = normalize(item.name);
    const requested = normalize(requestedSupplierName);

    return (
      (requested && supplierName.includes(requested)) ||
      (requested && requested.includes(supplierName)) ||
      normalizedCommand.includes(supplierName)
    );
  });

  if (!supplier) {
    return {
      answer: {
        role: "assistant",
        content: `Não consegui identificar o fornecedor. Escreve, por exemplo:\nfornecedor: MF Martins\nmaterial:\nEscovas Bosch qtd 2\nRotor GBH qtd 1`,
        actionLink: {
          label: "Ver fornecedores",
          href: "/suppliers",
        },
      },
    };
  }

  const requestText = getRequestText(command, supplier);
  const lines = parseRequisitionLines(requestText);

  if (lines.length === 0) {
    return {
      answer: {
        role: "assistant",
        content: `Encontrei o fornecedor ${supplier.name}, mas falta o material.\n\nExemplo:\nfornecedor: ${supplier.name}\nmaterial:\nEscovas Bosch qtd 2\nRotor GBH qtd 1`,
      },
    };
  }

  const result = await sendSupplierTextRequisition({
    supplier,
    requestText,
    createdBy: "Diogo Pinto",
  });

  return {
    requisition: {
      supplier,
      orderNumber: result.orderNumber,
      lines: result.lines,
      mailto: result.mailto,
    },
    answer: {
      role: "assistant",
      content: `Requisição ${result.orderNumber} criada para ${supplier.name}.\nLinhas: ${result.lines.length}.\nVou abrir o email preparado e gerar a requisição em PDF.`,
      actionLink: {
        label: "Abrir Centro de Compras",
        href: "/orders",
      },
    },
  };
}

export async function executeAtlasAssistantCommand(
  command: string
): Promise<AtlasAssistantResult> {
  const normalized = normalize(command);

  if (!normalized.trim()) {
    return {
      answer: {
        role: "assistant",
        content: "Escreve o que queres que eu faça. Posso criar fichas de reparação ou preparar pedidos a fornecedores.",
      },
    };
  }

  const looksLikeSupplierOrder =
    normalized.includes("pedido") ||
    normalized.includes("requisicao") ||
    normalized.includes("requisição") ||
    normalized.includes("fornecedor");

  const looksLikeRepair =
    normalized.includes("reparacao") ||
    normalized.includes("reparação") ||
    normalized.includes("ficha") ||
    normalized.includes("maquina") ||
    normalized.includes("máquina") ||
    normalized.includes("problema");

  if (looksLikeSupplierOrder && !looksLikeRepair) {
    return executeSupplierOrderCommand(command);
  }

  if (looksLikeRepair) {
    return executeRepairCommand(command);
  }

  return {
    answer: {
      role: "assistant",
      content: `Ainda não tenho a certeza do que queres fazer.\n\nPosso ajudar com:\n1. Criar ficha de reparação.\n2. Criar pedido para fornecedor.\n\nExemplo reparação:\ncliente: João Silva\ntelemóvel: 912345678\nmarca: Bosch\nmodelo: GSB\nproblema: Não liga\n\nExemplo pedido:\nfornecedor: MF Martins\nmaterial:\nEscovas Bosch qtd 2`,
    },
  };
}
