"use client";

import Combobox from "@/components/ui/Combobox";
import { PARAGUAY_BANKS } from "@/lib/constants/banks";
import type { PaymentMethod } from "@/types";

/** Métodos en los que tiene sentido pedir el banco. */
export function paymentMethodRequiresBank(
  method: PaymentMethod | "" | null | undefined
): boolean {
  return method === "BANK_TRANSFER" || method === "CHECK";
}

interface Props {
  method: PaymentMethod | "" | null | undefined;
  value: string;
  onChange: (v: string) => void;
  /** Si false, no se renderiza nada cuando el método no lo requiere. Default true. */
  hideWhenNotRequired?: boolean;
}

/**
 * Campo "Banco" que aparece sólo cuando el método de pago es BANK_TRANSFER o
 * CHECK. Combobox con sugerencias de bancos paraguayos y entrada libre.
 */
export default function BankField({
  method,
  value,
  onChange,
  hideWhenNotRequired = true,
}: Props) {
  const required = paymentMethodRequiresBank(method);
  if (!required && hideWhenNotRequired) return null;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {method === "CHECK" ? "Banco del cheque" : "Banco origen"}{" "}
        {required && <span className="text-red-500">*</span>}
      </label>
      <Combobox
        value={value}
        onChange={onChange}
        options={PARAGUAY_BANKS}
        placeholder="Elegí o escribí el banco"
        createLabel={(q) => `Usar «${q}»`}
      />
    </div>
  );
}
