import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  type AtlasOperationCenter,
  getPriorityClasses,
  getRepairMission,
} from "../core/atlas.engine";
import { AppLayout } from "../layouts/AppLayout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import {
  executeAtlasAssistantCommand,
  type AtlasAssistantMessage,
} from "../services/atlasAssistant.service";
import { getAtlasOperationCenter } from "../services/dashboard.service";
import { printSupplierRequisition } from "../services/supplierRequisitionPdf.service";

const starterMessages: AtlasAssistantMessage[] = [
  {
    role: "assistant",
    content:
      "Bom dia. Já estou pronto para trabalhar. Posso criar uma ficha de reparação ou preparar um pedido para fornecedor. A decisão técnica continua sempre do lado da equipa.",
  },
];

const repairTemplate = `Criar ficha de reparação
cliente: João Silva
telemóvel: 912345678
nif:
email:
marca: Bosch
modelo: GSB 18V-55
problema: Não liga
acessórios: mala e bateria
observações:`;

const supplierTemplate = `Criar pedido para fornecedor
fornecedor: MF Martins
material:
Escovas Bosch qtd 2
Rotor GBH qtd 1
Carvões Makita qtd 4`;

export function AtlasAIPage() {
  const [operationCenter, setOperationCenter] =
    useState<AtlasOperationCenter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<AtlasAssistantMessage[]>(starterMessages);
  const [command, setCommand] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  async function loadAtlas() {
    setIsLoading(true);
    const data = await getAtlasOperationCenter();
    setOperationCenter(data);
    setIsLoading(false);
  }

  useEffect(() => {
    loadAtlas();
  }, []);

  const priorityRepairs = useMemo(() => {
    return (operationCenter?.activeRepairs ?? [])
      .map((repair) => ({ repair, mission: getRepairMission(repair.status) }))
      .sort((a, b) => getPriorityWeight(a.mission.priority) - getPriorityWeight(b.mission.priority))
      .slice(0, 5);
  }, [operationCenter]);

  const suggestions = useMemo(() => {
    const buckets = operationCenter?.buckets ?? [];

    const diagnose = buckets.find((bucket) => bucket.key === "diagnose")?.count ?? 0;
    const notify = buckets.find((bucket) => bucket.key === "notify")?.count ?? 0;
    const parts = buckets.find((bucket) => bucket.key === "parts")?.count ?? 0;
    const supplier = buckets.find((bucket) => bucket.key === "supplier")?.count ?? 0;
    const pickup = buckets.find((bucket) => bucket.key === "pickup")?.count ?? 0;

    const items = [];

    if (diagnose > 0) {
      items.push({
        title: "Começar pelos diagnósticos",
        description: `Existem ${diagnose} máquina(s) à espera de avaliação. É a etapa que mais desbloqueia trabalho.`,
        href: "/repairs?status=Recebida,A%20aguardar%20diagn%C3%B3stico",
      });
    }

    if (notify > 0) {
      items.push({
        title: "Avisar clientes",
        description: `Há ${notify} reparação(ões) concluída(s) que precisam de contacto.`,
        href: "/repairs?status=Repara%C3%A7%C3%A3o%20conclu%C3%ADda",
      });
    }

    if (parts > 0) {
      items.push({
        title: "Verificar peças",
        description: `${parts} reparação(ões) estão paradas à espera de peças.`,
        href: "/repairs?status=A%20aguardar%20pe%C3%A7as",
      });
    }

    if (supplier > 0) {
      items.push({
        title: "Acompanhar fornecedores",
        description: `${supplier} máquina(s) estão ligadas a fornecedor ou regressaram recentemente.`,
        href: "/repairs?status=No%20fornecedor,Recebida%20fornecedor",
      });
    }

    if (pickup > 0) {
      items.push({
        title: "Limpar levantamentos",
        description: `${pickup} máquina(s) estão prontas para levantamento.`,
        href: "/repairs?status=Cliente%20avisado,A%20aguardar%20levantamento",
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Trabalho controlado",
        description: "Não existem prioridades críticas neste momento. O Atlas vai destacar aqui o que precisar de atenção.",
        href: "/dashboard",
      });
    }

    return items.slice(0, 4);
  }, [operationCenter]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanCommand = command.trim();
    if (!cleanCommand || isExecuting) return;

    setMessages((current) => [...current, { role: "user", content: cleanCommand }]);
    setCommand("");
    setIsExecuting(true);

    try {
      const result = await executeAtlasAssistantCommand(cleanCommand);

      setMessages((current) => [...current, result.answer]);

      if (result.requisition) {
        printSupplierRequisition({
          supplier: result.requisition.supplier,
          orderNumber: result.requisition.orderNumber,
          lines: result.requisition.lines,
        });

        window.location.href = result.requisition.mailto;
      }

      if (result.repair) {
        await loadAtlas();
      }
    } catch (error: any) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error?.message ??
            "Não consegui concluir a ação. Confirma os dados e tenta novamente.",
        },
      ]);
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <AppLayout>
      <section className="mb-8 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="border-cyan-400/20 bg-cyan-400/5">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            Atlas AI
          </p>

          <h1 className="mt-3 text-4xl font-bold text-white">
            O assistente operacional da empresa.
          </h1>

          <p className="mt-4 max-w-3xl text-slate-300">
            Agora já podes comunicar com o Atlas para criar fichas de reparação
            e preparar pedidos a fornecedores. A IA ajuda, mas a equipa decide.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCommand(repairTemplate)}
            >
              🔧 Preparar ficha de reparação
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setCommand(supplierTemplate)}
            >
              📦 Preparar pedido fornecedor
            </Button>
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Reparações ativas</p>
          <p className="mt-3 text-5xl font-bold text-white">
            {isLoading ? "—" : operationCenter?.activeRepairs.length ?? 0}
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            O Atlas analisa estas reparações para sugerir prioridades sem
            substituir a decisão da equipa.
          </p>
        </Card>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
                Conversa operacional
              </p>

              <h2 className="mt-3 text-2xl font-semibold text-white">
                Pede ao Atlas para trabalhar contigo
              </h2>
            </div>

            {isExecuting && (
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                A executar...
              </span>
            )}
          </div>

          <div className="max-h-[420px] space-y-4 overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-2xl border p-4 ${
                  message.role === "user"
                    ? "ml-auto max-w-[85%] border-cyan-400/30 bg-cyan-400/10 text-cyan-50"
                    : "mr-auto max-w-[90%] border-slate-800 bg-slate-900 text-slate-200"
                }`}
              >
                <p className="whitespace-pre-line text-sm leading-6">
                  {message.content}
                </p>

                {message.actionLink && (
                  <Link
                    to={message.actionLink.href}
                    className="mt-4 inline-flex rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    {message.actionLink.label}
                  </Link>
                )}
              </div>
            ))}
          </div>

          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <textarea
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              rows={7}
              className="w-full rounded-3xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              placeholder="Exemplo: criar ficha de reparação... ou fornecedor: MF Martins / material: ..."
            />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs leading-5 text-slate-500">
                Para já, o Atlas trabalha melhor com formato por linhas. Isto é
                intencional: rapidez no balcão e menos risco de erro.
              </p>

              <Button type="submit" disabled={isExecuting || !command.trim()}>
                Executar com Atlas
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
              Sugestões
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-white">
              O que o Atlas faria agora
            </h2>

            <div className="mt-6 space-y-3">
              {suggestions.map((suggestion) => (
                <Link
                  key={suggestion.title}
                  to={suggestion.href}
                  className="block rounded-2xl border border-slate-800 bg-slate-950 p-4 transition hover:border-cyan-400/40 hover:bg-slate-900"
                >
                  <h3 className="font-semibold text-white">{suggestion.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {suggestion.description}
                  </p>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
              Regras de confiança
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-white">
              A IA ajuda. A equipa decide.
            </h2>

            <div className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
              <p>✅ Pode criar fichas com dados fornecidos pela equipa.</p>
              <p>✅ Pode preparar pedidos a fornecedores.</p>
              <p>✅ Pode sugerir prioridades.</p>
              <p>❌ Nunca decide um diagnóstico sozinha.</p>
              <p>❌ Nunca decide reparar, substituir ou cobrar.</p>
            </div>
          </Card>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
              Próximas missões
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Reparações que merecem atenção
            </h2>
          </div>
        </div>

        <div className="grid gap-5">
          {priorityRepairs.map(({ repair, mission }) => (
            <Card key={repair.id} className={getPriorityClasses(mission.priority)}>
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-500">{repair.repair_number}</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">
                    {repair.customer}
                  </h3>
                  <p className="mt-1 text-slate-400">{repair.machine}</p>
                </div>

                <div className="md:w-[360px]">
                  <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {mission.badge}
                  </span>
                  <h4 className="mt-3 font-semibold text-white">{mission.title}</h4>
                  <p className="mt-1 text-sm text-slate-400">{mission.description}</p>
                </div>

                <Link
                  to={`/repairs/${repair.id}`}
                  className="rounded-2xl bg-cyan-400 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Abrir ficha
                </Link>
              </div>
            </Card>
          ))}

          {!isLoading && priorityRepairs.length === 0 && (
            <Card>
              <p className="text-slate-400">
                Não existem reparações prioritárias neste momento.
              </p>
            </Card>
          )}
        </div>
      </section>
    </AppLayout>
  );
}

function getPriorityWeight(priority: "high" | "medium" | "normal") {
  const weights = {
    high: 0,
    medium: 1,
    normal: 2,
  };

  return weights[priority];
}
