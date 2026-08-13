import { useEffect, useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";

import type { ServerRole } from "@/api/usersAPI";
import { cn } from "@/lib/utils";
import { ROLES } from "./roles";
import type { NewUser } from "./useUsers";

const EMPTY: NewUser = { email: "", password: "", role: "user", first_name: "", last_name: "" };

const MIN_PASSWORD = 8;

interface UserFormDialogProps {
  busy: boolean;
  onClose: () => void;
  onSubmit: (user: NewUser) => Promise<boolean>;
}

/**
 * Create a user account. Rendered only for administrators, and only while
 * open — mounting fresh each time is what resets the form, so no effect has to
 * clear it between openings.
 */
export default function UserFormDialog({ busy, onClose, onSubmit }: UserFormDialogProps) {
  const [form, setForm] = useState<NewUser>(EMPTY);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const emailError =
    !form.email.trim()
      ? "An email address is required."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
        ? "Enter a valid email address."
        : null;

  const passwordError =
    form.password.length < MIN_PASSWORD
      ? `Use at least ${MIN_PASSWORD} characters.`
      : null;

  const valid = !emailError && !passwordError;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    const ok = await onSubmit({
      ...form,
      email: form.email.trim(),
      first_name: form.first_name?.trim(),
      last_name: form.last_name?.trim(),
    });
    if (ok) onClose();
  };

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-user-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <h2 id="new-user-title" className="inline-flex items-center gap-2 text-base font-bold text-slate-900">
            <UserPlus size={17} className="text-blue-600" /> New user
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">First name</span>
              <input
                className={cn(field, "mt-1")}
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                autoComplete="given-name"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Last name</span>
              <input
                className={cn(field, "mt-1")}
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                autoComplete="family-name"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Email</span>
            <input
              type="email"
              className={cn(field, "mt-1", touched && emailError && "border-rose-500")}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="off"
            />
            {touched && emailError && (
              <span className="text-[11px] text-rose-600">{emailError}</span>
            )}
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Temporary password</span>
            <input
              type="password"
              className={cn(field, "mt-1", touched && passwordError && "border-rose-500")}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
            />
            {touched && passwordError ? (
              <span className="text-[11px] text-rose-600">{passwordError}</span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Share this with the user and ask them to change it after signing in.
              </span>
            )}
          </label>

          <fieldset>
            <legend className="text-xs font-medium text-slate-600 mb-1.5">Role</legend>
            <div className="space-y-1.5">
              {ROLES.map((r) => (
                <label
                  key={r.key}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition",
                    form.role === r.key
                      ? "border-blue-400 bg-blue-50/60"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    className="mt-1"
                    checked={form.role === r.key}
                    onChange={() => setForm((f) => ({ ...f, role: r.key as ServerRole }))}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800">{r.label}</span>
                    <span className="block text-[11px] text-slate-500">{r.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              Create user
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
