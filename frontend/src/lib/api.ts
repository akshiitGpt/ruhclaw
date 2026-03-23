import type { Agent } from "@/types";

const BASE = "/api";

export async function createAgent(): Promise<Agent> {
  const res = await fetch(`${BASE}/agents`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to create agent");
  return res.json();
}

export async function listAgents(): Promise<Agent[]> {
  const res = await fetch(`${BASE}/agents`);
  if (!res.ok) throw new Error("Failed to list agents");
  const data = await res.json();
  return data.agents;
}

export async function getAgent(id: string): Promise<Agent> {
  const res = await fetch(`${BASE}/agents/${id}`);
  if (!res.ok) throw new Error("Failed to get agent");
  return res.json();
}

export function chatWsUrl(agentId: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/chat/${agentId}`;
}
