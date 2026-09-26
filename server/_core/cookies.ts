import type { CookieOptions, Request } from "express";

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
  return {
    httpOnly: true,
    path: "/",
    // Uygulama ve API aynı kökende (ör. yks-study-coach.vercel.app) çalışır;
    // çerezin başka sitelerden gelen isteklere eklenmesine gerek yok. `Lax`
    // CSRF'e karşı da koruma sağlar ve http'de (yerel geliştirme) de kabul edilir.
    sameSite: "lax",
    secure: isSecureRequest(req),
  };
}
