import { pageHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, PasswordField, isEmail } from "@/components/frontier/AuthShell";
import { PageHeader } from "@/components/frontier/PageHeader";
import { useMission } from "@/hooks/use-mission";
import { apiRequest, AuthError } from "@/lib/auth-api";

export const Route = createFileRoute("/admin")({
  head: () => pageHead("/admin", "Administração — Ares Frontier", "Administração da plataforma Ares Frontier."),
  component: AdminPage,
});

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "explorer" | "admin";
  is_active: boolean;
  created_at: string;
}
interface UserList {
  users: AdminUser[];
  total: number;
  active: number;
  admins: number;
}
const selectClass = "h-11 w-full rounded-sm border border-input bg-background px-3 text-sm";

export function AdminPage() {
  const { user, refreshUser } = useMission();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [passwordEntry, setPasswordEntry] = useState<AdminUser | null>(null);
  const canManage = !user?.guest && user?.role === "admin";
  const params = new URLSearchParams({
    q: search,
    status,
    role,
    offset: String(offset),
    limit: "20",
  });
  const query = useQuery({
    queryKey: ["admin-users", user?.id, search, status, role, offset],
    queryFn: () => apiRequest<UserList>(`admin/users?${params}`),
    enabled: canManage,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  if (!canManage)
    return (
      <main>
        <PageHeader eyebrow="Administração" title="Acesso restrito">
          Esta área está disponível apenas para administradores.
        </PageHeader>
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
          <Button asChild variant="outline">
            <Link to="/conta">Voltar à minha conta</Link>
          </Button>
        </div>
      </main>
    );

  const forbidden = query.error instanceof AuthError && [401, 403].includes(query.error.status);
  const data = query.isError ? undefined : query.data;

  return (
    <main>
      <PageHeader eyebrow="Central administrativa" title="Gestão de exploradores">
        Gerencie cadastros, permissões e acesso à Ares Frontier.
      </PageHeader>
      <div className="mx-auto max-w-7xl space-y-6 px-5 py-10 md:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Cadastros encontrados", value: data?.total, icon: Users },
            { label: "Contas ativas no sistema", value: data?.active, icon: Users },
            { label: "Administradores ativos", value: data?.admins, icon: ShieldCheck },
          ].map(({ label, value, icon: Icon }) => (
            <section key={label} className="border border-border bg-card p-5">
              <Icon className="mb-4 h-5 w-5 text-mineral" />
              <p className="font-display text-3xl">{value ?? "—"}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
            </section>
          ))}
        </div>
        <section className="border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
            <h2 className="font-display text-xl">Usuários e cadastros</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void query.refetch();
                }}
                disabled={query.isFetching}
              >
                <RefreshCw className={query.isFetching ? "animate-spin" : ""} /> Atualizar
              </Button>
              <Button
                size="sm"
                disabled={forbidden}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus /> Novo usuário
              </Button>
            </div>
          </div>
          <div className="grid gap-3 border-b border-border p-5 md:grid-cols-[2fr_1fr_1fr]">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
                setOffset(0);
              }}
            >
              <Input
                aria-label="Buscar por nome ou e-mail"
                placeholder="Buscar por nome ou e-mail"
                maxLength={120}
                className="h-11"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Button type="submit" variant="outline" className="h-11" aria-label="Buscar usuários">
                <Search />
              </Button>
            </form>
            <select
              aria-label="Filtrar por status"
              className={selectClass}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setOffset(0);
              }}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <select
              aria-label="Filtrar por perfil"
              className={selectClass}
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setOffset(0);
              }}
            >
              <option value="all">Todos os perfis</option>
              <option value="explorer">Exploradores</option>
              <option value="admin">Administradores</option>
            </select>
          </div>
          {notice && (
            <p role="status" className="px-5 pt-4 text-sm text-mineral">
              {notice}
            </p>
          )}
          {query.isPending && (
            <p role="status" className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando cadastros…
            </p>
          )}
          {query.isError && (
            <div role="alert" className="p-8 text-sm text-destructive">
              <p>{query.error.message}</p>
              {forbidden && (
                <Link to="/login" className="mt-3 inline-block underline">
                  Entrar novamente com uma conta administrativa
                </Link>
              )}
            </div>
          )}
          {data && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Cadastros de usuários da Ares Frontier</caption>
                  <thead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      {["Explorador", "Perfil", "Status", "Cadastro", "Ações"].map((label) => (
                        <th key={label} scope="col" className="px-5 py-4">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.users.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {entry.name}{" "}
                            {entry.id === user?.id && (
                              <span className="text-xs text-mineral">(você)</span>
                            )}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{entry.email}</p>
                        </td>
                        <td className="px-5 py-4">
                          {entry.role === "admin" ? "Administrador" : "Explorador"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block border px-2 py-1 font-mono text-[10px] uppercase ${entry.is_active ? "border-mineral/40 text-mineral" : "border-border text-muted-foreground"}`}
                          >
                            {entry.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Editar ${entry.name}`}
                              onClick={() => {
                                setEditing(entry);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" /> Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Alterar senha de ${entry.name}`}
                              onClick={() => setPasswordEntry(entry)}
                            >
                              <KeyRound className="h-3 w-3" /> Senha
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              aria-label={`Excluir ${entry.name}`}
                              disabled={entry.id === user?.id}
                              onClick={() => setDeleting(entry)}
                            >
                              <Trash2 className="h-3 w-3" /> Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.users.length === 0 && (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    Nenhum cadastro encontrado para estes filtros.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5">
                <p className="font-mono text-xs text-muted-foreground">
                  {data.total === 0 ? "0" : `${offset + 1}–${Math.min(offset + 20, data.total)}`} de{" "}
                  {data.total} cadastros
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={offset === 0 || query.isFetching}
                    onClick={() => setOffset(Math.max(0, offset - 20))}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={offset + 20 >= data.total || query.isFetching}
                    onClick={() => setOffset(offset + 20)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
        {data && <DeletionHistory />}
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Desativar uma conta impede novos acessos e encerra suas sessões. Alterar o perfil também
          encerra as sessões do usuário. Seu próprio acesso administrativo permanece protegido.
        </p>
      </div>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cadastro" : "Novo usuário"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados e as permissões desta conta."
                : "Crie uma conta com uma senha inicial de 12 a 128 caracteres."}
            </DialogDescription>
          </DialogHeader>
          {formOpen && (
            <UserForm
              key={editing?.id ?? "new"}
              entry={editing}
              selfId={user?.id}
              onSaved={async () => {
                setNotice(editing ? "Cadastro atualizado." : "Usuário criado.");
                setFormOpen(false);
                await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                if (editing?.id === user?.id) {
                  try {
                    await refreshUser();
                  } catch {
                    setNotice(
                      "Cadastro salvo. Atualize a página para recarregar seus dados de perfil.",
                    );
                  }
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {passwordEntry && (
        <PasswordDialog
          entry={passwordEntry}
          self={passwordEntry.id === user?.id}
          onClose={() => setPasswordEntry(null)}
          onSaved={() => {
            const self = passwordEntry.id === user?.id;
            setPasswordEntry(null);
            setNotice("Senha atualizada. As sessões da conta foram encerradas.");
            if (self) {
              queryClient.clear();
              window.location.assign("/login");
            }
          }}
        />
      )}
      {deleting && (
        <DeleteUserDialog
          entry={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={async () => {
            setDeleting(null);
            setNotice("Usuário excluído. A ação foi registrada no histórico.");
            setOffset(0);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
              queryClient.invalidateQueries({ queryKey: ["admin-deletion-logs"] }),
            ]);
          }}
        />
      )}
    </main>
  );
}

function PasswordDialog({
  entry,
  self,
  onClose,
  onSaved,
}: {
  entry: AdminUser;
  self: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validation, setValidation] = useState("");
  const mutation = useMutation({
    mutationFn: () => apiRequest<void>(`admin/users/${entry.id}/password`, { password }, "PUT"),
    onSuccess: () => {
      setPassword("");
      setConfirmation("");
      onSaved();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>
            Defina uma nova senha para {entry.name} ({entry.email}). Todas as sessões desta conta
            serão encerradas.{self && " Você precisará entrar novamente com a nova senha."}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setValidation("");
            if (mutation.isPending) return;
            if (password.length < 12 || password.length > 128)
              return setValidation("Use uma senha entre 12 e 128 caracteres.");
            if (password !== confirmation) return setValidation("As senhas não coincidem.");
            mutation.mutate();
          }}
        >
          <fieldset disabled={mutation.isPending} className="space-y-4">
            <PasswordField
              label="Nova senha"
              autoComplete="new-password"
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <PasswordField
              label="Confirmar nova senha"
              autoComplete="new-password"
              maxLength={128}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            {(validation || mutation.error) && (
              <p role="alert" className="text-sm text-destructive">
                {validation || mutation.error?.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {mutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" /> Salvando…
                  </>
                ) : (
                  "Salvar nova senha"
                )}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({
  entry,
  onClose,
  onDeleted,
}: {
  entry: AdminUser;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const mutation = useMutation({
    mutationFn: () => apiRequest<void>(`admin/users/${entry.id}`, undefined, "DELETE"),
    onSuccess: onDeleted,
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir usuário?</DialogTitle>
          <DialogDescription>
            A conta de {entry.name} ({entry.email}) será excluída permanentemente e suas sessões
            serão encerradas. O histórico manterá o nome e o e-mail da conta, o administrador
            responsável e a data da exclusão.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (confirmation === entry.email && !mutation.isPending) mutation.mutate();
          }}
        >
          <Field
            label="Digite o e-mail do usuário para confirmar"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            disabled={mutation.isPending}
          />
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={confirmation !== entry.email || mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" /> Excluindo…
                </>
              ) : (
                "Excluir permanentemente"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeletionLog {
  id: string;
  actor_name: string;
  actor_email: string;
  user_name: string;
  user_email: string;
  deleted_at: string;
}

function DeletionHistory() {
  const [offset, setOffset] = useState(0);
  const { user } = useMission();
  const query = useQuery({
    queryKey: ["admin-deletion-logs", user?.id, offset],
    queryFn: () =>
      apiRequest<{ logs: DeletionLog[]; total: number }>(
        `admin/deletion-logs?offset=${offset}&limit=20`,
      ),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const data = query.isError ? undefined : query.data;
  return (
    <section className="border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="font-display text-xl">Histórico de exclusões</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Registro permanente de quem excluiu cada conta. Horários no fuso do seu dispositivo.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={query.isFetching}
          onClick={() => {
            void query.refetch();
          }}
          aria-label="Atualizar histórico"
        >
          <RefreshCw className={query.isFetching ? "animate-spin" : ""} /> Atualizar
        </Button>
      </div>
      {query.isPending && (
        <p role="status" className="p-5 text-sm text-muted-foreground">
          Carregando histórico…
        </p>
      )}
      {query.isError && (
        <p role="alert" className="p-5 text-sm text-destructive">
          {query.error.message}
        </p>
      )}
      {data && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Auditoria de exclusões de usuários</caption>
              <thead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Usuário excluído", "Excluído por", "Data e hora"].map((label) => (
                    <th scope="col" key={label} className="px-5 py-4">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-5 py-4">
                      <p>{log.user_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{log.user_email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p>{log.actor_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{log.actor_email}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs">
                      <time dateTime={log.deleted_at}>
                        {new Date(log.deleted_at).toLocaleString("pt-BR")}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.logs.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">Nenhuma exclusão registrada.</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5">
            <p className="text-xs text-muted-foreground">{data.total} exclusões registradas</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                aria-label="Página anterior do histórico"
                disabled={offset === 0 || query.isFetching}
                onClick={() => setOffset(Math.max(0, offset - 20))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label="Próxima página do histórico"
                disabled={offset + 20 >= data.total || query.isFetching}
                onClick={() => setOffset(offset + 20)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function UserForm({
  entry,
  selfId,
  onSaved,
}: {
  entry: AdminUser | null;
  selfId: string | undefined;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(entry?.name ?? "");
  const [email, setEmail] = useState(entry?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(entry?.role ?? "explorer");
  const [active, setActive] = useState(entry?.is_active ?? true);
  const [validation, setValidation] = useState("");
  const self = entry?.id === selfId;
  const mutation = useMutation({
    mutationFn: () =>
      entry
        ? apiRequest<AdminUser>(
            `admin/users/${entry.id}`,
            { name: name.trim(), email: email.trim(), role, is_active: active },
            "PUT",
          )
        : apiRequest<AdminUser>("admin/users", {
            name: name.trim(),
            email: email.trim(),
            password,
            role,
          }),
    onSuccess: () => {
      setPassword("");
      void onSaved();
    },
  });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setValidation("");
        if (name.trim().length < 2 || name.trim().length > 120)
          return setValidation("Informe um nome entre 2 e 120 caracteres.");
        if (!isEmail(email) || email.trim().length > 255)
          return setValidation("Informe um e-mail válido.");
        if (!entry && (password.length < 12 || password.length > 128))
          return setValidation("Use uma senha entre 12 e 128 caracteres.");
        mutation.mutate();
      }}
    >
      <fieldset disabled={mutation.isPending} className="space-y-4">
        <Field
          label="Nome"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <Field
          label="E-mail"
          type="email"
          value={email}
          maxLength={255}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        {!entry && (
          <PasswordField
            label="Senha inicial"
            autoComplete="new-password"
            value={password}
            maxLength={128}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">
            Perfil de acesso
          </span>
          <select
            className={selectClass}
            value={role}
            disabled={self}
            onChange={(e) => setRole(e.target.value as AdminUser["role"])}
          >
            <option value="explorer">Explorador</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        {entry && (
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={active}
              disabled={self}
              onChange={(e) => setActive(e.target.checked)}
            />{" "}
            Conta ativa
          </label>
        )}
        {self && (
          <p className="text-xs text-muted-foreground">
            Você pode editar seus dados, mas não remover seu próprio acesso administrativo.
          </p>
        )}
        {(validation || mutation.error) && (
          <p role="alert" className="text-sm text-destructive">
            {validation || mutation.error?.message}
          </p>
        )}
        <Button type="submit" className="w-full">
          {mutation.isPending ? (
            <>
              <Loader2 className="animate-spin" /> Salvando…
            </>
          ) : entry ? (
            "Salvar alterações"
          ) : (
            "Criar usuário"
          )}
        </Button>
      </fieldset>
    </form>
  );
}
