import bcrypt from "bcryptjs";
import * as cookie from "cookie";
import { randomBytes } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { signSessionToken } from "./session";
import {
  createUser,
  findUserByEmail,
  touchLastSignIn,
} from "./queries/users";
import type { TrpcContext } from "./context";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(128),
});

function setSessionCookie(ctx: TrpcContext, unionId: string) {
  const opts = getSessionCookieOptions(ctx.req.headers);
  return signSessionToken({ unionId, clientId: "password" }).then((token) =>
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, token, {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: Session.maxAgeMs / 1000,
      }),
    ),
  );
}

export const authRouter = createRouter({
  register: publicQuery
    .input(
      credentialsSchema.extend({
        name: z.string().trim().min(2).max(255),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await findUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists.",
        });
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = await createUser({
        unionId: `local:${randomBytes(16).toString("hex")}`,
        name: input.name,
        email: input.email,
        passwordHash,
        role: "user",
      });
      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      await setSessionCookie(ctx, user.unionId);
      return user;
    }),

  login: publicQuery
    .input(credentialsSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await findUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }
      const ok = await bcrypt.compare(input.password, user.passwordHash);
      if (!ok) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }
      await touchLastSignIn(user.id);
      await setSessionCookie(ctx, user.unionId);
      return user;
    }),

  me: authedQuery.query((opts) => opts.ctx.user),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
