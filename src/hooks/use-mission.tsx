import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { missionLines, missionTotal, type MissionLine, type MissionSelection } from "@/data/catalog";
import { TERRITORIES } from "@/data/territories";
import { authRequest, AuthError, type AuthUser } from "@/lib/auth-api";

export type DemoUser = AuthUser;
export interface DemoReservation { protocol: string; date: string; lines: MissionLine[]; total: number }

const EMPTY: MissionSelection = { tripId: null, stayId: null, nights: 3, experienceIds: [], territoryId: null };
const LS_KEY = "ares-frontier:mission:v1";

interface MissionState {
  loaded: boolean;
  user: DemoUser | null;
  authError: string | null;
  refreshUser: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  enterGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  mission: MissionSelection;
  setTrip: (id: string | null) => void;
  setStay: (id: string | null, nights?: number) => void;
  setNights: (n: number) => void;
  toggleExperience: (id: string) => void;
  setTerritory: (id: string | null) => void;
  lines: MissionLine[];
  total: number;
  confirm: () => DemoReservation | null;
  reservations: DemoReservation[];
  history: { at: string; text: string }[];
}

const Ctx = createContext<MissionState | null>(null);
const territoryInfo = (id: string) => {
  const t = TERRITORIES.find((x) => x.id === id);
  return t ? { label: `${t.region} · ${t.lot}`, priceMC: t.priceMC } : undefined;
};

export function MissionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [mission, setMission] = useState<MissionSelection>(EMPTY);
  const [reservations, setReservations] = useState<DemoReservation[]>([]);
  const [history, setHistory] = useState<{ at: string; text: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let guest = false;
    try {
      const d = JSON.parse(localStorage.getItem(LS_KEY) ?? "null");
      if (d) {
        guest = d.user?.guest === true;
        setMission({ ...EMPTY, ...d.mission });
        setReservations(d.reservations ?? []);
        setHistory(d.history ?? []);
      }
    } catch { /* ignore */ }
    authRequest<AuthUser>("me").then((u) => {
      if (active) setUser(u);
    }).catch((error: unknown) => {
      if (!active) return;
      if (guest) setUser({ name: "Visitante", email: "", guest: true });
      if (!(error instanceof AuthError && error.status === 401)) {
        setAuthError(error instanceof Error ? error.message : "Não foi possível verificar a sessão.");
      }
    }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(LS_KEY, JSON.stringify({ user: user?.guest ? user : null, mission, reservations, history }));
  }, [user, mission, reservations, history, loaded]);

  const log = useCallback((text: string) => setHistory((h) => [{ at: new Date().toISOString(), text }, ...h].slice(0, 30)), []);

  const value = useMemo<MissionState>(() => {
    const lines = missionLines(mission, territoryInfo);
    return {
      loaded,
      user,
      authError,
      refreshUser: async () => { setUser(await authRequest<AuthUser>("me")); },
      signIn: async (email, password) => {
        const u = await authRequest<AuthUser>("login", { email, password });
        setUser(u); setAuthError(null); log("Entrou na central");
      },
      register: async (name, email, password) => {
        const u = await authRequest<AuthUser>("register", { name, email, password });
        setUser(u); setAuthError(null); log("Criou sua conta");
      },
      enterGuest: async () => {
        if (user && !user.guest) await authRequest<void>("logout", {});
        setUser({ name: "Visitante", email: "", guest: true }); setAuthError(null);
        log("Entrou como visitante");
      },
      signOut: async () => {
        if (!user?.guest) await authRequest<void>("logout", {});
        setUser(null); setAuthError(null); toast("Sessão encerrada");
      },
      mission,
      setTrip: (id) => { setMission((m) => ({ ...m, tripId: id })); if (id) { toast("Viagem adicionada à missão"); log(`Viagem adicionada: ${id}`); } },
      setStay: (id, nights) => { setMission((m) => ({ ...m, stayId: id, nights: nights ?? m.nights })); if (id) { toast("Hospedagem adicionada à missão"); log(`Hospedagem adicionada: ${id}`); } },
      setNights: (n) => setMission((m) => ({ ...m, nights: Math.min(60, Math.max(1, Math.floor(n) || 1)) })),
      toggleExperience: (id) => setMission((m) => {
        const has = m.experienceIds.includes(id);
        toast(has ? "Experiência removida" : "Experiência adicionada à missão");
        return { ...m, experienceIds: has ? m.experienceIds.filter((x) => x !== id) : [...m.experienceIds, id] };
      }),
      setTerritory: (id) => { setMission((m) => ({ ...m, territoryId: id })); if (id) { toast("Território adicionado à missão"); log(`Território adicionado: ${id}`); } },
      lines,
      total: missionTotal(lines),
      confirm: () => {
        if (!lines.length) return null;
        const r: DemoReservation = {
          protocol: `AF-SIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          date: new Date().toISOString(), lines, total: missionTotal(lines),
        };
        setReservations((rs) => [r, ...rs]);
        setMission(EMPTY);
        log(`Simulação concluída: ${r.protocol}`);
        return r;
      },
      reservations,
      history,
    };
  }, [loaded, user, authError, mission, reservations, history, log]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMission() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMission must be used inside MissionProvider");
  return c;
}
