import { Consulta } from "@/components/consulta";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const parametros = await searchParams;
  return <Consulta consultaInicial={parametros.q ?? ""} />;
}
