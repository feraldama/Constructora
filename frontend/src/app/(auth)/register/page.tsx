"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Building2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { registerApi } from "@/lib/api/auth";

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
};

const MIN_PASSWORD = 6;

function validateRequired(value: string, label: string): string | undefined {
  if (!value.trim()) return `Ingresá tu ${label}.`;
  return undefined;
}

function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Ingresá tu email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return "El email no es válido.";
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (!value) return "Ingresá una contraseña.";
  if (value.length < MIN_PASSWORD)
    return `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`;
  return undefined;
}

const inputBase =
  "block h-11 w-full rounded-lg border bg-card px-3 text-sm text-ink shadow-xs transition-colors duration-200 placeholder:text-muted-foreground focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/40";

function borderFor(hasError: boolean) {
  return hasError ? "border-destructive-strong" : "border-border-input";
}

export default function RegisterPage() {
  const { login } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const refs = {
    firstName: useRef<HTMLInputElement>(null),
    lastName: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
  };
  // Orden visual del form — el foco tras error debe seguir este orden, no el
  // de las claves del objeto
  const FIELD_ORDER: (keyof FieldErrors)[] = [
    "firstName",
    "lastName",
    "email",
    "password",
  ];

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((p) => (p[field] ? { ...p, [field]: undefined } : p));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const errors: FieldErrors = {
      firstName: validateRequired(firstName, "nombre"),
      lastName: validateRequired(lastName, "apellido"),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      // focus-management (WCAG): al primer campo inválido en orden visual
      const first = FIELD_ORDER.find((f) => errors[f]);
      if (first) refs[first].current?.focus();
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const res = await registerApi({ email, password, firstName, lastName });
      login(res.token, res.user);
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response: { data: { error: string } } }).response?.data
              ?.error
          : null;
      setError(msg || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
        <h2 className="text-base font-medium text-ink">Creá tu cuenta</h2>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Completá tus datos para empezar.
        </p>

        <div role="alert" aria-live="polite">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive-tint p-3 text-sm text-destructive-strong">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* grid-cols-1 sm: — la regla de responsive del proyecto prohíbe columnas
            fijas sin breakpoint; acá había grid-cols-2 pelado */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-ink"
              >
                Nombre
              </label>
              <input
                ref={refs.firstName}
                id="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  clearFieldError("firstName");
                }}
                onBlur={(e) =>
                  setFieldErrors((p) => ({
                    ...p,
                    firstName: validateRequired(e.target.value, "nombre"),
                  }))
                }
                aria-invalid={!!fieldErrors.firstName}
                aria-describedby={
                  fieldErrors.firstName ? "firstName-error" : undefined
                }
                className={`mt-1 ${inputBase} ${borderFor(!!fieldErrors.firstName)}`}
              />
              {fieldErrors.firstName && (
                <p
                  id="firstName-error"
                  role="alert"
                  className="mt-1.5 text-sm text-destructive-strong"
                >
                  {fieldErrors.firstName}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-ink"
              >
                Apellido
              </label>
              <input
                ref={refs.lastName}
                id="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  clearFieldError("lastName");
                }}
                onBlur={(e) =>
                  setFieldErrors((p) => ({
                    ...p,
                    lastName: validateRequired(e.target.value, "apellido"),
                  }))
                }
                aria-invalid={!!fieldErrors.lastName}
                aria-describedby={
                  fieldErrors.lastName ? "lastName-error" : undefined
                }
                className={`mt-1 ${inputBase} ${borderFor(!!fieldErrors.lastName)}`}
              />
              {fieldErrors.lastName && (
                <p
                  id="lastName-error"
                  role="alert"
                  className="mt-1.5 text-sm text-destructive-strong"
                >
                  {fieldErrors.lastName}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-ink"
            >
              Email
            </label>
            <input
              ref={refs.email}
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              onBlur={(e) =>
                setFieldErrors((p) => ({
                  ...p,
                  email: validateEmail(e.target.value),
                }))
              }
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              className={`mt-1 ${inputBase} ${borderFor(!!fieldErrors.email)}`}
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
            <div className="relative mt-1">
              <input
                ref={refs.password}
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                onBlur={(e) =>
                  setFieldErrors((p) => ({
                    ...p,
                    password: validatePassword(e.target.value),
                  }))
                }
                aria-invalid={!!fieldErrors.password}
                aria-describedby={
                  fieldErrors.password ? "password-error" : "password-hint"
                }
                className={`${inputBase} pr-12 ${borderFor(!!fieldErrors.password)}`}
                placeholder="••••••••"
              />
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
            {fieldErrors.password ? (
              <p
                id="password-error"
                role="alert"
                className="mt-1.5 text-sm text-destructive-strong"
              >
                {fieldErrors.password}
              </p>
            ) : (
              /* Helper text visible por defecto: el skill marca "progressive
               disclosure" pero pide no esconder el requisito hasta fallar */
              <p
                id="password-hint"
                className="mt-1.5 text-sm text-muted-foreground"
              >
                Al menos {MIN_PASSWORD} caracteres.
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
            {loading ? "Creando cuenta…" : "Registrarse"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link
          href="/login"
          className="rounded font-medium text-accent underline-offset-4 transition-colors duration-200 hover:text-accent-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Iniciá sesión
        </Link>
      </p>
    </>
  );
}
