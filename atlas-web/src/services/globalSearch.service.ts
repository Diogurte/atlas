import { getCustomers, type CustomerListItem } from "./customers.service";
import { getRepairs, type RepairListItem } from "./repairs.service";

export type GlobalSearchResult =
  | {
      type: "repair";
      id: string;
      title: string;
      subtitle: string;
      meta: string;
      href: string;
    }
  | {
      type: "customer";
      id: string;
      title: string;
      subtitle: string;
      meta: string;
      href: string;
    };

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function includesSearch(values: Array<string | undefined>, query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) return false;

  return values.some((value) => normalize(value ?? "").includes(normalizedQuery));
}

function buildRepairResult(repair: RepairListItem): GlobalSearchResult {
  return {
    type: "repair",
    id: repair.id,
    title: repair.repair_number,
    subtitle: `${repair.customer} · ${repair.machine}`,
    meta: repair.status,
    href: `/repairs/${repair.id}`,
  };
}

function buildCustomerResult(customer: CustomerListItem): GlobalSearchResult {
  return {
    type: "customer",
    id: customer.id,
    title: customer.name,
    subtitle: `${customer.phone || "Sem telefone"}${customer.nif ? ` · NIF ${customer.nif}` : ""}`,
    meta: `${customer.totalRepairs} reparação(ões)`,
    href: `/clients?customerId=${customer.id}`,
  };
}

export async function globalSearch(query: string): Promise<GlobalSearchResult[]> {
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) return [];

  const [repairs, customers] = await Promise.all([getRepairs(), getCustomers()]);

  const customerResults = customers
    .filter((customer) =>
      includesSearch(
        [
          customer.name,
          customer.phone,
          customer.nif,
          customer.email,
          customer.notes,
          ...customer.machines,
        ],
        cleanQuery
      )
    )
    .slice(0, 5)
    .map(buildCustomerResult);

  const repairResults = repairs
    .filter((repair) =>
      includesSearch(
        [
          repair.repair_number,
          repair.customer,
          repair.phone,
          repair.machine,
          repair.status,
        ],
        cleanQuery
      )
    )
    .slice(0, 6)
    .map(buildRepairResult);

  return [...repairResults, ...customerResults].slice(0, 10);
}
