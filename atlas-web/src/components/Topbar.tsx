import { Button } from "./ui/Button";
import { GlobalSearch } from "./GlobalSearch";
import { useAuth } from "../auth/AuthContext";

export function Topbar() {
  const { profile, signOut } = useAuth();
  const firstName = profile?.name?.split(" ")[0] || "Utilizador";

  return (
    <header className="flex flex-col gap-5 border-b border-slate-800 bg-slate-950 px-10 py-6 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold text-white">
          Bom dia, {firstName} 👋
        </h1>

        <p className="mt-2 text-slate-400">
          Bem-vindo novamente ao Atlas.
        </p>
      </div>

      <div className="flex w-full flex-col gap-4 xl:w-auto xl:min-w-[720px] xl:flex-row xl:items-center xl:justify-end">
        <GlobalSearch />

        <div className="flex w-fit items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3">
          <div>
            <p className="font-medium text-white">
              {profile?.name ?? "Utilizador"}
            </p>

            <p className="text-sm text-slate-400">
              {profile?.role ?? ""}
            </p>
          </div>

          <Button variant="ghost" onClick={signOut} className="px-3 py-2">
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
