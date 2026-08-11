import type { Request } from "express";

export interface RequestMetadata {
  ipAddress: string;
  userAgent: string;
}

export function getRequestMetadata(request: Request): RequestMetadata {
  const forwardedFor = request.headers["x-forwarded-for"];
  const ipAddress =
    (typeof forwardedFor === "string" ? forwardedFor.split(",")[0]?.trim() : undefined) ??
    request.ip ??
    request.socket.remoteAddress ??
    "unknown";

  const userAgent = request.headers["user-agent"] ?? "unknown";

  return { ipAddress, userAgent };
}
