"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Building2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { loginApi } from "@/lib/api/auth";

type FieldErrors = { email?: string; password?: string };

function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Ingresá tu email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return "El email no es válido.";
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (!value) return "Ingresá tu contraseña.";
  return undefined;
}

const inputBase =
  "block h-11 w-full rounded-lg border bg-card px-3 text-sm text-ink shadow-xs transition-colors duration-200 placeholder:text-muted-foreground focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/40";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const errors: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    if (errors.email || errors.password) {
      setFieldErrors(errors);
      // focus-management (WCAG): tras un submit fallido el foco va al primer
      // campo inválido, si no el usuario de teclado queda perdido arriba del form
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const res = await loginApi({ email, password });
      login(res.token, res.user);
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response: { data: { error: string } } }).response?.data
              ?.error
          : null;
      setError(msg || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Marca fuera de la tarjeta: da jerarquía y aire en vez de apilar todo
          dentro de una caja única */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent shadow-sm">
          <Building2 className="h-6 w-6 text-on-accent" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
          BuildControl
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión de obras de construcción
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-medium text-ink">Iniciá sesión</h2>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Ingresá tus datos para continuar.
        </p>

        {/* role=alert: los errores tienen que anunciarse, no solo pintarse de rojo */}
        <div role="alert" aria-live="polite">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive-tint p-3 text-sm text-destructive-strong">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-ink"
            >
              Email
            </label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((p) => ({ ...p, email: undefined }));
                }
              }}
              onBlur={(e) =>
                setFieldErrors((p) => ({
                  ...p,
                  email: validateEmail(e.target.value),
                }))
              }
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              className={`mt-1.5 ${inputBase} ${
                fieldErrors.email
                  ? "border-destructive-strong"
                  : "border-border-input"
              }`}
              placeholder="tu@email.com"
            />
            {fieldErrors.email && (
              <p
                id="email-error"
                role="alert"
                className="mt-1.5 text-sm text-destructive-strong"
              >
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-ink"
            >
              Contraseña
            </label>
            <div className="relative mt-1.5">
              <input
                ref={passwordRef}
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((p) => ({ ...p, password: undefined }));
                  }
                }}
                onBlur={(e) =>
                  setFieldErrors((p) => ({
                    ...p,
                    password: validatePassword(e.target.value),
                  }))
                }
                aria-invalid={!!fieldErrors.password}
                aria-describedby={
                  fieldErrors.password ? "password-error" : undefined
                }
                className={`${inputBase} pr-12 ${
                  fieldErrors.password
                    ? "border-destructive-strong"
                    : "border-border-input"
                }`}
                placeholder="••••••••"
              />
              {/* h-11 w-11: área táctil mínima de 44x44 que pide el skill */}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors duration-200 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p
                id="password-error"
                role="alert"
                className="mt-1.5 text-sm text-destructive-strong"
              >
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-on-accent shadow-sm transition-colors duration-200 hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <Loader2
                data-spinner
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            {loading ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link
          href="/register"
          className="rounded font-medium text-accent underline-offset-4 transition-colors duration-200 hover:text-accent-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Registrate
        </Link>
      </p>
    </>
  );
}
