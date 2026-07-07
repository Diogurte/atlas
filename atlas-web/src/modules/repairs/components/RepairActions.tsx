import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

type Props = {
  status: string;
  onPrint: () => void;
  onEdit: () => void;
  onAddNote: () => void;
  onViewDiary: () => void;
  onCreateRepairForCustomer: () => void;
  onReopen: () => void;
};

export function RepairActions({
  status,
  onPrint,
  onEdit,
  onAddNote,
  onViewDiary,
  onCreateRepairForCustomer,
  onReopen,
}: Props) {
  const isDelivered = status === "Entregue";

  if (isDelivered) {
    return (
      <Card>
        <h2 className="text-2xl font-semibold text-white">Pós-Reparação</h2>

        <p className="mt-3 text-sm text-slate-400">
          A máquina já foi entregue. Aqui ficam apenas ações úteis após o fecho da reparação.
        </p>

        <div className="mt-6 space-y-3">
          <Button className="w-full" type="button" onClick={onPrint}>
            Imprimir comprovativo
          </Button>

          <Button variant="secondary" className="w-full" type="button" onClick={onViewDiary}>
            Ver diário completo
          </Button>

          <Button
            variant="secondary"
            className="w-full"
            type="button"
            onClick={onCreateRepairForCustomer}
          >
            Criar nova reparação para este cliente
          </Button>

          <Button variant="secondary" className="w-full" type="button" onClick={onAddNote}>
            Adicionar nota pós-entrega
          </Button>

          <Button variant="ghost" className="w-full border border-slate-800" type="button" onClick={onReopen}>
            Reabrir reparação
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-2xl font-semibold text-white">Dados</h2>

      <p className="mt-3 text-sm text-slate-400">
        Edita apenas informação administrativa. O workflow é gerido pelo Atlas.
      </p>

      <div className="mt-6 space-y-3">
        <Button className="w-full" type="button" onClick={onPrint}>
          Imprimir comprovativo
        </Button>

        <Button variant="secondary" className="w-full" type="button" onClick={onEdit}>
          Editar reparação
        </Button>

        <Button variant="secondary" className="w-full" type="button" onClick={onAddNote}>
          Adicionar nota
        </Button>
      </div>
    </Card>
  );
}
