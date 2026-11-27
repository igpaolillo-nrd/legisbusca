import { BUSCADOR_OFICIAL } from "@/lib/legislatura/tipos";

export function Pie() {
  return (
    <footer className="px-4 py-6 text-center text-xs leading-5 text-[#9aa0a6]">
      <p>Prototipo académico del Programa de Formación en Inteligencia Artificial Aplicada al Trabajo Legislativo.</p>
      <p className="mt-1">
        No es un sitio oficial. Los expedientes salen de la{" "}
        <a className="underline decoration-[#5f6368] underline-offset-2 hover:text-white" href={BUSCADOR_OFICIAL}>
          consulta pública de la Legislatura de la CABA
        </a>
        .
      </p>
    </footer>
  );
}
