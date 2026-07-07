import { Card } from "../../../components/ui/Card";
import { RepairInfo } from "./RepairInfo";

type Props = {
  customer: string;
  machine: string;
  status: string;
  warranty: string;
  date: string;
};

export function RepairSummary({
  customer,
  machine,
  status,
  warranty,
  date,
}: Props) {
  return (
    <Card>
      <h2 className="text-2xl font-semibold text-white">Resumo</h2>

      <div className="mt-6 space-y-5">
        <RepairInfo label="Cliente" value={customer} />
        <RepairInfo label="Máquina" value={machine} />
        <RepairInfo label="Estado" value={status} />
        <RepairInfo label="Garantia" value={warranty} />
        <RepairInfo label="Fornecedor" value="—" />
        <RepairInfo label="Criada" value={date} />
      </div>
    </Card>
  );
}