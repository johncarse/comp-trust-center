import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/lib/markdown";

describe("Markdown", () => {
  it("renders headings, paragraphs, bullets and bold", () => {
    const { container } = render(
      <Markdown content={"## Practices\n\nWe do **things**.\n\n- one\n- two"} />
    );
    expect(screen.getByRole("heading", { name: "Practices" })).toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("strong")?.textContent).toBe("things");
  });

  it("renders single-asterisk emphasis without eating bold", () => {
    const { container } = render(
      <Markdown content={"a *stress* and **strong** together"} />
    );
    expect(container.querySelector("em")?.textContent).toBe("stress");
    expect(container.querySelector("strong")?.textContent).toBe("strong");
  });

  it("links http and mailto targets", () => {
    render(<Markdown content={"[mail](mailto:a@b.com) and [site](https://x.test)"} />);
    expect(screen.getByRole("link", { name: "mail" })).toHaveAttribute(
      "href",
      "mailto:a@b.com"
    );
    expect(screen.getByRole("link", { name: "site" })).toHaveAttribute(
      "href",
      "https://x.test"
    );
  });

  it("refuses a javascript: url, rendering the label as inert text", () => {
    render(<Markdown content={"[click](javascript:alert(1))"} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("click")).toBeInTheDocument();
  });

  it("never emits raw html from the source content", () => {
    const { container } = render(
      <Markdown content={'<img src=x onerror="alert(1)"> plain'} />
    );
    // The markup must survive as literal text, not become a node.
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img");
  });
});
