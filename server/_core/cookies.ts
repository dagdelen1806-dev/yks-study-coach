import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // `SameSite=None` without `Secure` is invalid per spec — browsers drop
    // the cookie outright rather than setting it. The hosted/iframed Manus
    // environment is always https (secure=true), where None is required for
    // the cookie to survive cross-site delivery. A plain-http deployment
    // (local dev, this project standalone) is same-origin anyway, so Lax
    // works and — unlike None — is actually accepted without Secure. Without
    // this, both login and logout cookies were silently rejected on http,
    // which is exactly why logout appeared to do nothing.
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
