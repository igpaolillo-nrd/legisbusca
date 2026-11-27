import { buscar, type EntradaBusqueda, type RespuestaBusqueda } from "@/lib/legislatura/buscar";

export const dynamic = "force-dynamic";

const cache = new Map<string, { vence: number; cuerpo: RespuestaBusqueda }>();
const visitas = new Map<string, number[]>();

export async function GET(request: Request) {
  if (!permitir(request)) return demasiado();
  const url = new URL(request.url);
  const consulta = (url.searchParams.get("q") ?? "").slice(0, 500);
  const modo = url.searchParams.get("modo") === "literal" ? "literal" : "agente";
  const clave = `${modo}:${consulta}`;
  const guardado = cache.get(clave);
  if (guardado && guardado.vence > Date.now()) {
    return Response.json(guardado.cuerpo, { headers: { "cache-control": "no-store" } });
  }
  const cuerpo = await buscar({ modo, consulta });
  if (!cuerpo.error) cache.set(clave, { vence: Date.now() + 20_000, cuerpo });
  return Response.json(cuerpo, {
    status: cuerpo.error ? 502 : 200,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!permitir(request)) return demasiado();
  let entrada: EntradaBusqueda;
  try {
    entrada = clasica(await request.json());
  } catch {
    return Response.json({ error: "La consulta clásica no tiene el formato esperado." }, { status: 400 });
  }
  const cuerpo = await buscar(entrada);
  return Response.json(cuerpo, {
    status: cuerpo.error ? 502 : 200,
    headers: { "cache-control": "no-store" },
  });
}

function clasica(datos: unknown): EntradaBusqueda {
  if (!datos || typeof datos !== "object") throw new Error("cuerpo");
  const registro = datos as Record<string, unknown>;
  const texto = (clave: string, tope: number) => {
    const valor = registro[clave];
    return typeof valor === "string" ? valor.slice(0, tope) : "";
  };
  const tipo = texto("tipoId", 2);
  return {
    modo: "clasica",
    numero: texto("numero", 6),
    anio: texto("anio", 4),
    sumario: texto("sumario", 80),
    tipoId: tipo === "1" || tipo === "2" || tipo === "3" ? tipo : "",
    autor: texto("autor", 80),
    anioParlamentario: texto("anioParlamentario", 4),
    fechaDesde: texto("fechaDesde", 10),
    fechaHasta: texto("fechaHasta", 10),
  };
}

function permitir(request: Request): boolean {
  const ahora = Date.now();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const marcas = (visitas.get(ip) ?? []).filter((marca) => ahora - marca < 60_000);
  if (marcas.length >= 30) return false;
  marcas.push(ahora);
  visitas.set(ip, marcas);
  return true;
}

function demasiado() {
  return Response.json(
    { error: "Demasiadas consultas seguidas. Esperá un minuto para no saturar el registro público." },
    { status: 429 },
  );
}
