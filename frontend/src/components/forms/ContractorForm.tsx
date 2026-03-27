"use client";

import { useState, type FormEvent } from "react";
import type { ContractorDetail, ContractorPayload } from "@/lib/api/contractors";

interface ContractorFormProps {
  initialData?: ContractorDetail;
  onSubmit: (data: ContractorPayload) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContractorForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ContractorFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [contactName, setContactName] = useState(initialData?.contactName ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [taxId, setTaxId] = useState(initialData?.taxId ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "El nombre es obligatorio";
    if (email.trim() && !EMAIL_RE.test(email.trim()))
      errs.email = "Formato de email invalido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      taxId: taxId.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  const inputClass =
    "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500";

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 2-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="sm:col-span-2">
          <label className={labelClass}>
            Nombre / Razon Social <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Ej: Constructora ABC S.A."
            disabled={isLoading}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Contact Name */}
        <div>
          <label className={labelClass}>Persona de Contacto</label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className={inputClass}
            placeholder="Ej: Juan Perez"
            disabled={isLoading}
          />
        </div>

        {/* Email */}
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="correo@ejemplo.com"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className={labelClass}>Telefono</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="+54 11 1234-5678"
            disabled={isLoading}
          />
        </div>

        {/* Tax ID / CUIT */}
        <div>
          <label className={labelClass}>CUIT</label>
          <input
            type="text"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            className={inputClass}
            placeholder="XX-XXXXXXXX-X"
            disabled={isLoading}
          />
        </div>

        {/* Address */}
        <div className="sm:col-span-2">
          <label className={labelClass}>Direccion</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
            placeholder="Calle, Ciudad, Provincia"
            disabled={isLoading}
          />
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className={labelClass}>Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Observaciones adicionales..."
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading && (
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {initialData ? "Guardar Cambios" : "Crear Contratista"}
        </button>
      </div>
    </form>
  );
}
