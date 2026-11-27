export type Tema = {
  frases: string[];
  termino: string;
  alternativo?: string;
  nota?: string;
  peso: number;
};

export const TEMAS: Tema[] = [
  {
    frases: ["no puedo pagar el alquiler", "contrato de alquiler", "alquileres", "alquiler", "inquilino", "inquilinos"],
    termino: "ALQUILER",
    peso: 3,
  },
  {
    frases: ["subte", "subterraneo", "subterraneos"],
    termino: "SUBTE",
    alternativo: "SUBTERRANEO",
    peso: 3,
  },
  {
    frases: ["parada de colectivos", "linea de colectivo", "colectivos", "colectivo", "bondi", "bondis"],
    termino: "COLECTIVO",
    nota: "COLECTIVO también aparece en frases ajenas al transporte, como «inconsciente colectivo». Si el resultado no habla de líneas o paradas, reformulá la consulta.",
    peso: 3,
  },
  {
    frases: ["transporte publico", "transporte"],
    termino: "TRANSPORTE",
    peso: 2,
  },
  {
    frases: ["transito", "semaforo", "semaforos"],
    termino: "TRANSITO",
    peso: 2,
  },
  {
    frases: ["recoleccion de residuos", "residuos", "basura"],
    termino: "RESIDUOS",
    peso: 3,
  },
  {
    frases: ["educacion", "escuela", "escuelas", "docente", "docentes"],
    termino: "EDUCACION",
    peso: 2,
  },
  {
    frases: ["hospital", "hospitales"],
    termino: "HOSPITAL",
    peso: 3,
  },
  {
    frases: ["salud publica", "salud"],
    termino: "SALUD",
    peso: 2,
  },
  {
    frases: ["policia", "policial"],
    termino: "POLICIA",
    peso: 3,
  },
  {
    frases: ["inseguridad", "seguridad"],
    termino: "SEGURIDAD",
    peso: 2,
  },
  {
    frases: ["espacio verde", "espacios verdes", "arbolado", "arboles"],
    termino: "ARBOLADO",
    peso: 2,
  },
  {
    frases: ["violencia de genero", "genero"],
    termino: "GENERO",
    peso: 3,
  },
  {
    frases: ["mascotas", "mascota", "animales", "animal"],
    termino: "ANIMALES",
    peso: 2,
  },
  {
    frases: ["ciclovia", "ciclovias", "bicicletas", "bicicleta", "bici"],
    termino: "BICICLETA",
    peso: 3,
  },
  {
    frases: ["estacionamiento"],
    termino: "ESTACIONAMIENTO",
    peso: 3,
  },
  {
    frases: ["adultos mayores", "adulto mayor", "jubilados", "jubiladas"],
    termino: "MAYORES",
    peso: 2,
  },
  {
    frases: ["discapacidad"],
    termino: "DISCAPACIDAD",
    peso: 3,
  },
  {
    frases: ["vivienda", "viviendas"],
    termino: "VIVIENDA",
    peso: 2,
  },
  {
    frases: ["presupuesto"],
    termino: "PRESUPUESTO",
    peso: 2,
  },
  {
    frases: ["impuestos", "impuesto"],
    termino: "IMPUESTO",
    peso: 2,
  },
  {
    frases: ["teatro"],
    termino: "TEATRO",
    peso: 3,
  },
  {
    frases: ["cultura", "cultural"],
    termino: "CULTURAL",
    peso: 1,
  },
  {
    frases: ["deporte", "deportes"],
    termino: "DEPORTE",
    peso: 2,
  },
  {
    frases: ["ambiente", "ambiental"],
    termino: "AMBIENTAL",
    peso: 2,
  },
  {
    frases: ["empleo", "trabajo"],
    termino: "EMPLEO",
    nota: "EMPLEO es amplio. Si buscás un oficio concreto, nombralo.",
    peso: 1,
  },
  {
    frases: ["comercio", "comercios", "pymes", "pyme"],
    termino: "COMERCIO",
    peso: 2,
  },
  {
    frases: ["turismo", "turistico", "turisticos"],
    termino: "TURISMO",
    peso: 2,
  },
  {
    frases: ["ninez", "ninos", "ninas", "infancia"],
    termino: "NINEZ",
    peso: 2,
  },
  {
    frases: ["inundacion", "inundaciones"],
    termino: "INUNDACION",
    peso: 3,
  },
  {
    frases: ["vereda", "veredas"],
    termino: "VEREDA",
    peso: 3,
  },
];

export const STOP = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "que", "no",
  "puedo", "pagar", "quiero", "busco", "buscar", "hay", "sobre", "para", "con", "sin",
  "este", "esta", "estos", "estas", "ano", "pasado", "proyecto", "proyectos", "ley",
  "declaracion", "declaraciones", "resolucion", "resoluciones", "en", "comision",
  "comisiones", "diputado", "diputada", "diputados", "diputadas", "legislador",
  "legisladora", "legisladores", "autor", "autora", "autores", "presentado", "presentada",
  "por", "me", "interesa", "necesito", "saber", "informes", "informe", "pedido",
  "expediente", "numero", "nro", "ciudad", "caba", "legislatura", "algo", "como",
  "cuando", "donde", "cual", "cuales", "son", "estan", "fue", "ser", "es", "tema",
  "temas", "relacion", "relacionado", "relacionados", "acerca", "ultimo", "ultima",
  "reciente", "recientes", "nuevo", "nueva", "actual", "actuales", "curso", "publico",
  "publica", "oficial", "consulta", "ver", "mostrar", "todos", "todas", "solo",
  "solamente", "ya", "muy", "mas", "menos", "caro", "caros", "cara", "caras", "alto",
  "alta", "problema", "problemas", "situacion", "caso", "casos", "gente", "vecino",
  "vecinos", "vecina", "vecinas", "barrio", "barrios", "interes", "entre", "desde",
  "hasta", "sancionado", "sancionada", "sancionados", "aprobado", "aprobada",
  "archivado", "archivada", "archivo",
]);
