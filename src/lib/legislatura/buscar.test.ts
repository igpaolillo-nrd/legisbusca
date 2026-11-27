import { describe, expect, it } from "vitest";
import { buscar, elegir, puntaje } from "./buscar";
import type { Expediente } from "./tipos";
import type { FetchLike } from "./cliente";

const AHORA = new Date("2026-11-26T18:00:00-03:00");

function json(datos: unknown, status = 200): Response {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function expediente(parcial: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id_expediente: "10",
    nro_de_expediente: "3510-D-2026",
    sumario: "SE CREA EL PROGRAMA ALQUILER GARANTIZADO",
    autor_des: "PEREZ, ANA",
    coautores_des: "",
    tipo_proyecto_des: "LEY",
    fch_inicio: "1/3/2026",
    ubicacion_des: "COMISIÓN",
    descripcion: "EN COMISION",
    TieneSancion: "0",
    ...parcial,
  };
}

describe("búsqueda dirigida", () => {
  it("consulta ALQUILER y compara la frase literal", async () => {
    const urls: string[] = [];
    const fetchImpl: FetchLike = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("Sumario=ALQUILER")) return json([expediente()]);
      if (url.toLowerCase().includes("pagar")) return json([]);
      return json([]);
    };

    const respuesta = await buscar(
      { modo: "agente", consulta: "No puedo pagar el alquiler" },
      { fetchImpl, ahora: AHORA },
    );

    expect(respuesta.error).toBeUndefined();
    expect(respuesta.interpretacion.termino).toBe("ALQUILER");
    expect(respuesta.resultados).toHaveLength(1);
    expect(respuesta.resultados[0]?.numero).toBe("3510-D-2026");
    expect(respuesta.literal.consultada).toBe(true);
    expect(respuesta.literal.cantidad).toBe(0);
    expect(urls.some((url) => url.includes("Sumario=ALQUILER") && !url.toLowerCase().includes("pagar"))).toBe(true);
    expect(urls.some((url) => url.toLowerCase().includes("pagar"))).toBe(true);
  });

  it("resuelve al autor y manda su id junto con el tema y el tipo", async () => {
    const urls: string[] = [];
    const fetchImpl: FetchLike = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("GetAutoresInternos")) {
        return new Response(
          `<ArrayOfString><string>{"First":"GRILLO, ALEJANDRO OMAR","Second":"67243"}</string></ArrayOfString>`,
          { status: 200, headers: { "content-type": "text/xml" } },
        );
      }
      if (url.includes("Sumario=TEATRO")) {
        return json([
          expediente({
            id_expediente: "20",
            nro_de_expediente: "3684-D-2026",
            sumario: "SE DECLARA DE INTERÉS CULTURAL LA OBRA TEATRAL",
            autor_des: "GRILLO, ALEJANDRO OMAR",
            tipo_proyecto_des: "DECLARACION",
          }),
        ]);
      }
      return json([]);
    };

    const respuesta = await buscar(
      { modo: "agente", consulta: "declaraciones de Grillo sobre teatro" },
      { fetchImpl, ahora: AHORA },
    );

    expect(respuesta.autorResuelto).toEqual({ id: "67243", nombre: "GRILLO, ALEJANDRO OMAR" });
    expect(urls.some((url) => url.includes("IdAutoresInternos=67243") && url.includes("Sumario=TEATRO") && url.includes("IdProyectoTipo=3"))).toBe(true);
    expect(respuesta.resultados[0]?.tipo).toBe("DECLARACION");
  });

  it("busca por número de expediente sin pasar por el sumario", async () => {
    const urls: string[] = [];
    const fetchImpl: FetchLike = async (input) => {
      urls.push(String(input));
      return new Response(
        `<ArrayOfExpedienteAvanzado><expedienteAvanzado><id_expediente>99</id_expediente><nro_de_expediente>3509-D-2026</nro_de_expediente><sumario>ALQUILERES</sumario><autor_des>X</autor_des><tipo_proyecto_des>LEY</tipo_proyecto_des></expedienteAvanzado></ArrayOfExpedienteAvanzado>`,
        { status: 200, headers: { "content-type": "text/xml" } },
      );
    };

    const respuesta = await buscar(
      { modo: "agente", consulta: "3509-D-2026" },
      { fetchImpl, ahora: AHORA },
    );

    expect(urls[0]).toContain("GetExpedienteByNroyAnio");
    expect(urls[0]).toContain("NroExpediente=3509");
    expect(respuesta.resultados[0]?.urlOficial).toContain("expediente.aspx?id=99");
  });

  it("explica cuando el registro no responde", async () => {
    const fetchImpl: FetchLike = async () => json({ mensaje: "no" }, 500);
    const respuesta = await buscar(
      { modo: "agente", consulta: "alquileres" },
      { fetchImpl, ahora: AHORA },
    );
    expect(respuesta.error).toContain("registro público");
    expect(respuesta.resultados).toEqual([]);
  });
});

describe("catálogo y orden", () => {
  it("prefiere el apellido exacto frente a una coincidencia parcial", () => {
    const elegido = elegir(
      [
        { id: "1", nombre: "ESCUELA GRIERSON" },
        { id: "2", nombre: "GRILLO, ALEJANDRO OMAR" },
      ],
      "grillo",
    );
    expect(elegido?.id).toBe("2");
  });

  it("baja los sumarios de inconsciente colectivo", () => {
    const interpretacion = {
      textoOriginal: "colectivo",
      resumen: "",
      modo: "dirigida" as const,
      termino: "COLECTIVO",
      comparacionLiteral: false,
      advertencias: [],
    };
    const transporte: Expediente = {
      id: "1",
      numero: "10-D-2026",
      sumario: "PARADA DE COLECTIVOS",
      autor: "",
      coautores: "",
      tipo: "",
      inicio: "",
      ultimoMovimiento: "",
      ubicacion: "",
      estado: "",
      sancionado: null,
      urlOficial: "",
    };
    const otro: Expediente = { ...transporte, id: "2", numero: "11-D-2026", sumario: "INCONSCIENTE COLECTIVO" };
    expect(puntaje(transporte, interpretacion)).toBeGreaterThan(puntaje(otro, interpretacion));
  });
});
