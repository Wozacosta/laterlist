import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { type NextRequest } from "next/server";
import { requireMcpToken } from "@/lib/server/mcpAuth";
import { createMcpServer } from "@/lib/server/mcpServer";

export async function POST(request: NextRequest) {
  const denied = requireMcpToken(request);
  if (denied) return denied;

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await createMcpServer().connect(transport);
  return transport.handleRequest(request);
}
