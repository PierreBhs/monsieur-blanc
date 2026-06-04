import { describe, expect, it, vi } from "vitest";
import { canUseServiceWorker, registerServiceWorker } from "../../src/pwa";

describe("canUseServiceWorker", () => {
  it("detects service worker support", () => {
    expect(canUseServiceWorker({ serviceWorker: { register: vi.fn() } })).toBe(true);
    expect(canUseServiceWorker({})).toBe(false);
  });
});

describe("registerServiceWorker", () => {
  it("registers on window load when supported", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    const addLoadListener = vi.fn((_type: "load", listener: () => void) => listener());

    registerServiceWorker({ serviceWorker: { register } }, addLoadListener);

    expect(addLoadListener).toHaveBeenCalledWith("load", expect.any(Function));
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("does not attach a listener without service worker support", () => {
    const addLoadListener = vi.fn();

    registerServiceWorker({}, addLoadListener);

    expect(addLoadListener).not.toHaveBeenCalled();
  });
});
