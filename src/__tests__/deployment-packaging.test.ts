import { readFileSync } from "node:fs";
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
    expect(content).toMatch(/localhost:3000\/api\/health/);
    // Probing "/" cannot pass: the probe's Host is localhost, which maps to no
    // tenant, so "/" 404s and the container is unhealthy forever.
    expect(content).not.toMatch(/localhost:3000\/\s*\|\|/);
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
