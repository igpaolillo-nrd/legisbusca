import Link from "next/link";

export function Marca({ chica = false }: { chica?: boolean }) {
  return (
    <Link
      href="/"
      className={
        chica
          ? "text-2xl font-medium tracking-tight text-white"
          : "text-[3.25rem] leading-none font-medium tracking-[-0.045em] text-white sm:text-[5.25rem]"
      }
    >
      LegisBusca
    </Link>
  );
}
