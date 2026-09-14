import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/server/db/prisma";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return Response.json(
            { status: "ok" },
            { headers: { "cache-control": "no-store" } },
          );
        } catch {
          return Response.json(
            { status: "not_ready" },
            { status: 503, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
