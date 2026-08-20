/**
 * Liveness endpoint for container and Kubernetes probes.
 *
 * Deliberately independent of tenant resolution and of Comp's availability.
 * Probing `/` instead cannot work: the probe's Host header is `localhost`,
 * which no tenant maps to, so `/` correctly renders the 404 page and every
 * probe fails. This answers "is the server up", not "is Comp reachable" --
 * a portal that stays up while Comp is briefly down should not be restarted.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" });
}
