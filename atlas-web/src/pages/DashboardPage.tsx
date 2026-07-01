import { Card } from "../components/ui/Card";
const actionCards = [
  {
    title: "Reparações por enviar",
    value: "4",
    description: "Máquinas prontas para seguir para fornecedor",
  },
  {
    title: "Clientes por avisar",
    value: "2",
    description: "Reparações recebidas ou concluídas",
  },
  {
    title: "Pedidos em preparação",
    value: "8",
    description: "Artigos agrupados por fornecedor",
  },
  {
    title: "Pricing Engine",
    value: "1",
    description: "Tabela iniciada e ainda não concluída",
  },
];

export function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
              Atlas Ecosystem
            </p>

            <h1 className="mt-3 text-4xl font-bold">Dashboard</h1>

            <p className="mt-2 text-slate-400">
              O que precisa da tua atenção agora.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm text-slate-300">
            Diogo · Owner
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {actionCards.map((card) => (
            <Card key={card.title}>
              <p className="text-sm text-slate-400">{card.title}</p>

              <strong className="mt-4 block text-5xl">{card.value}</strong>

              <p className="mt-4 text-sm text-slate-500">
                {card.description}
              </p>
            </Card>
          ))}
        </section>

        <Card className="mt-8">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
            Atlas AI
          </p>

          <h2 className="mt-3 text-2xl font-semibold">Sugestões rápidas</h2>

          <p className="mt-3 text-slate-400">
            Ainda não há sugestões. Quando os módulos estiverem ativos, o Atlas
            vai mostrar aqui apenas aquilo que realmente precisa de ação.
          </p>
        </Card>
      </div>
    </main>
  );
}