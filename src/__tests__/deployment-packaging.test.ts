import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const readRoot = (relPath: string) =>
  readFileSync(path.join(root, relPath), "utf8");

describe("next.config.ts", () => {
  it("enables standalone output for the Docker runner stage", () => {
    const config = readRoot("next.config.ts");
    expect(config).toMatch(/output:\s*["']standalone["']/);
  });
});

describe("Dockerfile", () => {
  const dockerfile = () => readRoot("Dockerfile");

  it("is a multi-stage build with deps, build, and runner stages", () => {
    const content = dockerfile();
    expect(content).toMatch(/FROM node:22-alpine AS deps/i);
    expect(content).toMatch(/FROM node:22-alpine AS build/i);
    expect(content).toMatch(/FROM node:22-alpine AS runner/i);
  });

  it("copies the standalone build output, static assets, and public folder into the runner", () => {
    const content = dockerfile();
    expect(content).toMatch(/\.next\/standalone/);
    expect(content).toMatch(/\.next\/static/);
    expect(content).toMatch(/\bpublic\b/);
  });

  it("runs the app as a non-root user", () => {
    const content = dockerfile();
    expect(content).toMatch(/USER (?!root)\S+/);
  });

  it("exposes port 3000 and health-checks a tenant-independent endpoint", () => {
    const content = dockerfile();
    expect(content).toMatch(/EXPOSE 3000/);
    expect(content).toMatch(/HEALTHCHECK/);
    expect(content).toMatch(/127\.0\.0\.1:3000\/api\/health/);
    // Probing "/" cannot pass: that request's Host is the loopback address,
    // which maps to no tenant, so "/" 404s and the container is unhealthy
    // forever.
    expect(content).not.toMatch(/:3000\/\s*\|\|/);
    // And the probe must not target the NAME "localhost": /etc/hosts maps it
    // to ::1 as well as 127.0.0.1, BusyBox wget tries ::1 first, and the
    // Next server binds 0.0.0.0 (IPv4 only), so the probe is refused.
    // Verified in the built image: localhost exits 1, 127.0.0.1 exits 0.
    expect(content).not.toMatch(/HEALTHCHECK[\s\S]*localhost:3000/);
  });

  it("never bakes COMP_API_URL or TRUST_TENANTS as build-time ARG/ENV or NEXT_PUBLIC_ vars", () => {
    const content = dockerfile();
    expect(content).not.toMatch(/ARG\s+COMP_API_URL/);
    expect(content).not.toMatch(/ARG\s+TRUST_TENANTS/);
    expect(content).not.toMatch(/ENV\s+COMP_API_URL/);
    expect(content).not.toMatch(/ENV\s+TRUST_TENANTS/);
    expect(content).not.toMatch(/NEXT_PUBLIC_COMP_API_URL/);
    expect(content).not.toMatch(/NEXT_PUBLIC_TRUST_TENANTS/);
  });
});

describe("design tokens", () => {
  const sources = () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        // Skip tests: only shipped component code emits CSS, and this very
        // file names the bad form in a comment.
        if (entry.isDirectory() && entry.name !== "__tests__") walk(full);
        else if (entry.isFile() && /\.tsx?$/.test(entry.name)) files.push(full);
      }
    };
    walk(path.join(root, "src"));
    return files;
  };

  it("never references a css variable without var()", () => {
    // `text-[--tc-ink]` is invalid in Tailwind v4 and compiles to NOTHING,
    // so the element silently keeps its inherited colour. That shipped once:
    // in dark mode the prose colour resolved to near-white while the page
    // background utility never applied, leaving white text on white.
    const offenders = sources().filter((f) =>
      /\[--[a-z-]+\]/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});

describe(".github/workflows/docker-build.yml", () => {
  const workflow = () => readRoot(".github/workflows/docker-build.yml");

  it("triggers on push to main", () => {
    const content = workflow();
    expect(content).toMatch(/on:\s*\n\s*push:\s*\n\s*branches:\s*\n\s*-\s*main/);
  });

  it("grants packages: write permission", () => {
    const content = workflow();
    expect(content).toMatch(/permissions:\s*\n\s*(contents:\s*\w+\s*\n\s*)?packages:\s*write/);
  });

  it("builds and pushes to ghcr.io/johncarse/comp-trust-center with sha and latest tags", () => {
    const content = workflow();
    expect(content).toMatch(/docker\/build-push-action/);
    expect(content).toMatch(/ghcr\.io\/johncarse\/comp-trust-center:main-\$\{?\{?.*sha/);
    expect(content).toMatch(/ghcr\.io\/johncarse\/comp-trust-center:latest/);
  });

  it("uses GHA cache for build layers", () => {
    const content = workflow();
    expect(content).toMatch(/cache-from:\s*type=gha/);
    expect(content).toMatch(/cache-to:\s*type=gha/);
  });

  it("never bakes COMP_API_URL or TRUST_TENANTS as build args", () => {
    const content = workflow();
    expect(content).not.toMatch(/COMP_API_URL/);
    expect(content).not.toMatch(/TRUST_TENANTS/);
  });
});
