# LegisBusca

Prototipo académico del **Programa de Formación en Inteligencia Artificial Aplicada al Trabajo Legislativo**.

No es un sitio de la Legislatura de la Ciudad Autónoma de Buenos Aires. Consulta el registro público de expedientes y muestra, al lado, cómo un agente traduce una pregunta cotidiana a una búsqueda que ese registro puede responder.

Repositorio público: [github.com/igpaolillo-nrd/legisbusca](https://github.com/igpaolillo-nrd/legisbusca).

Demo: [legisbusca.vercel.app](https://legisbusca.vercel.app). Funciona sin clave de modelo.

## El problema

El buscador oficial pide palabras clave sobre el sumario:

<https://parlamentaria.legislatura.gob.ar/pages/ExpedienteBusqueda.aspx>

El sumario es una frase normativa, casi siempre en mayúsculas («SE CREA EL PROGRAMA ALQUILER GARANTIZADO»). El webservice busca esa frase como texto contenido, no como una idea. Por eso:

- «no puedo pagar el alquiler» devuelve **cero** expedientes;
- «ALQUILER» devuelve los proyectos que hablan de alquiler.

La consulta ciudadana y el índice oficial no hablan el mismo idioma. El agente hace esa traducción y la deja a la vista.

## Cómo se usa

1. En la portada, escribí como le contarías el tema a otra persona. Enter busca.
2. **Modo agente** (activo al entrar) elige tipo, año, autor, comisión y una palabra de sumario. **Modo literal** manda la frase tal cual, para ver el comportamiento del buscador clásico.
3. El micrófono dicta en español (`es-AR`) si el navegador lo permite. Chrome y Edge suelen tenerlo; hace falta permiso de micrófono.
4. La cámara, o el signo +, adjunta una imagen. El texto se lee **en el navegador** con un OCR de código abierto y después entra al mismo agente. La imagen no se sube.
5. Si el OCR no encuentra texto y hay una clave gratuita de Gemini configurada, se puede pedir una interpretación de la imagen. Hay que confirmarlo: esa imagen sí sale del navegador y no se guarda en este prototipo.
6. **Versión clásica** abre el formulario sin agente: número, sumario literal, tipo, autor, fechas.
7. **Atención al ciudadano** muestra los canales públicos de la Oficina de Atención Ciudadana y arma un correo. Este prototipo no tiene bandeja ni base de datos.

Debajo de cada resultado está el enlace al expediente en el registro oficial. Conviene verificar ahí el texto y el estado.

Ejemplos que muestran la diferencia:

- `No puedo pagar el alquiler`
- `Proyecto de ley de transporte de este año`
- `Declaraciones de Grillo sobre teatro`
- `Expediente 3509-D-2026`

## Qué hace el agente

La pieza que siempre está encendida es un intérprete determinístico. No llama a un modelo para poder funcionar.

1. Normaliza la consulta (minúsculas, sin acentos).
2. Si hay un expediente (`3509-D-2026` o «expediente 3509 de 2026»), lo busca por número y año.
3. Si hay un número de ley (`ley 6292`) y no es «proyecto de ley», busca la sanción, no la palabra «ley».
4. Detecta tipo (ley, resolución, declaración), año («este año», «el año pasado» o un año escrito), fechas, estado «en comisión» y si se pide algo sancionado.
5. Busca un tema en un léxico de lenguaje cotidiano → palabra de sumario. «no puedo pagar el alquiler» queda en `ALQUILER`. La frase larga se descarta a propósito.
6. Si nombra a una diputada o un diputado, o dice «de Grillo», consulta el autocompletado público de autores y usa el id oficial.
7. Si nombra una comisión, resuelve su id de ubicación.
8. Llama al webservice con esos filtros, no con la oración original.
9. En paralelo, si la frase era larga, repite la búsqueda con el texto crudo y muestra las dos cantidades.
10. Ordena la muestra. Baja, por ejemplo, «inconsciente colectivo» cuando la consulta era sobre el transporte.

Si la consulta es solo «proyecto de ley» o «el año pasado», no dispara una búsqueda enorme: pide un tema, un autor, una comisión o un número.

El código está en `src/lib/agente/interpretar.ts` y `src/lib/legislatura/buscar.ts`. Las pruebas de `src/lib/agente/interpretar.test.ts` fijan la fecha en el 26 de noviembre de 2026 para que «este año» sea estable.

### Voz e imagen

| Entrada | Dónde corre | Qué necesita |
| --- | --- | --- |
| Teclado | Servidor, intérprete | Nada |
| Voz | Navegador, Web Speech API, `es-AR` | Un navegador que la exponga y permiso de micrófono |
| Imagen con texto | Navegador, [Tesseract.js](https://github.com/naptha/tesseract.js) con el modelo `spa` | La primera vez descarga el modelo de idioma |
| Imagen sin texto | Opcional, API de Gemini | `GEMINI_API_KEY` |

«Escuchar» usa la síntesis de voz del navegador para leer la explicación y los primeros sumarios.

## De dónde salen los datos

Webservice público de la Secretaría Parlamentaria, sin clave:

`https://parlamentaria.legislatura.gob.ar/webservices/Json.asmx`

LegisBusca usa, entre otros:

- `GetExpedienteAvanzadaJson` para la búsqueda dirigida;
- `GetExpedienteByNroyAnio` para el número;
- `GetSancionNroDeLey` para una ley ya sancionada;
- `AutoCompletar.asmx` (`GetAutoresInternos`, `GetUbicaciones`, `GetEstados`) para los ids.

El parámetro `Sumario` es una frase contenida. No es un buscador de texto completo del proyecto ni una búsqueda semántica. Por eso el agente elige **una** palabra o una frase corta, y solo si la primera falla prueba una alternativa.

Cada consulta manda como máximo unas pocas peticiones, con tope de 12 resultados, un tiempo de espera de 18 segundos y un límite de 30 consultas por minuto por instancia. Hay una caché de 20 segundos para la misma pregunta. El identificador que viaja es `LegisBusca/0.1 (prototipo academico; consulta publica)`.

Nada de lo que se escribe se guarda. No hay cuentas ni base de datos.

## Infraestructura

### Lo que corre en la demo

```text
navegador
  voz (Web Speech API) y OCR (Tesseract.js, modelo spa)
        |
        v
Next.js en Vercel
  intérprete legislativo  ----opcional---->  Gemini, nivel gratuito
        |
        v
webservice público de parlamentaria.legislatura.gob.ar
```

Recursos gratuitos que alcanzan para la demo:

- el hosting de Vercel en el plan hobby;
- el intérprete, que no tiene costo por consulta;
- la Web Speech API;
- Tesseract y sus datos de idioma, de código abierto;
- el webservice público de la Legislatura;
- la API de Gemini en su nivel gratuito, solo si alguien carga `GEMINI_API_KEY`.

Sin esa clave, la portada, la voz, el OCR y la búsqueda dirigida funcionan igual. El modelo, cuando está, solo puede corregir filtros (palabra, tipo, año, autor, comisión). No redacta la explicación: el texto «Cómo lo entendí» se arma de nuevo a partir de los filtros, para que se pueda auditar. Si devuelve la oración completa, se descarta.

### Lo que esta demo no monta

Para un uso interno de la Legislatura, la misma idea se apoyaría en otra infraestructura. No está aplicada acá; el prototipo muestra el recorrido con piezas gratuitas.

1. **Agente con herramientas.** Vercel AI SDK, con un modelo detrás de [AI Gateway](https://vercel.com/docs/ai-gateway). El modelo no buscaría por su cuenta: llamaría herramientas tipadas (`interpretar`, `buscar_expediente`, `resolver_autor`, `resolver_comision`, `leer_imagen`). El intérprete actual sería la herramienta, no un prompt suelto. Así la salida sigue siendo un filtro comprobable.
2. **Modelo.** En el nivel gratuito, Gemini Flash o un modelo abierto servido por Groq. En un entorno de la Legislatura, un modelo contratado o alojado por la propia administración, con los datos que no deban salir de ese perímetro.
3. **Índice propio.** El `LIKE` del sumario alcanza para la demo y falla con homónimos («colectivo», «locación» dentro de «colocación»). El paso siguiente es copiar los sumarios públicos a Postgres y sumar búsqueda de texto completo; embeddings solo si ese índice sigue sin alcanzar. No hace falta un vector store para traducir «no puedo pagar el alquiler».
4. **OCR y visión.** En el navegador alcanza para una carátula. Un worker (cola de Vercel o un proceso aparte) haría falta para lotes de PDF del expediente digital, que hoy el webservice no siempre expone.
5. **Observabilidad.** Registrar los filtros elegidos y si la persona abrió el expediente oficial. No registrar el audio ni la imagen. Con eso se puede medir si el léxico traduce bien, que es la evaluación que le importa a este trabajo.
6. **Identidad y trámites.** Quedan en la Oficina de Atención Ciudadana. Este prototipo no inicia expedientes ni guarda mensajes.

## Cómo correrlo

Hace falta Node 22.

```bash
npm ci
npm run dev
```

La aplicación queda en <http://127.0.0.1:3457>.

```bash
npm test          # intérprete, refinamiento y búsqueda con el registro simulado
npm run typecheck
npm run build
npm run prueba:api
```

`prueba:api` pega contra la app ya levantada. Para una instancia desplegada:

```bash
BASE_URL=https://legisbusca.vercel.app npm run prueba:api
```

Esa prueba sí habla con el webservice de la Legislatura. Las de `npm test` no.

Variables opcionales, en `.env.local` (hay un modelo en `.env.example`):

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
```

## Despliegue

El proyecto es Next.js y está publicado en [legisbusca.vercel.app](https://legisbusca.vercel.app), con las funciones en la región `gru1` (São Paulo), la más cercana a Buenos Aires que ofrece el plan. El código no depende de esa región.

No hay secretos obligatorios. Si se carga `GEMINI_API_KEY`, se hace en las variables de entorno del proyecto, no en el repositorio.

## Límites

- El índice oficial es el sumario, no el articulado.
- El léxico cubre temas frecuentes de una consulta ciudadana, no todo el vocabulario parlamentario. Una palabra suelta que no esté en el léxico y no sea un autor se considera demasiado amplia y el agente pide más datos, a propósito.
- El autocompletado de autores devuelve también organismos. Se prefiere el apellido que coincide; puede haber homónimos.
- La voz depende del navegador. El OCR falla con fotos borrosas o con letra manuscrita.
- Los resultados son una muestra de hasta 12 expedientes, reordenada. El estado «sancionado» a veces no viene en la respuesta JSON del registro; cuando falta, se dice.
- Los horarios y teléfonos de atención se tomaron de la [ficha oficial](https://www.legislatura.gob.ar/seccion/oficina-de-atencion-ciudadana.html). Si esa ficha cambia, manda la ficha.

## Licencia

MIT. El contenido de los expedientes pertenece a su registro de origen.
