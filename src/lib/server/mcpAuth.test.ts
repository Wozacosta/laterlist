// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { requireMcpToken } from "./mcpAuth";

function request(authorization?: string) {
  return new Request("https://www.laterlist.cc/api/mcp", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireMcpToken", () => {
  it("accepts the configured token", () => {
    vi.stubEnv("MCP_TOKEN", "right-token");

    expect(requireMcpToken(request("Bearer right-token"))).toBeNull();
  });

  it.each([
    ["no header", undefined],
    ["a wrong token", "Bearer wrong-token"],
    ["a prefix of the token", "Bearer right"],
    ["another scheme", "Basic right-token"],
  ])("refuses %s", (_label, header) => {
    vi.stubEnv("MCP_TOKEN", "right-token");

    const denied = requireMcpToken(request(header));

    expect(denied?.status).toBe(401);
    expect(denied?.headers.get("www-authenticate")).toBe("Bearer");
  });

  it("refuses everything when no token is configured", () => {
    vi.stubEnv("MCP_TOKEN", "");

    expect(requireMcpToken(request("Bearer "))?.status).toBe(401);
    expect(requireMcpToken(request("Bearer anything"))?.status).toBe(401);
  });
});
