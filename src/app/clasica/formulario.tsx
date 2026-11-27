"use client";

import { Resultados } from "@/components/resultados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RespuestaBusqueda } from "@/lib/legislatura/buscar";
import type { OpcionCatalogo } from "@/lib/legislatura/tipos";
import { useState, type FormEvent, type ReactNode } from "react";

export function FormularioClasico() {
  const [numero, setNumero] = useState("");
  const [anio, setAnio] = useState("");
  const [sumario, setSumario] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [autor, setAutor] = useState("");
  const [anioParlamentario, setAnioParlamentario] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [opciones, setOpciones] = useState<OpcionCatalogo[]>([]);
  const [fase, setFase] = useState<"formulario" | "buscando" | "listo">("formulario");
  const [respuesta, setRespuesta] = useState<RespuestaBusqueda | null>(null);
  const [aviso, setAviso] = useState("");

  async function sugerirAutor(valor: string) {
    setAutor(valor);
    if (valor.trim().length < 3) {
      setOpciones([]);
      return;
    }
    const resultado = await fetch(`/api/catalogo?tipo=autores&q=${encodeURIComponent(valor.trim())}`);
    const cuerpo = (await resultado.json()) as { opciones?: OpcionCatalogo[] };
    setOpciones(cuerpo.opciones ?? []);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setFase("buscando");
    setAviso("");
    const resultado = await fetch("/api/buscar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero,
        anio,
        sumario,
        tipoId,
        autor,
        anioParlamentario,
        fechaDesde: isoAFecha(desde),
        fechaHasta: isoAFecha(hasta),
      }),
    });
    const cuerpo = (await resultado.json()) as RespuestaBusqueda;
    setRespuesta(cuerpo);
    if (cuerpo.error) setAviso(cuerpo.error);
    setFase("listo");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-medium text-white">Versión clásica</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#bdc1c6]">
        Sin agente. Cada campo se envía al registro como en el buscador oficial: si escribís una frase cotidiana en el sumario, la coincidencia puede ser nula.
      </p>
      <form onSubmit={(evento) => void enviar(evento)} className="mt-6 grid gap-4 sm:grid-cols-2">
        <Campo id="numero" etiqueta="Número de expediente">
          <Input id="numero" inputMode="numeric" value={numero} onChange={(evento) => setNumero(evento.target.value)} />
        </Campo>
        <Campo id="anio" etiqueta="Año del expediente">
          <Input id="anio" inputMode="numeric" value={anio} onChange={(evento) => setAnio(evento.target.value)} placeholder="2026" />
        </Campo>
        <Campo id="sumario" etiqueta="Palabras del sumario" ancho>
          <Input
            id="sumario"
            value={sumario}
            onChange={(evento) => setSumario(evento.target.value)}
            placeholder="La frase se busca tal cual"
          />
        </Campo>
        <Campo id="tipo" etiqueta="Tipo">
          <select
            id="tipo"
            value={tipoId}
            onChange={(evento) => setTipoId(evento.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Cualquiera</option>
            <option value="1">Ley</option>
            <option value="2">Resolución</option>
            <option value="3">Declaración</option>
          </select>
        </Campo>
        <Campo id="autor" etiqueta="Autor o autora">
          <Input id="autor" value={autor} onChange={(evento) => void sugerirAutor(evento.target.value)} placeholder="Apellido, al menos 3 letras" />
          {opciones.length > 0 ? (
            <ul className="mt-2 overflow-hidden rounded-lg border border-[#3c4043]">
              {opciones.slice(0, 6).map((opcion) => (
                <li key={opcion.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[#3c4043]"
                    onClick={() => {
                      setAutor(opcion.nombre);
                      setOpciones([]);
                    }}
                  >
                    {opcion.nombre}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Campo>
        <Campo id="anio-parlamentario" etiqueta="Año parlamentario">
          <Input id="anio-parlamentario" inputMode="numeric" value={anioParlamentario} onChange={(evento) => setAnioParlamentario(evento.target.value)} />
        </Campo>
        <Campo id="desde" etiqueta="Desde">
          <Input id="desde" type="date" value={desde} onChange={(evento) => setDesde(evento.target.value)} />
        </Campo>
        <Campo id="hasta" etiqueta="Hasta">
          <Input id="hasta" type="date" value={hasta} onChange={(evento) => setHasta(evento.target.value)} />
        </Campo>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={fase === "buscando"}>
            {fase === "buscando" ? "Buscando…" : "Buscar sin agente"}
          </Button>
        </div>
      </form>
      {aviso ? <p className="mt-4 text-sm text-[#fdd663]">{aviso}</p> : null}
      {fase === "listo" && respuesta ? (
        <div className="mt-8 -mx-4">
          <Resultados respuesta={respuesta} />
        </div>
      ) : null}
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  ancho = false,
  children,
}: {
  id: string;
  etiqueta: string;
  ancho?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={ancho ? "sm:col-span-2" : ""}>
      <Label htmlFor={id} className="mb-1.5 text-[#bdc1c6]">
        {etiqueta}
      </Label>
      {children}
    </div>
  );
}

function isoAFecha(iso: string): string {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("-");
  if (!anio || !mes || !dia) return "";
  return `${dia}/${mes}/${anio}`;
}
