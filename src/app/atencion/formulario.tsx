"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, type FormEvent } from "react";

const CORREO = "atencion.ciudadana@legislatura.gob.ar";

export function FormularioAtencion() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [aviso, setAviso] = useState("");

  function redactar(evento: FormEvent) {
    evento.preventDefault();
    if (mensaje.trim().length < 10) {
      setAviso("Contá la consulta en al menos una oración.");
      return;
    }
    const asunto = "Consulta desde el prototipo LegisBusca";
    const cuerpo = [`Nombre: ${nombre || "sin nombre"}`, `Correo: ${correo || "sin correo"}`, "", mensaje.trim()].join("\n");
    const href = `mailto:${CORREO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    setAviso("Se abre tu correo. Este prototipo no guarda el mensaje ni lo envía por su cuenta.");
    window.location.href = href;
  }

  return (
    <form onSubmit={redactar} className="mt-6 grid max-w-xl gap-4">
      <div>
        <Label htmlFor="nombre" className="mb-1.5">Nombre</Label>
        <Input id="nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="correo" className="mb-1.5">Tu correo</Label>
        <Input id="correo" type="email" value={correo} onChange={(evento) => setCorreo(evento.target.value)} autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="mensaje" className="mb-1.5">Mensaje</Label>
        <Textarea id="mensaje" value={mensaje} onChange={(evento) => setMensaje(evento.target.value)} className="min-h-32" />
      </div>
      <Button type="submit" className="w-fit">Redactar correo a Atención Ciudadana</Button>
      {aviso ? <p className="text-sm text-[#fdd663]">{aviso}</p> : null}
    </form>
  );
}
