"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RespuestaBusqueda } from "@/lib/legislatura/buscar";
import { ExternalLink, Volume2 } from "lucide-react";

export function Resultados({
  respuesta,
  notaOrigen,
}: {
  respuesta: RespuestaBusqueda;
  notaOrigen?: string;
}) {
  const { interpretacion, literal, resultados, advertencias, autorResuelto, comisionResuelta, fuente, duracionMs } = respuesta;
  const textoParaEscuchar = [
    notaOrigen,
    interpretacion.resumen,
    ...advertencias,
    ...resultados.slice(0, 3).map((item) => `Expediente ${item.numero}. ${item.sumario}`),
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-10" aria-live="polite">
      <div className="rounded-2xl border border-[#3c4043] bg-[#303134] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-[#9aa0a6] uppercase">Cómo lo entendí</p>
            <h2 className="mt-1 text-base font-medium text-white">{interpretacion.resumen}</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-[#5f6368] bg-transparent text-[#e8eaed] hover:bg-[#3c4043]"
            onClick={() => hablar(textoParaEscuchar)}
          >
            <Volume2 />
            Escuchar
          </Button>
        </div>
        {notaOrigen ? <p className="mt-3 text-sm text-[#bdc1c6]">{notaOrigen}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">{etiquetaFuente(fuente)}</Badge>
          {interpretacion.termino ? <Badge variant="secondary">Sumario: {interpretacion.termino}</Badge> : null}
          {interpretacion.tipo ? <Badge variant="secondary">{interpretacion.tipo.nombre}</Badge> : null}
          {interpretacion.anio ? <Badge variant="secondary">Año {interpretacion.anio}</Badge> : null}
          {autorResuelto ? <Badge variant="secondary">Autor: {autorResuelto.nombre}</Badge> : null}
          {comisionResuelta ? <Badge variant="secondary">Comisión: {comisionResuelta.nombre}</Badge> : null}
          {interpretacion.estado ? <Badge variant="secondary">{interpretacion.estado.nombre}</Badge> : null}
          {interpretacion.expediente ? (
            <Badge variant="secondary">
              {interpretacion.expediente.numero}-D-{interpretacion.expediente.anio}
            </Badge>
          ) : null}
          {interpretacion.leyNumero ? <Badge variant="secondary">Ley {interpretacion.leyNumero}</Badge> : null}
        </div>
        {literal.consultada ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Comparacion
              titulo="Frase completa"
              detalle="Así, sin traducir"
              valor={literal.topeAlcanzado ? `al menos ${literal.cantidad}` : String(literal.cantidad)}
            />
            <Comparacion
              titulo="Búsqueda dirigida"
              detalle="Con los filtros del agente"
              valor={resultados.length >= 12 ? "al menos 12" : String(resultados.length)}
            />
          </div>
        ) : null}
        {advertencias.length > 0 ? (
          <ul className="mt-4 space-y-1 text-sm text-[#bdc1c6]">
            {advertencias.map((nota) => (
              <li key={nota}>{nota}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-xs text-[#9aa0a6]">Registro consultado en {(duracionMs / 1000).toFixed(1)} s.</p>
      </div>

      {resultados.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#5f6368] px-4 py-8 text-center text-sm text-[#bdc1c6]">
          El registro no devolvió expedientes con esos filtros. Probá otra formulación o la versión clásica.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {resultados.map((item) => (
            <li key={item.id || item.numero} className="rounded-2xl border border-[#3c4043] bg-[#292a2d] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-white">{item.numero || "Sin número"}</p>
                {item.tipo ? <Badge variant="outline">{item.tipo}</Badge> : null}
                {item.sancionado ? <Badge>Sancionado</Badge> : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-[#e8eaed]">{item.sumario || "El registro no trajo sumario."}</p>
              <p className="mt-2 text-xs leading-5 text-[#9aa0a6]">
                {[item.autor && `Autoría: ${item.autor}`, item.ubicacion, item.estado, item.inicio && `Inicio ${item.inicio}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {item.coautores ? <p className="mt-1 text-xs text-[#9aa0a6]">Coautoría: {item.coautores}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#5f6368] bg-transparent text-[#e8eaed] hover:bg-[#3c4043]"
                  render={<a href={item.urlOficial} target="_blank" rel="noreferrer" />}
                >
                  <ExternalLink />
                  Ver en el registro
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-[#bdc1c6] hover:bg-[#3c4043] hover:text-white"
                  onClick={() => hablar(`Expediente ${item.numero}. ${item.sumario}`)}
                >
                  <Volume2 />
                  Escuchar sumario
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Comparacion({ titulo, detalle, valor }: { titulo: string; detalle: string; valor: string }) {
  return (
    <div className="rounded-xl bg-[#202124] px-3 py-3">
      <p className="text-xs text-[#9aa0a6]">{titulo}</p>
      <p className="mt-1 text-2xl font-medium text-white">{valor}</p>
      <p className="text-xs text-[#9aa0a6]">{detalle}</p>
    </div>
  );
}

function etiquetaFuente(fuente: RespuestaBusqueda["fuente"]): string {
  if (fuente === "modelo") return "Intérprete + modelo";
  if (fuente === "literal") return "Modo literal";
  if (fuente === "clasica") return "Versión clásica";
  return "Intérprete";
}

function hablar(texto: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const frase = new SpeechSynthesisUtterance(texto);
  frase.lang = "es-AR";
  window.speechSynthesis.speak(frase);
}
