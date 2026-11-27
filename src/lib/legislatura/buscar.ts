import { interpretar, literalizar, type Interpretacion } from "@/lib/agente/interpretar";
import { aplicarRefinamiento, refinarConModelo, type Refinamiento } from "@/lib/agente/modelo";
import { normalizar } from "@/lib/agente/normalizar";
import {
  autocompletar,
  buscarAvanzada,
  buscarPorLey,
  buscarPorNumero,
  ErrorRegistro,
  type FetchLike,
  type FiltroBusqueda,
} from "./cliente";
import { type Expediente, type OpcionCatalogo } from "./tipos";

export type EntradaBusqueda =
  | { modo: "agente" | "literal"; consulta: string }
  | {
      modo: "clasica";
      numero?: string;
      anio?: string;
      sumario?: string;
      tipoId?: string;
      autor?: string;
      anioParlamentario?: string;
      fechaDesde?: string;
      fechaHasta?: string;
    };

export type RespuestaBusqueda = {
  consulta: string;
  modo: EntradaBusqueda["modo"];
  interpretacion: Interpretacion;
  fuente: "interprete" | "modelo" | "literal" | "clasica";
  autorResuelto: OpcionCatalogo | null;
  comisionResuelta: OpcionCatalogo | null;
  literal: { cantidad: number; consultada: boolean; topeAlcanzado: boolean };
  resultados: Expediente[];
  advertencias: string[];
  error?: string;
  duracionMs: number;
};

export type Dependencias = {
  fetchImpl?: FetchLike;
  ahora?: Date;
  refinar?: (interpretacion: Interpretacion) => Promise<Refinamiento | null>;
};

const TOPE = 12;
const TOPE_LITERAL = 5;

export async function buscar(entrada: EntradaBusqueda, deps: Dependencias = {}): Promise<RespuestaBusqueda> {
  const inicio = Date.now();
  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    if (entrada.modo === "clasica") {
      return await buscarClasica(entrada, fetchImpl, inicio);
    }

    const consulta = entrada.consulta.replace(/\s+/g, " ").trim().slice(0, 500);
    let interpretacion = interpretar(consulta, deps.ahora);
    let fuente: RespuestaBusqueda["fuente"] = "interprete";

    if (entrada.modo === "literal") {
      interpretacion = literalizar(interpretacion, consulta);
      fuente = "literal";
    } else if (interpretacion.modo !== "expediente" && interpretacion.modo !== "ley") {
      const refinar = deps.refinar ?? (process.env.GEMINI_API_KEY ? refinarConModelo : null);
      if (refinar) {
        const refinado = await refinar(interpretacion);
        if (refinado) {
          const ajustada = aplicarRefinamiento(interpretacion, refinado);
          if (ajustada) {
            interpretacion = ajustada;
            fuente = "modelo";
          }
        }
      }
    }

    if (interpretacion.modo === "vacia") {
      return respuestaBase(consulta, entrada.modo, interpretacion, fuente, inicio);
    }

    if (interpretacion.modo === "expediente" && interpretacion.expediente) {
      const resultados = await buscarPorNumero(
        interpretacion.expediente.numero,
        interpretacion.expediente.anio,
        fetchImpl,
      );
      return {
        ...respuestaBase(consulta, entrada.modo, interpretacion, fuente, inicio),
        resultados,
      };
    }

    if (interpretacion.modo === "ley" && interpretacion.leyNumero) {
      const resultados = await buscarPorLey(interpretacion.leyNumero, fetchImpl);
      return {
        ...respuestaBase(consulta, entrada.modo, interpretacion, fuente, inicio),
        resultados,
      };
    }

    const dirigida = await ejecutarDirigida(interpretacion, fetchImpl);
    return {
      ...respuestaBase(consulta, entrada.modo, interpretacion, fuente, inicio),
      ...dirigida,
      advertencias: unicas([...interpretacion.advertencias, ...dirigida.advertencias]),
    };
  } catch (error) {
    const mensaje = error instanceof ErrorRegistro
      ? error.message
      : "No se pudo completar la consulta.";
    const consulta = "consulta" in entrada ? entrada.consulta : "Búsqueda clásica";
    return {
      ...respuestaBase(
        consulta,
        entrada.modo,
        {
          textoOriginal: consulta,
          resumen: mensaje,
          modo: "vacia",
          comparacionLiteral: false,
          advertencias: [],
        },
        "interprete",
        inicio,
      ),
      error: mensaje,
    };
  }
}

async function buscarClasica(
  entrada: Extract<EntradaBusqueda, { modo: "clasica" }>,
  fetchImpl: FetchLike,
  inicio: number,
): Promise<RespuestaBusqueda> {
  const numero = (entrada.numero ?? "").trim();
  const anio = (entrada.anio ?? "").trim();
  const sumario = (entrada.sumario ?? "").trim().slice(0, 80);
  const autorTexto = normalizar(entrada.autor ?? "");
  const anioParlamentario = (entrada.anioParlamentario ?? "").trim();
  if (!numero && !sumario && !autorTexto && !anioParlamentario && !entrada.tipoId) {
    const interpretacion = interpretar("");
    return {
      ...respuestaBase("Búsqueda clásica", "clasica", interpretacion, "clasica", inicio),
      error: "Completá al menos el número, una palabra del sumario, un autor o un año.",
    };
  }

  const interpretacion: Interpretacion = {
    textoOriginal: [numero && anio ? `${numero}-D-${anio}` : "", sumario].filter(Boolean).join(" "),
    resumen: "Búsqueda clásica: los campos se envían al registro sin traducir el lenguaje cotidiano.",
    modo: numero && anio ? "expediente" : "dirigida",
    expediente: numero && anio ? { numero, anio } : undefined,
    termino: sumario || undefined,
    tipo: entrada.tipoId === "1" || entrada.tipoId === "2" || entrada.tipoId === "3"
      ? { id: entrada.tipoId, nombre: entrada.tipoId === "1" ? "LEY" : entrada.tipoId === "2" ? "RESOLUCION" : "DECLARACION" }
      : undefined,
    anio: anioParlamentario || undefined,
    fechaDesde: entrada.fechaDesde || undefined,
    fechaHasta: entrada.fechaHasta || undefined,
    autorTexto: autorTexto || undefined,
    comparacionLiteral: false,
    advertencias: [],
  };

  if (numero && anio) {
    const resultados = await buscarPorNumero(numero, anio, fetchImpl);
    return {
      ...respuestaBase(interpretacion.textoOriginal || "Búsqueda clásica", "clasica", interpretacion, "clasica", inicio),
      resultados,
    };
  }

  const autor = autorTexto ? await resolver(autorTexto, "GetAutoresInternos", fetchImpl) : null;
  const resultados = ordenar(
    await buscarAvanzada(
      {
        sumario: sumario || undefined,
        tipoId: interpretacion.tipo?.id,
        autorId: autor?.id,
        anio: anioParlamentario || undefined,
        fechaDesde: entrada.fechaDesde || undefined,
        fechaHasta: entrada.fechaHasta || undefined,
        limite: TOPE,
      },
      fetchImpl,
    ),
    interpretacion,
  );

  const advertencias: string[] = [];
  if (autorTexto && !autor) {
    advertencias.push(`No encontré el autor «${autorTexto}» en el padrón. La búsqueda siguió sin ese filtro.`);
  }

  return {
    ...respuestaBase(interpretacion.textoOriginal || "Búsqueda clásica", "clasica", interpretacion, "clasica", inicio),
    autorResuelto: autor,
    resultados,
    advertencias,
  };
}

async function ejecutarDirigida(interpretacion: Interpretacion, fetchImpl: FetchLike) {
  const autor = interpretacion.autorTexto
    ? await resolver(interpretacion.autorTexto, "GetAutoresInternos", fetchImpl)
    : null;
  const comision = interpretacion.comisionTexto
    ? await resolver(interpretacion.comisionTexto, "GetUbicaciones", fetchImpl)
    : null;
  const advertencias: string[] = [];
  if (interpretacion.autorTexto && !autor) {
    advertencias.push(`No encontré «${interpretacion.autorTexto}» entre los autores del registro. Sigo sin ese filtro.`);
  }
  if (interpretacion.comisionTexto && !comision) {
    advertencias.push(`No encontré la comisión «${interpretacion.comisionTexto}». Sigo sin ese filtro.`);
  }

  const comparacion = interpretacion.comparacionLiteral;
  const [primarios, literales] = await Promise.all([
    consultar(interpretacion, autor?.id, comision?.id, fetchImpl),
    comparacion ? consultarLiteral(interpretacion.textoOriginal, fetchImpl) : Promise.resolve(null),
  ]);

  let resultados = primarios;
  if (resultados.length === 0 && interpretacion.anio) {
    resultados = await consultar({ ...interpretacion, anio: undefined }, autor?.id, comision?.id, fetchImpl);
    if (resultados.length > 0) {
      advertencias.push(`En ${interpretacion.anio} no hubo coincidencias. Amplié la búsqueda a otros años.`);
    }
  } else if (resultados.length === 0 && interpretacion.terminoAlternativo) {
    resultados = await consultar(
      { ...interpretacion, termino: interpretacion.terminoAlternativo },
      autor?.id,
      comision?.id,
      fetchImpl,
    );
    if (resultados.length > 0) {
      advertencias.push(`La primera palabra no alcanzó. Usé «${interpretacion.terminoAlternativo}».`);
    }
  }

  if (interpretacion.soloSancionados && resultados.some((item) => item.sancionado !== null)) {
    const sancionados = resultados.filter((item) => item.sancionado);
    if (sancionados.length > 0) resultados = sancionados;
    else advertencias.push("Ningún expediente de esta muestra figura como sancionado.");
  } else if (interpretacion.soloSancionados) {
    advertencias.push("El registro no informó la sanción en esta respuesta.");
  }

  if (/\barchiv/.test(normalizar(interpretacion.textoOriginal))) {
    const enArchivo = resultados.filter((item) => {
      const lugar = normalizar(`${item.ubicacion} ${item.estado}`);
      return lugar.includes("archivo");
    });
    if (enArchivo.length > 0) resultados = enArchivo;
  }

  return {
    autorResuelto: autor,
    comisionResuelta: comision,
    literal: literales ?? { cantidad: 0, consultada: false, topeAlcanzado: false },
    resultados: ordenar(resultados, interpretacion),
    advertencias,
  };
}

async function consultar(
  interpretacion: Interpretacion,
  autorId: string | undefined,
  ubicacionId: string | undefined,
  fetchImpl: FetchLike,
): Promise<Expediente[]> {
  const filtro: FiltroBusqueda = {
    sumario: interpretacion.termino,
    tipoId: interpretacion.tipo?.id,
    autorId,
    ubicacionId,
    estadoId: interpretacion.estado?.id,
    anio: interpretacion.anio,
    fechaDesde: interpretacion.fechaDesde,
    fechaHasta: interpretacion.fechaHasta,
    limite: TOPE,
  };
  return buscarAvanzada(filtro, fetchImpl);
}

async function consultarLiteral(consulta: string, fetchImpl: FetchLike) {
  const frase = consulta.replace(/\s+/g, " ").trim().slice(0, 80);
  const lista = await buscarAvanzada({ sumario: frase, limite: TOPE_LITERAL }, fetchImpl);
  return {
    cantidad: lista.length,
    consultada: true,
    topeAlcanzado: lista.length >= TOPE_LITERAL,
  };
}

async function resolver(
  texto: string,
  metodo: "GetAutoresInternos" | "GetUbicaciones",
  fetchImpl: FetchLike,
): Promise<OpcionCatalogo | null> {
  const opciones = await autocompletar(metodo, texto, fetchImpl);
  return elegir(opciones, texto);
}

export function elegir(opciones: OpcionCatalogo[], consulta: string): OpcionCatalogo | null {
  const buscado = normalizar(consulta);
  const palabras = buscado.split(" ").filter((palabra) => !["de", "del", "la", "los"].includes(palabra));
  const rankeadas = opciones
    .map((opcion) => {
      const nombre = normalizar(opcion.nombre);
      const apellido = nombre.split(",")[0]?.trim() ?? nombre;
      let puntos = 0;
      if (apellido === buscado || nombre === buscado) puntos += 10;
      if (palabras.length > 0 && palabras.every((palabra) => nombre.includes(palabra))) puntos += 5;
      if (apellido.startsWith(palabras[0] ?? buscado)) puntos += 2;
      return { opcion, puntos };
    })
    .filter((item) => item.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos);
  return rankeadas[0]?.opcion ?? null;
}

export function puntaje(expediente: Expediente, interpretacion: Interpretacion): number {
  const sumario = normalizar(expediente.sumario);
  let puntos = 0;
  if (interpretacion.termino && sumario.includes(normalizar(interpretacion.termino))) puntos += 5;
  if (interpretacion.terminoAlternativo && sumario.includes(normalizar(interpretacion.terminoAlternativo))) puntos += 2;
  if (interpretacion.anio && expediente.numero.includes(interpretacion.anio)) puntos += 2;
  if (interpretacion.autorTexto && incluyeAutor(expediente, interpretacion.autorTexto)) puntos += 3;
  if (
    interpretacion.termino === "COLECTIVO" &&
    sumario.includes("inconsciente") &&
    !sumario.includes("linea") &&
    !sumario.includes("parada") &&
    !sumario.includes("transporte")
  ) {
    puntos -= 6;
  }
  const anio = Number(expediente.numero.match(/20\d{2}/)?.[0] ?? "2000");
  puntos += (anio - 2000) / 50;
  return puntos;
}

function incluyeAutor(expediente: Expediente, autor: string): boolean {
  const nombre = normalizar(`${expediente.autor} ${expediente.coautores}`);
  return normalizar(autor)
    .split(" ")
    .filter((palabra) => !["de", "del", "la", "los"].includes(palabra))
    .every((palabra) => nombre.includes(palabra));
}

function ordenar(lista: Expediente[], interpretacion: Interpretacion): Expediente[] {
  const vistos = new Set<string>();
  return lista
    .filter((item) => {
      const clave = item.id || item.numero;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    })
    .sort((a, b) => puntaje(b, interpretacion) - puntaje(a, interpretacion))
    .slice(0, TOPE);
}

function respuestaBase(
  consulta: string,
  modo: EntradaBusqueda["modo"],
  interpretacion: Interpretacion,
  fuente: RespuestaBusqueda["fuente"],
  inicio: number,
): RespuestaBusqueda {
  return {
    consulta,
    modo,
    interpretacion,
    fuente,
    autorResuelto: null,
    comisionResuelta: null,
    literal: { cantidad: 0, consultada: false, topeAlcanzado: false },
    resultados: [],
    advertencias: interpretacion.advertencias,
    duracionMs: Date.now() - inicio,
  };
}

function unicas(notas: string[]): string[] {
  return [...new Set(notas.filter(Boolean))];
}
