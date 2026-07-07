import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { getNextActions, getWorkflowSuggestion } from "../repair.workflow";

type Props = {
  status: string;
  onAction: (nextStatus: string, eventDescription: string) => void;
  onReevaluate: () => void;
};

const canReevaluate = [
  "Em diagnóstico",
  "A reparar",
  "A aguardar peças",
  "No fornecedor",
  "Recebida fornecedor",
  "Sem reparação",
];

export function RepairNextAction({ status, onAction, onReevaluate }: Props) {
  const actions = getNextActions(status);
  const suggestion = getWorkflowSuggestion(status);
  const isDelivered = status === "Entregue";

  if (isDelivered) {
    return (
      <Card className="border-emerald-400/20 bg-emerald-400/5">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">
          Atlas
        </p>

        <h2 className="mt-3 text-2xl font-semibold text-white">
          Estado Final
        </h2>

        <p className="mt-3 text-slate-300">
          Esta reparação foi concluída e entregue ao cliente.
        </p>

        <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-slate-950/40 px-4 py-4">
          <p className="text-sm font-semibold text-emerald-300">
            ✅ Ciclo fechado
          </p>
          <p className="mt-1 text-sm text-slate-400">
            O Diário da Reparação fica disponível para consulta futura. As ações úteis estão no painel Pós-Reparação.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
        Atlas
      </p>

      <h2 className="mt-3 text-2xl font-semibold text-white">
        Próxima ação
      </h2>

      <p className="mt-3 text-slate-400">{suggestion}</p>

      {actions.length > 0 ? (
        <div className="mt-6 space-y-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="secondary"
              className="w-full"
              type="button"
              onClick={() => onAction(action.nextStatus, action.event)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          Não existem ações disponíveis para esta etapa.
        </p>
      )}

      {canReevaluate.includes(status) && (
        <div className="mt-4 border-t border-slate-800 pt-4">
          <Button variant="ghost" className="w-full" type="button" onClick={onReevaluate}>
            🔀 Reavaliar reparação
          </Button>
        </div>
      )}
    </Card>
  );
}
