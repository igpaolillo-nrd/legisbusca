import { cerrar, type Interpretacion, type TipoProyecto } from "./interpretar";
import { normalizar } from "./normalizar";

export type Refinamiento = {
  termino?: string;
  terminoAlternativo?: string;
  tipoId?: TipoProyecto["id"];
  anio?: string;
  autorTexto?: string;
  comisionTexto?: string;
};

const TIPOS: Record<TipoProyecto["id"], TipoProyecto> = {
  "1": { id: "1", nombre: "LEY" },
  "2": { id: "2", nombre: "RESOLUCION" },
  "3": { id: "3", nombre: "DECLARACION" },
};

export function aplicarRefinamiento(base: Interpretacion, ref: Refinamiento): Interpretacion | null {
  if (base.modo === "expediente" || base.modo === "ley") return null;

  const siguiente = { ...base, advertencias: [...base.advertencias] };
  if (ref.termino !== undefined) {
    const termino = ref.termino.trim().replace(/\s+/g, " ").toUpperCase();
    const palabras = termino.split(" ").filter(Boolean);
    if (!/^[A-Z0-9 ]{2,40}$/.test(termino) || palabras.length > 4) return null;
    if (palabras.length > 2 && normalizar(termino) === normalizar(base.textoOriginal)) return null;
    siguiente.termino = termino;
    siguiente.modo = "dirigida";
  }
  if (ref.terminoAlternativo !== undefined) {
    const alternativo = ref.terminoAlternativo.trim().toUpperCase();
    if (/^[A-Z0-9 ]{2,40}$/.test(alternativo)) siguiente.terminoAlternativo = alternativo;
  }
  if (ref.tipoId && TIPOS[ref.tipoId]) siguiente.tipo = TIPOS[ref.tipoId];
  if (ref.anio && /^20\d{2}$/.test(ref.anio)) siguiente.anio = ref.anio;
  if (ref.autorTexto) {
    const autor = normalizar(ref.autorTexto);
    if (autor && autor.split(" ").length <= 3) siguiente.autorTexto = autor;
  }
  if (ref.comisionTexto) {
    const comision = normalizar(ref.comisionTexto);
    if (comision && comision.split(" ").length <= 4) siguiente.comisionTexto = comision;
  }

  if (siguiente.modo === "vacia" && !siguiente.termino && !siguiente.autorTexto && !siguiente.comisionTexto) {
    return null;
  }
  if (siguiente.modo === "vacia") siguiente.modo = "dirigida";

  siguiente.advertencias = siguiente.advertencias.filter((nota) => !nota.startsWith("Un modelo gratuito"));
  siguiente.advertencias.push(
    "Un modelo gratuito ajustó los filtros. La explicación sale de esos filtros, no de un texto generado.",
  );
  return cerrar(siguiente);
}

export async function refinarConModelo(base: Interpretacion): Promise<Refinamiento | null> {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return null;
  if (base.modo === "expediente" || base.modo === "ley") return null;

  const modelo = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const prompt = [
    "Sos un asistente que traduce una consulta ciudadana a filtros del buscador de expedientes de la Legislatura de la CABA.",
    "El registro busca una frase dentro del sumario. Una oración cotidiana devuelve cero resultados.",
    "Devolvé solo JSON con las claves que quieras corregir: termino, terminoAlternativo, tipoId (1 ley, 2 resolucion, 3 declaracion), anio, autorTexto, comisionTexto.",
    "termino tiene que ser 1 a 4 palabras que podrían aparecer en un sumario oficial, en español, sin la oración original.",
    "No inventes números de expediente.",
    `Consulta: ${base.textoOriginal}`,
    `Lectura actual: ${JSON.stringify({
      termino: base.termino ?? null,
      tipoId: base.tipo?.id ?? null,
      anio: base.anio ?? null,
      autorTexto: base.autorTexto ?? null,
      comisionTexto: base.comisionTexto ?? null,
    })}`,
  ].join("\n");

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 6000);
  try {
    const respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${clave}`,
      {
        method: "POST",
        signal: controlador.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
      },
    );
    if (!respuesta.ok) return null;
    const cuerpo = (await respuesta.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const texto = cuerpo.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) return null;
    return JSON.parse(texto) as Refinamiento;
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}

export async function describirImagen(bytes: Buffer, mime: string): Promise<{ texto: string; consulta: string } | null> {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return null;
  const modelo = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 12000);
  try {
    const respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${clave}`,
      {
        method: "POST",
        signal: controlador.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: "Mirá la imagen. Si hay texto, transcribilo. Después proponé una consulta corta, en español cotidiano de Argentina, para buscar expedientes de la Legislatura de la CABA. Respondé solo JSON: {\"texto\":\"...\",\"consulta\":\"...\"}.",
                },
                { inline_data: { mime_type: mime, data: bytes.toString("base64") } },
              ],
            },
          ],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
      },
    );
    if (!respuesta.ok) return null;
    const cuerpo = (await respuesta.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const texto = cuerpo.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) return null;
    const parsed = JSON.parse(texto) as { texto?: string; consulta?: string };
    if (!parsed.consulta?.trim()) return null;
    return { texto: parsed.texto?.trim() ?? "", consulta: parsed.consulta.trim().slice(0, 500) };
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}
