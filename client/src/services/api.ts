import axios from "axios";
import type { User, Group, Session, VoteTally } from "../types";
import { useAuthStore } from "../store/auth.store";

const http = axios.create({ baseURL: "/api" });

// Inject auth token on every request
http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (data: {
      email: string;
      password: string;
      displayName: string;
    }) =>
      http
        .post<{ token: string; user: User }>("/auth/register", data)
        .then((r) => r.data),

    login: (data: { email: string; password: string }) =>
      http
        .post<{ token: string; user: User }>("/auth/login", data)
        .then((r) => r.data),

    me: () => http.get<{ user: User }>("/auth/me").then((r) => r.data.user),
  },

  // ─── Groups ─────────────────────────────────────────────────────────────────

  groups: {
    list: () =>
      http.get<{ groups: Group[] }>("/groups").then((r) => r.data.groups),

    get: (id: string) =>
      http.get<{ group: Group }>(`/groups/${id}`).then((r) => r.data.group),

    create: (name: string) =>
      http
        .post<{ group: Group }>("/groups", { name })
        .then((r) => r.data.group),

    join: (inviteCode: string) =>
      http
        .post<{ group: Group }>("/groups/join", { inviteCode })
        .then((r) => r.data.group),

    leave: (id: string) => http.delete(`/groups/${id}/leave`),
  },

  // ─── Sessions ────────────────────────────────────────────────────────────────

  sessions: {
    create: (data: {
      groupId: string;
      latitude: number;
      longitude: number;
      radiusMeters?: number;
    }) =>
      http
        .post<{
          session: Session;
          cards: Session["restaurants"][number]["restaurant"][];
        }>("/sessions", data)
        .then((r) => r.data),

    get: (id: string) =>
      http
        .get<{ session: Session }>(`/sessions/${id}`)
        .then((r) => r.data.session),

    vote: (id: string, restaurantId: string, direction: "LEFT" | "RIGHT") =>
      http
        .post<{
          yesCount: number;
        }>(`/sessions/${id}/vote`, { restaurantId, direction })
        .then((r) => r.data),

    tally: (id: string) =>
      http
        .get<{ tally: VoteTally[] }>(`/sessions/${id}/tally`)
        .then((r) => r.data.tally),
  },
};
