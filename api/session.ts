import * as jose from "jose";
import * as cookie from "cookie";
import { Session, ErrorMessages } from "@contracts/constants";
import { env } from "./lib/env";
import { findUserByUnionId } from "./queries/users";

const JWT_ALG = "HS256";

export type SessionPayload = { unionId: string; clientId: string };

export async function signSessionToken(
  payload: SessionPayload,
): Promise<string> {
  const secret = new TextEncoder().encode(env.appSecret);
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(env.appSecret);
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
    });
    const { unionId, clientId } = payload;
    if (!unionId || !clientId) return null;
    return { unionId, clientId } as SessionPayload;
  } catch {
    return null;
  }
}

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    throw new Error(ErrorMessages.unauthenticated);
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw new Error("Invalid authentication token.");
  }
  const user = await findUserByUnionId(claim.unionId);
  if (!user) {
    throw new Error("User not found. Please re-login.");
  }
  return user;
}
