const base = (process.env.BASE_URL ?? "http://127.0.0.1:3457").replace(/\/$/, "");

async function pedir(ruta) {
  const respuesta = await fetch(`${base}${ruta}`);
  const texto = await respuesta.text();
  let cuerpo;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    cuerpo = texto;
  }
  return { status: respuesta.status, cuerpo };
}

const inicio = await pedir("/");
if (inicio.status !== 200 || typeof inicio.cuerpo !== "string" || !inicio.cuerpo.includes("LegisBusca")) {
  console.error("La portada no respondió como se esperaba", inicio.status);
  process.exit(1);
}

const alquiler = await pedir(`/api/buscar?q=${encodeURIComponent("No puedo pagar el alquiler")}&modo=agente`);
if (alquiler.status !== 200) {
  console.error("La búsqueda dirigida falló", alquiler.status, alquiler.cuerpo);
  process.exit(1);
}
if (alquiler.cuerpo.interpretacion?.termino !== "ALQUILER") {
  console.error("El agente no tradujo la frase a ALQUILER", alquiler.cuerpo.interpretacion);
  process.exit(1);
}
if (!alquiler.cuerpo.literal?.consultada) {
  console.error("No se comparó contra la frase completa");
  process.exit(1);
}

const expediente = await pedir(`/api/buscar?q=${encodeURIComponent("3509-D-2026")}&modo=agente`);
if (expediente.status !== 200 || expediente.cuerpo.interpretacion?.modo !== "expediente") {
  console.error("No resolvió el número de expediente", expediente.status, expediente.cuerpo.interpretacion);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      base,
      fraseCotidiania: {
        termino: alquiler.cuerpo.interpretacion.termino,
        fraseCompleta: alquiler.cuerpo.literal.cantidad,
        dirigida: alquiler.cuerpo.resultados.length,
      },
      expediente: expediente.cuerpo.resultados[0]?.numero ?? null,
    },
    null,
    2,
  ),
);
