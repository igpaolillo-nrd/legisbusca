import { autocompletar } from "@/lib/legislatura/cliente";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 40);
  const tipo = url.searchParams.get("tipo");
  if (q.length < 3) return Response.json({ opciones: [] });
  const metodo = tipo === "ubicaciones" ? "GetUbicaciones" : tipo === "estados" ? "GetEstados" : "GetAutoresInternos";
  try {
    const opciones = await autocompletar(metodo, q);
    return Response.json({ opciones });
  } catch {
    return Response.json({ opciones: [], error: "No pude consultar el padrón en este momento." });
  }
}
