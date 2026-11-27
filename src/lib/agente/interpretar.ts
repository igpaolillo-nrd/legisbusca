import { TEMAS, STOP } from "./lexico";
import { anioEnBuenosAires, normalizar } from "./normalizar";

export type TipoProyecto = {
  id: "1" | "2" | "3";
  nombre: "LEY" | "RESOLUCION" | "DECLARACION";
};

export type Interpretacion = {
  textoOriginal: string;
  resumen: string;
  modo: "expediente" | "ley" | "dirigida" | "vacia";
  expediente?: { numero: string; anio: string };
  leyNumero?: string;
  termino?: string;
  terminoAlternativo?: string;
  tipo?: TipoProyecto;
  anio?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  autorTexto?: string;
  comisionTexto?: string;
  estado?: { id: string; nombre: string };
  soloSancionados?: boolean;
  comparacionLiteral: boolean;
  advertencias: string[];
};

const TIPOS: Record<TipoProyecto["id"], TipoProyecto> = {
  "1": { id: "1", nombre: "LEY" },
  "2": { id: "2", nombre: "RESOLUCION" },
  "3": { id: "3", nombre: "DECLARACION" },
};

const PARTICULAS = new Set(["la", "los", "de", "del"]);

export function interpretar(texto: string, ahora = new Date()): Interpretacion {
  const original = texto.replace(/\s+/g, " ").trim();
  const anioHoy = anioEnBuenosAires(ahora);
  let trabajo = normalizar(original);
  const advertencias: string[] = [];

  if (!trabajo) {
    return cerrar({
      textoOriginal: original,
      modo: "vacia",
      advertencias: ["Escribí un tema, un número de expediente o un autor."],
    });
  }

  const expediente = tomarExpediente(trabajo);
  if (expediente) {
    return cerrar({
      textoOriginal: original,
      modo: "expediente",
      expediente,
      advertencias,
    });
  }

  const leyNumero = tomarLey(trabajo);
  if (leyNumero) {
    return cerrar({
      textoOriginal: original,
      modo: "ley",
      leyNumero,
      advertencias,
    });
  }

  const fechas = tomarFechas(trabajo);
  trabajo = fechas.resto;
  const anio = tomarAnio(trabajo, anioHoy);
  trabajo = anio.resto;
  const tipo = tomarTipo(normalizar(original));
  const estado = tomarEstado(trabajo);
  const soloSancionados = /\b(sancionad[oa]s?|promulgad[oa]s?|ya es ley|con sancion)\b/.test(trabajo);
  const comision = tomarComision(trabajo);
  trabajo = comision.resto;
  const temas = tomarTemas(trabajo);
  trabajo = temas.resto;
  const autorTexto = tomarAutor(trabajo);

  if (temas.nota) advertencias.push(temas.nota);

  const hayEje = Boolean(temas.termino || autorTexto || comision.texto);
  if (!hayEje) {
    advertencias.unshift(
      "Esa consulta sigue siendo muy amplia para el registro. Agregá un tema, un autor, una comisión o un número de expediente.",
    );
    return cerrar({
      textoOriginal: original,
      modo: "vacia",
      tipo,
      anio: anio.valor,
      fechaDesde: fechas.desde,
      fechaHasta: fechas.hasta,
      estado,
      soloSancionados,
      advertencias,
    });
  }

  return cerrar({
    textoOriginal: original,
    modo: "dirigida",
    termino: temas.termino,
    terminoAlternativo: temas.alternativo,
    tipo,
    anio: anio.valor,
    fechaDesde: fechas.desde,
    fechaHasta: fechas.hasta,
    autorTexto,
    comisionTexto: comision.texto,
    estado,
    soloSancionados,
    advertencias,
  });
}

export function literalizar(base: Interpretacion, consulta: string): Interpretacion {
  if (base.modo === "expediente" || base.modo === "ley") {
    return { ...base, comparacionLiteral: false };
  }
  const frase = consulta.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!frase) {
    return cerrar({
      textoOriginal: consulta.trim(),
      modo: "vacia",
      advertencias: ["Escribí la palabra clave que querés buscar tal cual."],
    });
  }
  return {
    textoOriginal: consulta.trim(),
    resumen: "Modo literal: la frase se envía al registro como palabra clave, sin traducirla.",
    modo: "dirigida",
    termino: frase,
    comparacionLiteral: false,
    advertencias: [
      "Sin el agente, el registro busca esa frase completa dentro del sumario. Si no está escrita así, el resultado es vacío.",
    ],
  };
}

type Borrador = Omit<Interpretacion, "resumen" | "comparacionLiteral">;

export function cerrar(parcial: Borrador): Interpretacion {
  const interpretacion: Interpretacion = {
    ...parcial,
    advertencias: parcial.advertencias ?? [],
    comparacionLiteral: false,
    resumen: "",
  };
  interpretacion.comparacionLiteral = esComparable(interpretacion);
  interpretacion.resumen = redactar(interpretacion);
  return interpretacion;
}

function esComparable(interpretacion: Interpretacion): boolean {
  if (interpretacion.modo !== "dirigida" || !interpretacion.termino) return false;
  const palabras = interpretacion.textoOriginal.trim().split(/\s+/).length;
  if (palabras < 3) return false;
  return normalizar(interpretacion.termino) !== normalizar(interpretacion.textoOriginal);
}

function redactar(interpretacion: Interpretacion): string {
  if (interpretacion.modo === "vacia") {
    return interpretacion.advertencias[0] ?? "Necesito un tema, un número o un autor para buscar.";
  }
  if (interpretacion.modo === "expediente" && interpretacion.expediente) {
    const { numero, anio } = interpretacion.expediente;
    return `Busco el expediente ${numero}-D-${anio} directo en el registro, sin palabras clave.`;
  }
  if (interpretacion.modo === "ley" && interpretacion.leyNumero) {
    return `Busco la sanción de la ley ${interpretacion.leyNumero}, no los proyectos que solo contienen la palabra ley.`;
  }

  const partes: string[] = [];
  if (interpretacion.tipo) partes.push(`proyectos de ${nombreTipo(interpretacion.tipo)}`);
  else partes.push("expedientes");
  if (interpretacion.termino) partes.push(`cuyo sumario contiene «${interpretacion.termino}»`);
  if (interpretacion.autorTexto) partes.push(`vinculados a ${interpretacion.autorTexto}`);
  if (interpretacion.comisionTexto) partes.push(`en la comisión de ${interpretacion.comisionTexto}`);
  if (interpretacion.estado) partes.push(`en estado ${interpretacion.estado.nombre.toLowerCase()}`);
  if (interpretacion.soloSancionados) partes.push("que figuren sancionados");
  if (interpretacion.anio) partes.push(`del año ${interpretacion.anio}`);
  if (interpretacion.fechaDesde || interpretacion.fechaHasta) {
    partes.push(`entre ${interpretacion.fechaDesde ?? "el inicio"} y ${interpretacion.fechaHasta ?? "hoy"}`);
  }

  let texto = `Traduzco la consulta a ${partes.join(", ")}.`;
  if (interpretacion.comparacionLiteral) {
    texto += " La frase completa no se manda como palabra clave: en los sumarios casi nunca está escrita así.";
  }
  return texto;
}

function nombreTipo(tipo: TipoProyecto): string {
  if (tipo.id === "1") return "ley";
  if (tipo.id === "2") return "resolución";
  return "declaración";
}

function tomarExpediente(texto: string): { numero: string; anio: string } | undefined {
  const conTipo = texto.match(/\b(\d{1,5})\s*[-/]\s*d\s*[-/]\s*(20\d{2})\b/);
  if (conTipo) return { numero: conTipo[1], anio: conTipo[2] };
  const nombrado = texto.match(/\bexpediente\s+(\d{1,5})\s*(?:de|del|d|-|\/)\s*(20\d{2})\b/);
  if (nombrado) return { numero: nombrado[1], anio: nombrado[2] };
  const numerado = texto.match(/\b(?:nro|numero)\s+(\d{1,5})\b/);
  const anio = texto.match(/\b(20\d{2})\b/);
  if (numerado && anio) return { numero: numerado[1], anio: anio[1] };
  return undefined;
}

function tomarLey(texto: string): string | undefined {
  const match = texto.match(/(?<!proyecto de )(?<!proyectos de )\bley\s+(?:nro\.?\s*|numero\s*)?(\d{2,5})\b/);
  return match?.[1];
}

function tomarFechas(texto: string): { desde?: string; hasta?: string; resto: string } {
  const entre = texto.match(/\bentre\s+el\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+y\s+el\s+(\d{1,2}\/\d{1,2}\/\d{4})\b/);
  if (entre) {
    return {
      desde: normalizarFecha(entre[1]),
      hasta: normalizarFecha(entre[2]),
      resto: texto.replace(entre[0], " "),
    };
  }
  const desde = texto.match(/\bdesde\s+(?:el\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\b/);
  const hasta = texto.match(/\bhasta\s+(?:el\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\b/);
  let resto = texto;
  if (desde) resto = resto.replace(desde[0], " ");
  if (hasta) resto = resto.replace(hasta[0], " ");
  return {
    desde: desde ? normalizarFecha(desde[1]) : undefined,
    hasta: hasta ? normalizarFecha(hasta[1]) : undefined,
    resto,
  };
}

function normalizarFecha(fecha: string): string {
  const [dia, mes, anio] = fecha.split("/");
  return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anio}`;
}

function tomarAnio(texto: string, anioHoy: number): { valor?: string; resto: string } {
  if (/\b(ano pasado|el ano pasado|ultimo ano)\b/.test(texto)) {
    return { valor: String(anioHoy - 1), resto: texto.replace(/\b(el ano pasado|ano pasado|ultimo ano|del ano)\b/g, " ") };
  }
  if (/\b(este ano|ano actual|ano en curso)\b/.test(texto)) {
    return { valor: String(anioHoy), resto: texto.replace(/\b(este ano|ano actual|ano en curso|del ano)\b/g, " ") };
  }
  const absoluto = texto.match(/\b(20\d{2})\b/);
  if (absoluto) {
    return { valor: absoluto[1], resto: texto.replace(absoluto[0], " ") };
  }
  return { resto: texto };
}

function tomarTipo(texto: string): TipoProyecto | undefined {
  const candidatos = [
    { indice: texto.search(/\bproyectos? de ley\b/), tipo: TIPOS["1"] },
    { indice: texto.search(/\bdeclaraciones?\b/), tipo: TIPOS["3"] },
    { indice: texto.search(/\bresoluciones?\b/), tipo: TIPOS["2"] },
    { indice: texto.search(/\bley\b/), tipo: TIPOS["1"] },
  ].filter((candidato) => candidato.indice >= 0);
  candidatos.sort((a, b) => a.indice - b.indice);
  return candidatos[0]?.tipo;
}

function tomarEstado(texto: string): { id: string; nombre: string } | undefined {
  if (/\ben comision\b/.test(texto)) return { id: "7", nombre: "EN COMISION" };
  return undefined;
}

function tomarComision(texto: string): { texto?: string; resto: string } {
  const match = texto.match(/\bcomisiones?\s+de\s+([a-z0-9]+(?:\s+[a-z0-9]+){0,3})/);
  if (!match) return { resto: texto };
  const palabras = match[1]
    .split(/\s+/)
    .filter((palabra) => !STOP.has(palabra) && palabra !== "sobre");
  if (palabras.length === 0) return { resto: texto.replace(match[0], " ") };
  return { texto: palabras.join(" "), resto: texto.replace(match[0], " ") };
}

function tomarTemas(texto: string): {
  termino?: string;
  alternativo?: string;
  nota?: string;
  resto: string;
} {
  const frases = TEMAS.flatMap((tema) =>
    tema.frases.map((frase) => ({ ...tema, frase: normalizar(frase) })),
  ).sort((a, b) => b.frase.length - a.frase.length);

  const ocupados: Array<[number, number]> = [];
  const hallazgos: Array<{ inicio: number; termino: string; alternativo?: string; nota?: string; peso: number }> = [];

  for (const frase of frases) {
    let desde = 0;
    while (desde < texto.length) {
      const inicio = texto.indexOf(frase.frase, desde);
      if (inicio < 0) break;
      const fin = inicio + frase.frase.length;
      const bordeAntes = inicio === 0 || !/[a-z0-9]/.test(texto[inicio - 1] ?? "");
      const bordeDespues = fin === texto.length || !/[a-z0-9]/.test(texto[fin] ?? "");
      const solapa = ocupados.some(([desdeOcupado, hastaOcupado]) => inicio < hastaOcupado && fin > desdeOcupado);
      if (bordeAntes && bordeDespues && !solapa) {
        ocupados.push([inicio, fin]);
        hallazgos.push({
          inicio,
          termino: frase.termino,
          alternativo: frase.alternativo,
          nota: frase.nota,
          peso: frase.peso,
        });
        break;
      }
      desde = inicio + 1;
    }
  }

  if (hallazgos.length === 0) return { resto: texto };
  const ordenados = [...hallazgos].sort((a, b) => b.peso - a.peso || a.inicio - b.inicio);
  const principal = ordenados[0];
  const secundario = ordenados.find((hallazgo) => hallazgo.termino !== principal.termino);
  let resto = texto;
  for (const [inicio, fin] of ocupados) {
    resto = `${resto.slice(0, inicio)}${" ".repeat(fin - inicio)}${resto.slice(fin)}`;
  }
  return {
    termino: principal.termino,
    alternativo: principal.alternativo ?? secundario?.termino,
    nota: principal.nota,
    resto,
  };
}

function tomarAutor(texto: string): string | undefined {
  const conCargo = texto.match(/\b(?:presentad[oa] por|diputad[oa]|legislador[a]?|autor[a]?)\s+(.+)/);
  if (conCargo) {
    const nombre = mejorNombre(conCargo[1] ?? "");
    if (nombre) return nombre;
  }
  for (const match of texto.matchAll(/\b(?:de|del)\s+([a-z]+(?:\s+[a-z]+){0,3})/g)) {
    const nombre = mejorNombre(match[1] ?? "");
    if (nombre) return nombre;
  }
  return undefined;
}

function mejorNombre(captura: string): string | undefined {
  const tokens = captura.split(/\s+/).filter(Boolean);
  for (let cantidad = Math.min(3, tokens.length); cantidad >= 1; cantidad -= 1) {
    const candidato = tokens.slice(0, cantidad).join(" ");
    if (esNombre(candidato)) return candidato;
  }
  return undefined;
}

function esNombre(frase: string): boolean {
  const tokens = frase.split(/\s+/).filter(Boolean);
  const significativos = tokens.filter((token) => !PARTICULAS.has(token));
  if (significativos.length === 0 || significativos.length > 2) return false;
  return significativos.every((token) => token.length >= 3 && !STOP.has(token) && !esPalabraDeTema(token));
}

function esPalabraDeTema(palabra: string): boolean {
  return TEMAS.some((tema) => tema.frases.some((frase) => normalizar(frase).split(" ").includes(palabra)));
}
