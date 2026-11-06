import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, X } from "lucide-react";

import { closeLogin, useLoginOpen, validateLogin } from "@/lib/login-modal";

const OFFICIAL = "https://www.fortebet.ug/";

/**
 * Floating login window. It only checks the form here; it never sends the typed
 * username or password anywhere. Signing in to a real Fortebet account has to
 * happen on Fortebet's own site, so submitting points the visitor there.
 */
export function LoginModal() {
  const open = useLoginOpen();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setUsername("");
    setPassword("");
    setShow(false);
    setErrors({});
    setSubmitted(false);
    const t = setTimeout(() => firstField.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeLogin();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateLogin(username, password);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      setPassword(""); // never keep the typed password around
      setSubmitted(true);
    }
  };

  const field =
    "box-border h-11 w-full rounded-md border border-white/15 bg-black/25 px-3 text-[15px] text-site-import-foreground outline-none placeholder:text-site-import-muted-foreground focus:border-brand-500";

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[8vh]"
      onMouseDown={(e) => e.target === e.currentTarget && closeLogin()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="relative w-full max-w-[400px] rounded-lg border border-white/10 bg-site-import-background shadow-2xl"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={closeLogin}
          style={{ background: "transparent", border: 0 }}
          className="absolute right-3 top-3 grid border-0 bg-transparent size-8 cursor-pointer place-items-center rounded text-site-import-muted-foreground hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="rounded-t-lg bg-brand-600 px-6 py-4">
          <h2 id="login-title" className="text-lg font-black uppercase tracking-wide text-white">
            Login
          </h2>
        </div>

        {submitted ? (
          <div className="space-y-4 p-6 text-center">
            <h3 className="text-base font-bold text-site-import-foreground">Sign in on Fortebet</h3>
            <p className="text-sm leading-relaxed text-site-import-muted-foreground">
              This site shows live odds and games, but it is not connected to Fortebet accounts, so nothing you typed was
              sent or saved. To use your account, bets and balance, sign in on the official Fortebet website.
            </p>
            <a
              href={OFFICIAL}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-11 rounded-md bg-brand-500 text-center text-sm font-black uppercase leading-[44px] text-white hover:bg-brand-700"
            >
              Open fortebet.ug
            </a>
            <button
              type="button"
              onClick={closeLogin}
              className="cursor-pointer text-sm text-site-import-muted-foreground underline hover:text-white"
            >
              Keep browsing
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4 p-6">
            <div>
              <label htmlFor="login-user" className="mb-1.5 block text-xs font-bold uppercase text-site-import-muted-foreground">
                Phone number or username
              </label>
              <input
                id="login-user"
                ref={firstField}
                className={field}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                placeholder="07XXXXXXXX"
                aria-invalid={!!errors.username}
                style={{ boxSizing: "border-box", width: "100%" }}
              />
              {errors.username && <p className="mt-1 text-xs text-red-400">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="login-pass" className="mb-1.5 block text-xs font-bold uppercase text-site-import-muted-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-pass"
                  className={field + " pr-11"}
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                  placeholder="Password"
                  aria-invalid={!!errors.password}
                  style={{ boxSizing: "border-box", width: "100%" }}
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow((s) => !s)}
                  style={{ background: "transparent", border: 0 }}
                  className="absolute right-2 top-1/2 grid border-0 bg-transparent size-8 -translate-y-1/2 cursor-pointer place-items-center text-site-import-muted-foreground hover:text-white"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            <button
              type="submit"
              style={{ border: 0 }}
              className="h-11 w-full cursor-pointer rounded-md border-0 bg-brand-500 text-sm font-black uppercase text-white hover:bg-brand-700"
            >
              Login
            </button>

            <div className="flex items-center justify-between text-sm">
              <a href={OFFICIAL} target="_blank" rel="noopener noreferrer" className="text-site-import-muted-foreground underline hover:text-white">
                Forgot password?
              </a>
              <a href={OFFICIAL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-500)" }} className="font-bold hover:underline">
                Register
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
