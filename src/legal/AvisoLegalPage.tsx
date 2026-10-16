"use client";

import type { ReactNode } from "react";
import { LegalShell } from "./LegalShell";
import { AvisoLegalContent } from "./AvisoLegalContent";
import { LEGAL_UPDATED_AT } from "./constants";

/** La pagina entera del Aviso Legal; la aplicacion solo pone su cabecera. */
export function AvisoLegalPage({ header }: { header: ReactNode }) {
  return (
    <LegalShell title="Aviso Legal" updatedAt={LEGAL_UPDATED_AT} header={header}>
      <AvisoLegalContent />
    </LegalShell>
  );
}
