"use client";

import { Marca } from "@/components/marca";
import { Pie } from "@/components/pie";
import { Resultados } from "@/components/resultados";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { RespuestaBusqueda } from "@/lib/legislatura/buscar";
import { cn } from "@/lib/utils";
import { Camera, LoaderCircle, Mic, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const EJEMPLOS = [
  "No puedo pagar el alquiler",
  "Proyecto de ley de transporte de este año",
  "Declaraciones de Grillo sobre teatro",
  "Expediente 3509-D-2026",
];

type Reconocimiento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((evento: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((evento: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function Consulta({ consultaInicial }: { consultaInicial: string }) {
  const [texto, setTexto] = useState(consultaInicial);
  const [agente, setAgente] = useState(true);
  const [fase, setFase] = useState<"inicio" | "buscando" | "listo">(consultaInicial ? "buscando" : "inicio");
  const [respuesta, setRespuesta] = useState<RespuestaBusqueda | null>(null);
  const [aviso, setAviso] = useState("");
  const [notaOrigen, setNotaOrigen] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [leyendo, setLeyendo] = useState<number | null>(null);
  const [ayuda, setAyuda] = useState(false);
  const [vision, setVision] = useState(false);
  const [imagenPendiente, setImagenPendiente] = useState<{ datos: string; mime: string; vista: string } | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const reconocimiento = useRef<Reconocimiento | null>(null);
  const buscarAlCortar = useRef(false);
  const ultima = useRef("");
  const aborto = useRef<AbortController | null>(null);

  useEffect(() => {
    void fetch("/api/vision")
      .then((resultado) => resultado.json())
      .then((cuerpo: { disponible?: boolean }) => setVision(Boolean(cuerpo.disponible)))
      .catch(() => setVision(false));
  }, []);

  useEffect(() => {
    if (!consultaInicial || ultima.current === consultaInicial) return;
    ultima.current = consultaInicial;
    void ejecutar(consultaInicial, true);
    // La búsqueda inicial sale de la URL compartida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaInicial]);

  async function ejecutar(consulta: string, conAgente: boolean) {
    const limpia = consulta.replace(/\s+/g, " ").trim();
    if (!limpia) {
      setAviso("Escribí, dictá o adjuntá algo para buscar.");
      return;
    }
    ultima.current = limpia;
    setTexto(limpia);
    setAviso("");
    setFase("buscando");
    aborto.current?.abort();
    const controlador = new AbortController();
    aborto.current = controlador;
    const params = new URLSearchParams({ q: limpia, modo: conAgente ? "agente" : "literal" });
    window.history.replaceState(null, "", `/?q=${encodeURIComponent(limpia)}`);
    try {
      const resultado = await fetch(`/api/buscar?${params}`, { signal: controlador.signal });
      const cuerpo = (await resultado.json()) as RespuestaBusqueda & { error?: string };
      if (cuerpo.error && !cuerpo.interpretacion) {
        setRespuesta(null);
        setAviso(cuerpo.error);
        setFase("inicio");
        return;
      }
      setRespuesta(cuerpo);
      if (cuerpo.error) setAviso(cuerpo.error);
      setFase("listo");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setAviso("No pude completar la consulta. Reintentá en unos segundos.");
      setFase(respuesta ? "listo" : "inicio");
    }
  }

  function dictar() {
    if (escuchando) {
      buscarAlCortar.current = true;
      reconocimiento.current?.stop();
      return;
    }
    const motor = crearReconocimiento();
    if (!motor) {
      setAviso("Este navegador no tiene reconocimiento de voz. Chrome o Edge, en español, suelen tenerlo. Podés escribir o adjuntar una imagen.");
      return;
    }
    reconocimiento.current = motor;
    buscarAlCortar.current = true;
    motor.onresult = (evento) => {
      let transcripto = "";
      for (const resultado of Array.from(evento.results)) transcripto += resultado[0].transcript;
      setTexto(transcripto);
    };
    motor.onerror = (evento) => {
      buscarAlCortar.current = false;
      setEscuchando(false);
      setAviso(
        evento.error === "not-allowed"
          ? "El navegador no tiene permiso para usar el micrófono."
          : "No pude usar el micrófono. Podés escribir la consulta.",
      );
    };
    motor.onend = () => {
      setEscuchando(false);
      const dictado = (document.getElementById("consulta") as HTMLInputElement | null)?.value ?? "";
      if (buscarAlCortar.current && dictado.trim()) {
        setNotaOrigen("Consulta dictada por voz.");
        void ejecutar(dictado, agente);
      }
    };
    setAviso("");
    setEscuchando(true);
    motor.start();
  }

  async function alElegirImagen(archivoElegido: File | null) {
    if (!archivoElegido) return;
    if (!archivoElegido.type.startsWith("image/")) {
      setAviso("Necesito una imagen: una foto del expediente, de una carátula o de un texto.");
      return;
    }
    if (archivoElegido.size > 8_000_000) {
      setAviso("La imagen pesa más de 8 MB. Probá con una más chica.");
      return;
    }
    setAviso("");
    setLeyendo(0);
    setImagenPendiente(null);
    try {
      const textoLeido = await leerImagen(archivoElegido, setLeyendo);
      const limpio = textoLeido.replace(/\s+/g, " ").trim();
      if (limpio.length >= 8 || /\d{2,5}\s*[-/]\s*d/i.test(limpio)) {
        setNotaOrigen(`Leí en la imagen: «${limpio.slice(0, 180)}». La lectura se hizo en tu navegador y la imagen no se subió.`);
        await ejecutar(limpio.slice(0, 500), agente);
        return;
      }
      if (vision) {
        const datos = await archivoABase64(archivoElegido);
        setImagenPendiente({ datos, mime: archivoElegido.type, vista: URL.createObjectURL(archivoElegido) });
        setAviso("No alcancé a leer texto. Podés pedir una interpretación de la imagen.");
        return;
      }
      setAviso("No pude leer texto en la imagen. Probá con una foto más nítida o describí la consulta con el micrófono.");
    } catch {
      setAviso("No pude leer la imagen en este navegador. Describila por texto o por voz.");
    } finally {
      setLeyendo(null);
    }
  }

  async function interpretarImagen() {
    if (!imagenPendiente) return;
    setFase("buscando");
    setAviso("");
    try {
      const resultado = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: imagenPendiente.datos, mime: imagenPendiente.mime }),
      });
      const cuerpo = (await resultado.json()) as { consulta?: string; texto?: string; error?: string };
      if (!resultado.ok || !cuerpo.consulta) {
        setAviso(cuerpo.error ?? "El modelo no pudo interpretar la imagen.");
        setFase("inicio");
        return;
      }
      setNotaOrigen(
        cuerpo.texto
          ? `El modelo leyó: «${cuerpo.texto.slice(0, 180)}». La imagen se usó solo para esta consulta.`
          : "El modelo propuso una consulta a partir de la imagen. No se guarda.",
      );
      setImagenPendiente(null);
      await ejecutar(cuerpo.consulta, true);
    } catch {
      setAviso("No pude enviar la imagen al modelo.");
      setFase("inicio");
    }
  }

  const enResultados = fase !== "inicio";

  return (
    <div className="flex min-h-dvh flex-col bg-[#202124] text-[#e8eaed]">
      <header className={enResultados ? "px-4 pt-4" : "px-4 pt-[12vh] sm:pt-[16vh]"}>
        <div className={enResultados ? "mx-auto flex w-full max-w-3xl items-center gap-4" : "mx-auto flex w-full max-w-[584px] flex-col items-center"}>
          <div className={enResultados ? "" : "mb-7 text-center"}>
            <h1>
              <Marca chica={enResultados} />
            </h1>
            {enResultados ? null : (
              <p className="mt-3 text-sm text-[#9aa0a6]">Expedientes de la Legislatura de la Ciudad</p>
            )}
          </div>
          <form
            id="contenido"
            role="search"
            className={cn("w-full", enResultados && "min-w-0 flex-1")}
            onSubmit={(evento) => {
              evento.preventDefault();
              setNotaOrigen("");
              void ejecutar(texto, agente);
            }}
          >
            <div className="flex min-h-12 items-center gap-1 rounded-full border border-[#5f6368] bg-[#303134] px-1.5 focus-within:border-[#8ab4f8]">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex size-10 items-center justify-center rounded-full text-[#e8eaed] hover:bg-white/10"
                  aria-label="Más opciones"
                >
                  <Plus />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => archivo.current?.click()}>Adjuntar imagen</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAyuda(true)}>Cómo traduce el agente</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Input
                id="consulta"
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                placeholder="Contame el tema, el expediente o el autor"
                aria-label="Consulta de expedientes"
                enterKeyHint="search"
                autoComplete="off"
                className="h-11 border-0 bg-transparent px-2 text-base text-[#e8eaed] shadow-none placeholder:text-[#9aa0a6] focus-visible:border-transparent focus-visible:ring-0 md:text-base dark:bg-transparent"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={escuchando}
                aria-label={escuchando ? "Detener el dictado" : "Dictar la consulta"}
                className={cn("rounded-full text-[#e8eaed] hover:bg-white/10", escuchando && "text-[#f28b82]")}
                onClick={dictar}
              >
                <Mic />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Buscar a partir de una imagen"
                className="rounded-full text-[#e8eaed] hover:bg-white/10"
                onClick={() => archivo.current?.click()}
              >
                <Camera />
              </Button>
              <button
                type="button"
                aria-pressed={agente}
                onClick={() => setAgente((valor) => !valor)}
                className={cn(
                  "mr-1 hidden h-8 shrink-0 items-center rounded-full border px-3 text-xs sm:inline-flex",
                  agente
                    ? "border-[#8ab4f8] bg-[#394457] text-[#d2e3fc]"
                    : "border-[#5f6368] text-[#9aa0a6]",
                )}
              >
                {agente ? "Modo agente" : "Modo literal"}
              </button>
              <input
                ref={archivo}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(evento) => {
                  const elegido = evento.target.files?.[0] ?? null;
                  evento.target.value = "";
                  void alElegirImagen(elegido);
                }}
              />
            </div>
            <button
              type="button"
              aria-pressed={agente}
              onClick={() => setAgente((valor) => !valor)}
              className={cn(
                "mx-auto mt-3 flex h-8 items-center rounded-full border px-3 text-xs sm:hidden",
                agente ? "border-[#8ab4f8] bg-[#394457] text-[#d2e3fc]" : "border-[#5f6368] text-[#9aa0a6]",
              )}
            >
              {agente ? "Modo agente" : "Modo literal"}
            </button>
          </form>
        </div>
        {enResultados ? null : (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/clasica" className={cn(botonSecundario, buttonVariants({ variant: "secondary", size: "lg" }))}>
              Versión clásica
            </Link>
            <Link href="/atencion" className={cn(botonSecundario, buttonVariants({ variant: "secondary", size: "lg" }))}>
              Atención al ciudadano
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        {fase === "inicio" ? (
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2 px-4">
            {EJEMPLOS.map((ejemplo) => (
              <button
                key={ejemplo}
                type="button"
                className="rounded-full border border-[#3c4043] px-3 py-1.5 text-left text-sm text-[#bdc1c6] hover:border-[#9aa0a6] hover:text-white"
                onClick={() => {
                  setNotaOrigen("");
                  void ejecutar(ejemplo, true);
                }}
              >
                {ejemplo}
              </button>
            ))}
          </div>
        ) : null}

        {leyendo !== null ? (
          <p className="px-4 py-6 text-center text-sm text-[#bdc1c6]">
            Leyendo la imagen en tu navegador… {Math.round(leyendo * 100)}%
          </p>
        ) : null}
        {fase === "buscando" ? (
          <p className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-[#bdc1c6]">
            <LoaderCircle className="animate-spin" />
            Consultando el registro público de la Legislatura…
          </p>
        ) : null}
        {aviso ? <p className="mx-auto max-w-3xl px-4 py-4 text-center text-sm text-[#fdd663]">{aviso}</p> : null}
        {imagenPendiente && fase !== "buscando" ? (
          <div className="mx-auto mt-4 flex max-w-xl flex-col items-center gap-3 px-4 text-center">
            {/* La vista previa es un objeto local, no una imagen del sitio. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagenPendiente.vista} alt="Imagen adjunta para la búsqueda" className="max-h-48 rounded-xl" />
            <Button type="button" onClick={() => void interpretarImagen()}>
              Interpretar la imagen con el modelo
            </Button>
            <p className="text-xs text-[#9aa0a6]">Se envía solo para esta consulta. Este prototipo no la guarda.</p>
          </div>
        ) : null}
        {fase === "listo" && respuesta && !respuesta.error ? (
          <div className="mt-6">
            <Resultados respuesta={respuesta} notaOrigen={notaOrigen} />
          </div>
        ) : null}
      </main>

      {enResultados ? (
        <div className="flex justify-center gap-3 px-4 pb-2">
          <Link href="/clasica" className="text-sm text-[#8ab4f8] hover:underline">
            Versión clásica
          </Link>
          <Link href="/atencion" className="text-sm text-[#8ab4f8] hover:underline">
            Atención al ciudadano
          </Link>
        </div>
      ) : null}
      <Pie />

      <Dialog open={ayuda} onOpenChange={setAyuda}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cómo traduce el agente</DialogTitle>
            <DialogDescription>
              El registro oficial busca una frase dentro del sumario. Una oración cotidiana casi nunca está escrita así y la búsqueda queda en cero.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-4 text-sm text-[#e8eaed]">
            <li>Lee la consulta, venga escrita, dictada o leída de una imagen.</li>
            <li>Reconoce número de expediente, ley, tipo, año, autor, comisión y tema.</li>
            <li>Se queda con una palabra que sí puede aparecer en un sumario, como ALQUILER en lugar de «no puedo pagar el alquiler».</li>
            <li>Muestra cuántos resultados daba la frase completa y cuántos da la búsqueda dirigida.</li>
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const botonSecundario =
  "h-10 rounded-md border-[#5f6368] bg-[#303134] px-4 text-[#e8eaed] hover:border-[#9aa0a6] hover:bg-[#3c4043]";

function crearReconocimiento(): Reconocimiento | null {
  if (typeof window === "undefined") return null;
  const ventana = window as Window & {
    SpeechRecognition?: new () => Reconocimiento;
    webkitSpeechRecognition?: new () => Reconocimiento;
  };
  const Ctor = ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition;
  if (!Ctor) return null;
  const motor = new Ctor();
  motor.lang = "es-AR";
  motor.interimResults = true;
  motor.continuous = false;
  return motor;
}

async function leerImagen(archivo: File, alProgreso: (valor: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("spa", 1, {
    logger: (mensaje) => {
      if (mensaje.status === "recognizing text") alProgreso(mensaje.progress);
    },
  });
  try {
    const { data } = await worker.recognize(archivo);
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

function archivoABase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = String(lector.result ?? "");
      resolve(resultado.split(",")[1] ?? "");
    };
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(archivo);
  });
}
