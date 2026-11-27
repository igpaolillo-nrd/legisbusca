import { FormularioClasico } from "@/app/clasica/formulario";
import { Marca } from "@/components/marca";
import { Pie } from "@/components/pie";
import { BUSCADOR_OFICIAL } from "@/lib/legislatura/tipos";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Versión clásica · LegisBusca",
  description: "Búsqueda de expedientes sin agente, con los campos del registro público.",
};

export default function ClasicaPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#202124] text-[#e8eaed]">
      <header className="flex items-center justify-between px-4 py-4">
        <Marca chica />
        <Link href="/" className="text-sm text-[#8ab4f8] hover:underline">
          Volver al agente
        </Link>
      </header>
      <main id="contenido" className="flex-1">
        <FormularioClasico />
        <p className="mx-auto max-w-3xl px-4 pb-8 text-sm text-[#9aa0a6]">
          El buscador oficial sigue en{" "}
          <a className="text-[#8ab4f8] hover:underline" href={BUSCADOR_OFICIAL}>
            parlamentaria.legislatura.gob.ar
          </a>
          .
        </p>
      </main>
      <Pie />
    </div>
  );
}
