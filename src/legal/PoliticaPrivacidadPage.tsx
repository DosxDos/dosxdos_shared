"use client";

import type { ReactNode } from "react";
import { LegalShell } from "./LegalShell";
import { PoliticaPrivacidadContent } from "./PoliticaPrivacidadContent";
import { LEGAL_UPDATED_AT } from "./constants";

/** La pagina entera de la Politica de Privacidad; la aplicacion solo pone su cabecera. */
export function PoliticaPrivacidadPage({ header }: { header: ReactNode }) {
  return (
    <LegalShell title="Política de Privacidad" updatedAt={LEGAL_UPDATED_AT} header={header}>
      <PoliticaPrivacidadContent />
    </LegalShell>
  );
}
