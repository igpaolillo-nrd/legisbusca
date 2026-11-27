export type Expediente = {
  id: string;
  numero: string;
  sumario: string;
  autor: string;
  coautores: string;
  tipo: string;
  inicio: string;
  ultimoMovimiento: string;
  ubicacion: string;
  estado: string;
  sancionado: boolean | null;
  urlOficial: string;
};

export type OpcionCatalogo = {
  id: string;
  nombre: string;
};

export const REGISTRO_OFICIAL = "https://parlamentaria.legislatura.gob.ar";
export const BUSCADOR_OFICIAL = `${REGISTRO_OFICIAL}/pages/ExpedienteBusqueda.aspx`;

export function urlExpediente(id: string): string {
  if (!id) return BUSCADOR_OFICIAL;
  return `${REGISTRO_OFICIAL}/pages/expediente.aspx?id=${encodeURIComponent(id)}`;
}
