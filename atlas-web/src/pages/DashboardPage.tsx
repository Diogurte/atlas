import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  type AtlasOperationCenter,
  type AtlasPriority,
  getPriorityClasses,
  getRepairMission,
} from "../core/atlas.engine";
import { Card } from "../components/ui/Card";
import { AppLayout } from "../layouts/AppLayout";
import { getAtlasOperationCenter } from "../services/dashboard.service";

function buildRepairFilterUrl(statuses: string[]) {
  const params = new URLSearchParams();
  params.set("status", statuses.join(","));
  return `/repairs?${params.toString()}`;
}

export function DashboardPage() {
  const [operationCenter, setOperationCenter] =
    useState<AtlasOperationCenter | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard() {
    setIsLoading(true);
    const data = await getAtlasOperationCenter();
    setOperationCenter(data);
    setIsLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const buckets = operationCenter?.buckets ?? [];
  const activeRepairs = operationCenter?.activeRepairs ?? [];
  const totalActions = operationCenter?.totalActions ?? 0;
  const primarySuggestion =
    operationCenter?.primarySuggestion ??
    "O Atlas está a organizar o trabalho da oficina.";
  const priorityRepairs = activeRepairs
    .map((repair) => ({ repair, mission: getRepairMission(repair.status) }))
    .sort((a, b) => getPriorityWeight(a.mission.priority) - getPriorityWeight(b.mission.priority))
    .slice(0, 4);

  return (
    <AppLayout>
      <section className="mb-8 grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
        <Card className="border-cyan-400/20 bg-cyan-400/5">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            Centro de Operações
          </p>

          <h2 className="mt-4 text-4xl font-bold text-white">
            Bom dia. O Atlas organizou o trabalho.
          </h2>

          <p className="mt-4 max-w-3xl text-slate-300">
            Cada caixa representa trabalho real da oficina. O objetivo é abrir,
            executar e seguir para a próxima tarefa sem perder tempo a procurar.
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Reparações ativas</p>
          <p className="mt-3 text-5xl font-bold text-white">
            {isLoading ? "—" : activeRepairs.length}
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
            <p className="text-sm text-slate-500">Ações abertas</p>
            <p className="mt-1 text-3xl font-bold text-cyan-300">
              {isLoading ? "—" : totalActions}
            </p>
          </div>
        </Card>
      </section>

      <Card className="mb-8 border-cyan-400/20 bg-slate-900">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
              Atlas
            </p>

            <h3 className="mt-3 text-2xl font-semibold text-white">
              Sugestão operacional
            </h3>

            <p className="mt-3 text-slate-300">{primarySuggestion}</p>
          </div>

          <Link
            to="/repairs"
            className="rounded-2xl border border-slate-700 px-5 py-3 text-center text-sm font-semibold text-slate-200 transition hover:border-cyan-400/50 hover:bg-slate-800 hover:text-white"
          >
            Ver todas as reparações
          </Link>
        </div>
      </Card>



      <section className="mb-8 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
                Próximas prioridades
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white">
                O que o Atlas faria a seguir
              </h3>
            </div>

            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-400">
              Top {isLoading ? "—" : priorityRepairs.length}
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {priorityRepairs.map(({ repair, mission }) => (
              <Link
                key={repair.id}
                to={`/repairs/${repair.id}`}
                className="block rounded-2xl border border-slate-800 bg-slate-950 p-4 transition hover:border-cyan-400/40 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{repair.repair_number}</p>
                    <p className="mt-1 font-semibold text-white">{repair.customer}</p>
                    <p className="mt-1 text-sm text-slate-400">{repair.machine}</p>
                  </div>

                  <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {mission.badge}
                  </span>
                </div>
              </Link>
            ))}

            {!isLoading && priorityRepairs.length === 0 && (
              <p className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                Não há prioridades abertas neste momento.
              </p>
            )}
          </div>
        </Card>

        <Card className="border-cyan-400/20 bg-cyan-400/5">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
            Atlas Core
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">
            Assistente operacional ativo
          </h3>
          <p className="mt-4 leading-7 text-slate-300">
            O Atlas já separa o trabalho por missão, prioridade e etapa. A próxima evolução será permitir executar cada tarefa com menos cliques, diretamente a partir das caixas de trabalho.
          </p>
        </Card>
      </section>

      <section className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-white">Caixas de trabalho</h3>
          <p className="mt-2 text-slate-400">
            O Atlas separa as reparações pelo próximo trabalho a fazer.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {buckets.map((bucket) => (
          <OperationCard key={bucket.key} bucket={bucket} isLoading={isLoading} />
        ))}
      </section>
    </AppLayout>
  );
}

function OperationCard({
  bucket,
  isLoading,
}: {
  bucket: NonNullable<AtlasOperationCenter["buckets"]>[number];
  isLoading: boolean;
}) {
  return (
    <Card className={`transition hover:-translate-y-1 ${getPriorityClasses(bucket.priority)}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-3xl">{bucket.icon}</p>

            <h3 className="mt-4 text-2xl font-semibold text-white">
              {bucket.title}
            </h3>
          </div>

          <strong className="text-5xl text-white">
            {isLoading ? "—" : bucket.count}
          </strong>
        </div>

        <p className="mt-4 flex-1 text-sm leading-6 text-slate-400">
          {bucket.description}
        </p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-400">
            {bucket.priority === "high" ? "Prioritário" : "Operacional"}
          </span>

          <Link
            to={buildRepairFilterUrl(bucket.statuses)}
            className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Abrir
          </Link>
        </div>
      </div>
    </Card>
  );
}


function getPriorityWeight(priority: AtlasPriority) {
  const weights: Record<AtlasPriority, number> = {
    high: 0,
    medium: 1,
    normal: 2,
  };

  return weights[priority];
}
