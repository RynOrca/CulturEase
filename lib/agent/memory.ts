/**
 * Client-side agent conversation memory.
 * Persists agent chat sessions to localStorage so users can
 * resume conversations across page navigations and browser sessions.
 */

import type { AgentMessage } from "./types";

export interface AgentSession {
  id: string;
  agentType: "coach" | "simulator" | "analyst" | "kit-builder";
  messages: AgentMessage[];
  createdAt: number;
  updatedAt: number;
}

const SESSIONS_KEY = "cultur-ease-agent-sessions";
const MAX_SESSIONS = 10;

export function loadSessions(): AgentSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: AgentSession[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function loadSession(id: string): AgentSession | null {
  return loadSessions().find((s) => s.id === id) ?? null;
}

export function saveSession(session: AgentSession): void {
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = { ...session, updatedAt: Date.now() };
  } else {
    sessions.unshift(session);
  }
  // Keep only the last N sessions
  if (sessions.length > MAX_SESSIONS) {
    sessions.length = MAX_SESSIONS;
  }
  saveSessions(sessions);
}

export function deleteSession(id: string): void {
  const sessions = loadSessions().filter((s) => s.id !== id);
  saveSessions(sessions);
}

export function generateSessionId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function clearAllSessions(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSIONS_KEY);
}
