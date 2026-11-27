import { describe, expect, it } from "vitest";
import { interpretar } from "./interpretar";
import { aplicarRefinamiento } from "./modelo";

const AHORA = new Date("2026-11-26T18:00:00-03:00");

describe("refinamiento del modelo", () => {
  it("acepta una palabra de sumario y reescribe la explicación", () => {
    const base = interpretar("no puedo pagar el alquiler", AHORA);
    const ajustada = aplicarRefinamiento(base, { termino: "alquileres" });
    expect(ajustada?.termino).toBe("ALQUILERES");
    expect(ajustada?.resumen).toContain("ALQUILERES");
    expect(ajustada?.advertencias.join(" ")).toContain("modelo gratuito");
  });

  it("rechaza devolver la oración completa como filtro", () => {
    const base = interpretar("no puedo pagar el alquiler", AHORA);
    expect(aplicarRefinamiento(base, { termino: "no puedo pagar el alquiler" })).toBeNull();
  });

  it("no pisa un expediente ya identificado", () => {
    const base = interpretar("3509-D-2026", AHORA);
    expect(aplicarRefinamiento(base, { termino: "TEATRO" })).toBeNull();
  });
});
