import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { AppLayout } from "../layouts/AppLayout";
import { useAuth } from "../auth/AuthContext";

export function ForbiddenPage() {
  const { signOut } = useAuth();

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <Card>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Permissões</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Sem acesso a esta área</h1>
          <p className="mt-4 text-slate-400">
            O teu perfil não tem permissão para aceder a este módulo. Pede ao Owner para ajustar as permissões em Definições → Utilizadores.
          </p>
          <div className="mt-6">
            <Button variant="secondary" onClick={signOut}>Terminar sessão</Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
