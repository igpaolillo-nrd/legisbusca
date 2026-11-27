export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/ñ/g, "n")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[“”«»]/g, " ")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function anioEnBuenosAires(ahora = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Buenos_Aires",
      year: "numeric",
    }).format(ahora),
  );
}
