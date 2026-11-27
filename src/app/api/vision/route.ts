import { describirImagen } from "@/lib/agente/modelo";

export const dynamic = "force-dynamic";

const MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function GET() {
  return Response.json({ disponible: Boolean(process.env.GEMINI_API_KEY) });
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "No hay un modelo de visión configurado. La lectura de texto sigue funcionando en el navegador." },
      { status: 501 },
    );
  }
  let cuerpo: { imagen?: string; mime?: string };
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "No pude leer la imagen." }, { status: 400 });
  }
  const mime = cuerpo.mime ?? "";
  const imagen = cuerpo.imagen ?? "";
  if (!MIMES.has(mime) || !imagen) {
    return Response.json({ error: "Usá una imagen JPEG, PNG, WEBP o GIF." }, { status: 400 });
  }
  if (imagen.length > 5_500_000) {
    return Response.json({ error: "La imagen es demasiado pesada. Probá con una de menos de 4 MB." }, { status: 413 });
  }
  const bytes = Buffer.from(imagen, "base64");
  const lectura = await describirImagen(bytes, mime);
  if (!lectura) {
    return Response.json({ error: "El modelo de visión no pudo interpretar la imagen." }, { status: 502 });
  }
  return Response.json(lectura);
}
