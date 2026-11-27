import { describe, expect, it } from "vitest";
import { interpretar, literalizar } from "./interpretar";

const AHORA = new Date("2026-11-26T18:00:00-03:00");

describe("intérprete legislativo", () => {
  it("traduce una frase cotidiana a la palabra que el sumario sí contiene", () => {
    const lectura = interpretar("No puedo pagar el alquiler", AHORA);
    expect(lectura.modo).toBe("dirigida");
    expect(lectura.termino).toBe("ALQUILER");
    expect(lectura.termino).not.toBe("NO PUEDO PAGAR EL ALQUILER");
    expect(lectura.comparacionLiteral).toBe(true);
    expect(lectura.resumen).toContain("ALQUILER");
    expect(lectura.autorTexto).toBeUndefined();
  });

  it("arma tipo, tema y año en una consulta de proyecto de ley", () => {
    const lectura = interpretar("proyecto de ley de transporte de este año", AHORA);
    expect(lectura.tipo).toEqual({ id: "1", nombre: "LEY" });
    expect(lectura.termino).toBe("TRANSPORTE");
    expect(lectura.anio).toBe("2026");
    expect(lectura.autorTexto).toBeUndefined();
  });

  it("reconoce el número de expediente en los dos formatos habituales", () => {
    expect(interpretar("expediente 3509-D-2026", AHORA).expediente).toEqual({ numero: "3509", anio: "2026" });
    expect(interpretar("Expediente 3509 de 2026", AHORA).modo).toBe("expediente");
    expect(interpretar("carátula expediente 3626-D-2026 programa de alquiler", AHORA).expediente).toEqual({
      numero: "3626",
      anio: "2026",
    });
  });

  it("separa autor, tipo y tema", () => {
    const lectura = interpretar("declaraciones de Grillo sobre teatro", AHORA);
    expect(lectura.tipo?.id).toBe("3");
    expect(lectura.autorTexto).toBe("grillo");
    expect(lectura.termino).toBe("TEATRO");
  });

  it("marca estado en comisión y el tema residuos", () => {
    const lectura = interpretar("en comisión sobre residuos", AHORA);
    expect(lectura.estado).toEqual({ id: "7", nombre: "EN COMISION" });
    expect(lectura.termino).toBe("RESIDUOS");
    expect(lectura.comisionTexto).toBeUndefined();
  });

  it("busca una ley sancionada por su número y no como palabra clave", () => {
    const lectura = interpretar("ley 6292", AHORA);
    expect(lectura.modo).toBe("ley");
    expect(lectura.leyNumero).toBe("6292");
    expect(lectura.termino).toBeUndefined();
  });

  it("pide más precisión cuando la consulta no tiene eje", () => {
    expect(interpretar("", AHORA).modo).toBe("vacia");
    expect(interpretar("proyectos de ley del año pasado", AHORA).modo).toBe("vacia");
    expect(interpretar("proyectos de ley del año pasado", AHORA).anio).toBe("2025");
  });

  it("toma subte, el año y una palabra alternativa", () => {
    const lectura = interpretar("subte este año", AHORA);
    expect(lectura.termino).toBe("SUBTE");
    expect(lectura.terminoAlternativo).toBe("SUBTERRANEO");
    expect(lectura.anio).toBe("2026");
  });

  it("lee el apellido compuesto después de diputada", () => {
    const lectura = interpretar("proyectos de la diputada La Blunda", AHORA);
    expect(lectura.autorTexto).toBe("la blunda");
    expect(lectura.modo).toBe("dirigida");
  });

  it("advierte el falso amigo de colectivo", () => {
    const lectura = interpretar("colectivo", AHORA);
    expect(lectura.termino).toBe("COLECTIVO");
    expect(lectura.advertencias.join(" ")).toContain("inconsciente");
  });

  it("lee un rango de fechas junto con el tema", () => {
    const lectura = interpretar("alquileres desde 01/03/2024 hasta 1/12/2024", AHORA);
    expect(lectura.termino).toBe("ALQUILER");
    expect(lectura.fechaDesde).toBe("01/03/2024");
    expect(lectura.fechaHasta).toBe("01/12/2024");
  });

  it("en modo literal no traduce la frase", () => {
    const lectura = literalizar(interpretar("No puedo pagar el alquiler", AHORA), "No puedo pagar el alquiler");
    expect(lectura.termino).toBe("No puedo pagar el alquiler");
    expect(lectura.tipo).toBeUndefined();
    expect(lectura.comparacionLiteral).toBe(false);
  });
});
