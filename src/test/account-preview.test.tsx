import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LoginModal } from "@/components/login-modal";
import { closeLogin, openLogin, openRegister } from "@/lib/login-modal";

afterEach(() => { cleanup(); closeLogin(); vi.restoreAllMocks(); });

it("does not send or store credentials when login is submitted", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const storageSpy = vi.spyOn(Storage.prototype, "setItem");
  openLogin();
  render(<LoginModal />);
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "sample-preview" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "sample-only" } });
  fireEvent.submit(screen.getByLabelText("Password").closest("form") as HTMLFormElement);
  expect(screen.getByRole("status")).toBeTruthy();
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(storageSpy).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Back to form" }));
  expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
});

it("does not send or store registration data", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const storageSpy = vi.spyOn(Storage.prototype, "setItem");
  openRegister();
  render(<LoginModal />);
  fireEvent.change(screen.getByLabelText("Name", { exact: true }), { target: { value: "Sample" } });
  fireEvent.change(screen.getByLabelText("Surname"), { target: { value: "Preview" } });
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "sample-preview" } });
  fireEvent.change(screen.getByLabelText("Mobile/GSM"), { target: { value: "700000000" } });
  fireEvent.change(screen.getByLabelText("Birth day"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Birth month"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Birth year"), { target: { value: "1990" } });
  fireEvent.change(screen.getByLabelText("NIN number"), { target: { value: "SAMPLE-ONLY" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Confirm registration" }));
  expect(screen.getByRole("status")).toBeTruthy();
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(storageSpy).not.toHaveBeenCalled();
});