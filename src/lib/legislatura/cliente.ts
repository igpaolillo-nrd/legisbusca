import { urlExpediente, type Expediente, type OpcionCatalogo } from "./tipos";

const BASE = "https://parlamentaria.legislatura.gob.ar/webservices";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class ErrorRegistro extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorRegistro";
  }
}

export type FiltroBusqueda = {
  sumario?: string;
  tipoId?: string;
  autorId?: string;
  ubicacionId?: string;
  estadoId?: string;
  anio?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  limite?: number;
};

function encabezados(): HeadersInit {
  return {
    Accept: "application/json, text/xml, */*",
    "User-Agent": "LegisBusca/0.1 (prototipo academico; consulta publica)",
  };
}

async function traer(url: URL, fetchImpl: FetchLike): Promise<string> {
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(url.toString(), {
      headers: encabezados(),
      cache: "no-store",
      signal: AbortSignal.timeout(18000),
    });
  } catch {
    throw new ErrorRegistro("El registro público de la Legislatura no respondió a tiempo.");
  }
  const texto = await respuesta.text();
  if (!respuesta.ok) {
    throw new ErrorRegistro("El registro público de la Legislatura rechazó la consulta.");
  }
  return texto;
}

export async function buscarAvanzada(filtro: FiltroBusqueda, fetchImpl: FetchLike = fetch): Promise<Expediente[]> {
  const url = new URL(`${BASE}/Json.asmx/GetExpedienteAvanzadaJson`);
  const params: Record<string, string> = {
    IdProyectoTipo: filtro.tipoId ?? "",
    IdAutoresInternos: filtro.autorId ?? "",
    IdUbicacion: filtro.ubicacionId ?? "",
    IdEstado: filtro.estadoId ?? "",
    Sumario: filtro.sumario ?? "",
    SumarioExacto: "0",
    FechaDesde: filtro.fechaDesde ?? "",
    FechaHasta: filtro.fechaHasta ?? "",
    AnioParlamentario: filtro.anio ?? "",
    Limite: String(filtro.limite ?? 12),
  };
  for (const [clave, valor] of Object.entries(params)) url.searchParams.set(clave, valor);

  const texto = await traer(url, fetchImpl);
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new ErrorRegistro("El registro público devolvió una respuesta que no pude leer.");
  }
  const lista = Array.isArray(datos) ? datos : [];
  return lista.map((item) => desdeRegistro(item as Record<string, unknown>));
}

export async function buscarPorNumero(numero: string, anio: string, fetchImpl: FetchLike = fetch): Promise<Expediente[]> {
  const url = new URL(`${BASE}/Json.asmx/GetExpedienteByNroyAnio`);
  url.searchParams.set("NroExpediente", numero);
  url.searchParams.set("AnioExpediente", anio);
  const texto = await traer(url, fetchImpl);
  return registrosXml(texto, "expedienteAvanzado").map(desdePlano);
}

export async function buscarPorLey(numero: string, fetchImpl: FetchLike = fetch): Promise<Expediente[]> {
  const url = new URL(`${BASE}/Json.asmx/GetSancionNroDeLey`);
  url.searchParams.set("NroDeLey", numero);
  const texto = await traer(url, fetchImpl);
  return registrosXml(texto, "sancion").map((registro) =>
    desdePlano({
      ...registro,
      tipo_proyecto_des: registro.proyectotipo || registro.tipo_proyecto_des || "LEY",
      descripcion: registro.sanciontipo || "SANCIÓN",
      TieneSancion: "1",
    }),
  );
}

export async function autocompletar(
  metodo: "GetAutoresInternos" | "GetUbicaciones" | "GetEstados",
  prefijo: string,
  fetchImpl: FetchLike = fetch,
): Promise<OpcionCatalogo[]> {
  const url = new URL(`${BASE}/AutoCompletar.asmx/${metodo}`);
  url.searchParams.set("prefixText", prefijo);
  url.searchParams.set("count", "12");
  const texto = await traer(url, fetchImpl);
  const crudos = texto.trim().startsWith("<")
    ? [...texto.matchAll(/<string>([\s\S]*?)<\/string>/g)].map((coincidencia) => decodificarXml(coincidencia[1]))
    : [];
  return crudos.flatMap((item) => {
    try {
      const parsed = JSON.parse(item) as { First?: string; Second?: string };
      if (!parsed.First || !parsed.Second) return [];
      return [{ nombre: parsed.First.trim(), id: String(parsed.Second).trim() }];
    } catch {
      return [];
    }
  });
}

function desdeRegistro(registro: Record<string, unknown>): Expediente {
  const plano: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(registro)) {
    if (valor === null || valor === undefined) continue;
    plano[clave] = String(valor);
  }
  return desdePlano(plano);
}

function desdePlano(registro: Record<string, string>): Expediente {
  const id = registro.id_expediente ?? "";
  const sancion = registro.TieneSancion;
  return {
    id,
    numero: registro.nro_de_expediente ?? "",
    sumario: limpiar(registro.sumario),
    autor: limpiar(registro.autor_des),
    coautores: limpiar(registro.coautores_des),
    tipo: limpiar(registro.tipo_proyecto_des || registro.proyectotipo),
    inicio: registro.fch_inicio ?? "",
    ultimoMovimiento: registro.fch_movimiento ?? "",
    ubicacion: limpiar(registro.ubicacion_des),
    estado: limpiar(registro.descripcion || registro.sanciontipo),
    sancionado: sancion === undefined || sancion === "" ? null : sancion === "1" || sancion.toLowerCase() === "true",
    urlOficial: urlExpediente(id),
  };
}

function registrosXml(xml: string, etiqueta: string): Record<string, string>[] {
  const bloques = xml.matchAll(new RegExp(`<${etiqueta}\\b[^>]*>([\\s\\S]*?)</${etiqueta}>`, "gi"));
  return [...bloques].map((bloque) => {
    const registro: Record<string, string> = {};
    for (const campo of bloque[1].matchAll(/<([A-Za-z0-9_]+)>([^<]*)<\/\1>/g)) {
      registro[campo[1]] = decodificarXml(campo[2]);
    }
    return registro;
  });
}

function decodificarXml(valor: string): string {
  return valor
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function limpiar(valor: string | undefined): string {
  return (valor ?? "").replace(/\s+/g, " ").trim();
}
