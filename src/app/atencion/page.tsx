import { FormularioAtencion } from "@/app/atencion/formulario";
import { Marca } from "@/components/marca";
import { Pie } from "@/components/pie";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Atención al ciudadano · LegisBusca",
  description: "Canales públicos de la Oficina de Atención Ciudadana de la Legislatura de la CABA y contacto sobre este prototipo.",
};

const CANALES = [
  { titulo: "Presencial", detalle: "Perú 160, C1067AAD, Ciudad Autónoma de Buenos Aires. Hay que presentar DNI para ingresar." },
  { titulo: "Teléfono", detalle: "011 4338-3000, internos 1092 y 1096." },
  { titulo: "Horario", detalle: "Lunes a viernes de 10 a 17 h, según la Oficina de Atención Ciudadana." },
  { titulo: "Correo", detalle: "atencion.ciudadana@legislatura.gob.ar" },
];

export default function AtencionPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#202124] text-[#e8eaed]">
      <header className="flex items-center justify-between px-4 py-4">
        <Marca chica />
        <Link href="/" className="text-sm text-[#8ab4f8] hover:underline">
          Volver al agente
        </Link>
      </header>
      <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-3xl font-medium text-white">Atención al ciudadano</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#bdc1c6]">
          LegisBusca es un prototipo del Programa de Formación en Inteligencia Artificial Aplicada al Trabajo Legislativo. No reemplaza a la Legislatura. Para una consulta institucional, el canal es la Oficina de Atención Ciudadana.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {CANALES.map((canal) => (
            <li key={canal.titulo} className="rounded-2xl border border-[#3c4043] bg-[#303134] p-4">
              <p className="text-sm font-medium text-white">{canal.titulo}</p>
              <p className="mt-1 text-sm leading-6 text-[#bdc1c6]">{canal.detalle}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <a className="text-[#8ab4f8] hover:underline" href="https://www.legislatura.gob.ar/seccion/oficina-de-atencion-ciudadana.html">
            Ficha oficial de la Oficina de Atención Ciudadana
          </a>
        </p>
        <h2 className="mt-10 text-xl font-medium text-white">Escribir sobre este prototipo</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#bdc1c6]">
          El formulario arma un correo para la Oficina de Atención Ciudadana. No hay bandeja propia ni base de datos: si el mensaje no sale de tu programa de correo, no se envió.
        </p>
        <FormularioAtencion />
      </main>
      <Pie />
    </div>
  );
}
