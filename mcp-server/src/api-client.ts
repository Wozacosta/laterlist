/**
 * HTTP client for the Laterlist REST API.
 * Used by the MCP server to proxy requests to the running Next.js app.
 */

export class LaterlistClient {
  private baseUrl: string;
  private apiKey: string | undefined;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      h["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return h;
  }

  private async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ ok: boolean; status: number; data: unknown }> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) {
      return { ok: true, status: 204, data: null };
    }

    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  }

  // Topics
  async listTopics(status?: string) {
    const qs = status ? `?status=${status}` : "";
    return this.request("GET", `/api/topics${qs}`);
  }

  async getTopic(id: string) {
    return this.request("GET", `/api/topics/${id}`);
  }

  async createTopic(name: string, priority?: number, estimatedSeconds?: number) {
    return this.request("POST", "/api/topics", { name, priority, estimatedSeconds });
  }

  async updateTopic(id: string, patch: Record<string, unknown>) {
    return this.request("PUT", `/api/topics/${id}`, patch);
  }

  async deleteTopic(id: string) {
    return this.request("DELETE", `/api/topics/${id}`);
  }

  // Subtasks
  async listSubtasks(topicId: string) {
    return this.request("GET", `/api/topics/${topicId}/subtasks`);
  }

  async createSubtask(
    topicId: string,
    title: string,
    opts?: { url?: string; category?: string; duration?: number; tags?: string[] }
  ) {
    return this.request("POST", `/api/topics/${topicId}/subtasks`, {
      title,
      ...opts,
    });
  }

  async removeSubtask(topicId: string, itemId: string) {
    return this.request("DELETE", `/api/topics/${topicId}/subtasks`, { itemId });
  }

  async markItem(itemId: string, status: "done" | "unread") {
    return this.request("PATCH", `/api/items/${itemId}`, { status });
  }

  // Time
  async logTime(topicId: string, seconds: number, source?: string) {
    return this.request("POST", `/api/topics/${topicId}/time`, { seconds, source });
  }

  async getTimeLogs(topicId: string, limit?: number) {
    const qs = limit ? `?limit=${limit}` : "";
    return this.request("GET", `/api/topics/${topicId}/timelogs${qs}`);
  }

  // Notes
  async getTopicNotes(topicId: string) {
    return this.request("GET", `/api/topics/${topicId}/notes`);
  }

  async setTopicNotes(topicId: string, notes: string) {
    return this.request("PUT", `/api/topics/${topicId}/notes`, { notes });
  }

  async getItemNotes(itemId: string) {
    return this.request("GET", `/api/items/${itemId}/notes`);
  }

  async setItemNotes(itemId: string, notes: string) {
    return this.request("PUT", `/api/items/${itemId}/notes`, { notes });
  }

  // Study Queue
  async getStudyQueue() {
    return this.request("GET", "/api/study-queue");
  }

  async markStudied(topicId: string) {
    return this.request("POST", `/api/study-queue/${topicId}/studied`);
  }

  // Search
  async search(query: string) {
    return this.request("GET", `/api/search?q=${encodeURIComponent(query)}`);
  }
}
