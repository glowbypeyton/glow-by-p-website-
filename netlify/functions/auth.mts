/**
 * Authentication endpoints for the client portal and admin portal.
 *
 * All Identity calls happen here on the server so the static pages never need
 * a bundler or an auth SDK in the browser — they just POST to these routes and
 * the Netlify runtime sets the `nf_jwt` session cookie.
 */
import type { Config } from "@netlify/functions";
import {
  AuthError,
  MissingIdentityError,
  acceptInvite,
  confirmEmail,
  getUser,
  login,
  logout,
  recoverPassword,
  requestPasswordRecovery,
  signup,
  updateUser,
  verifyRequestOrigin,
} from "@netlify/identity";
import { badRequest, ensureClient, fail, isAdminUser, json, text } from "../../lib/portal.js";

interface Body {
  [key: string]: unknown;
}

async function readBody(req: Request): Promise<Body> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Body) : {};
  } catch {
    return {};
  }
}

function authFailure(error: unknown) {
  if (error instanceof MissingIdentityError) {
    return fail(
      "Accounts are not switched on for this site yet. Enable Identity in the Netlify project settings.",
      503,
    );
  }
  if (error instanceof AuthError) {
    switch (error.status) {
      case 401:
        return fail("That email and password combination did not match.", 401);
      case 403:
        return fail("New accounts are not being accepted right now.", 403);
      case 404:
        // Reported as 401 rather than 404 so Netlify's static 404 handling
        // cannot replace this JSON body on the way back to the browser.
        return fail("We could not find an account with that email.", 401);
      case 422:
        return fail("Please check the details entered and try again.", 422);
      default:
        return fail(error.message || "Something went wrong. Please try again.", error.status || 400);
    }
  }
  return fail("Something went wrong. Please try again.", 500);
}

async function sessionPayload() {
  const user = await getUser();
  if (!user) return { signedIn: false as const };

  const isAdmin = isAdminUser(user);
  const client = await ensureClient(user);
  return {
    signedIn: true as const,
    isAdmin,
    email: user.email || "",
    name: client.fullName || user.name || "",
    clientId: client.id,
  };
}

export default async (req: Request, context: { params: { action?: string } }) => {
  const action = context.params.action || "";

  if (action === "me") {
    if (req.method !== "GET") return fail("Method not allowed", 405);
    return json(await sessionPayload());
  }

  if (req.method !== "POST") return fail("Method not allowed", 405);

  // CSRF guard for every state-changing auth route.
  try {
    verifyRequestOrigin(req);
  } catch {
    return fail("Request blocked. Please reload the page and try again.", 403);
  }

  const body = await readBody(req);
  const email = text(body.email, 320).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  try {
    switch (action) {
      case "signup": {
        if (!email || !password) return badRequest("Email and password are both required.");
        if (password.length < 8) {
          return badRequest("Please choose a password with at least 8 characters.");
        }
        const user = await signup(email, password, {
          full_name: text(body.fullName, 120),
          phone: text(body.phone, 40),
        });
        // Create the client record immediately so the studio sees new signups.
        await ensureClient(user);
        return json({
          confirmed: Boolean(user.confirmedAt),
          session: await sessionPayload(),
        });
      }

      case "login": {
        if (!email || !password) return badRequest("Email and password are both required.");
        const user = await login(email, password);
        await ensureClient(user);
        return json({ session: await sessionPayload() });
      }

      case "logout": {
        await logout();
        return json({ signedOut: true });
      }

      case "recover": {
        if (!email) return badRequest("Please enter the email on your account.");
        // Always the same answer, even when the address has no account, so the
        // form cannot be used to work out who is registered.
        try {
          await requestPasswordRecovery(email);
        } catch {
          /* swallowed on purpose */
        }
        return json({ sent: true });
      }

      case "reset": {
        const token = text(body.token, 512);
        if (!token || password.length < 8) {
          return badRequest("Please choose a password with at least 8 characters.");
        }
        const user = await recoverPassword(token, password);
        await ensureClient(user);
        return json({ session: await sessionPayload() });
      }

      case "invite": {
        // Accepting an invite sent from the Netlify Identity dashboard.
        const token = text(body.token, 512);
        if (!token || password.length < 8) {
          return badRequest("Please choose a password with at least 8 characters.");
        }
        const user = await acceptInvite(token, password);
        await ensureClient(user);
        return json({ session: await sessionPayload() });
      }

      case "confirm": {
        const token = text(body.token, 512);
        if (!token) return badRequest("That confirmation link is missing its token.");
        const user = await confirmEmail(token);
        await ensureClient(user);
        return json({ session: await sessionPayload() });
      }

      case "password": {
        // Changing a password from inside the portal.
        const user = await getUser();
        if (!user) return fail("Please sign in to continue.", 401);
        if (password.length < 8) {
          return badRequest("Please choose a password with at least 8 characters.");
        }
        await updateUser({ password });
        return json({ updated: true });
      }

      default:
        return fail("Unknown auth action.", 400);
    }
  } catch (error) {
    return authFailure(error);
  }
};

export const config: Config = {
  path: "/api/auth/:action",
};
