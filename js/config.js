/* ============================================================
   CONEXION CON SUPABASE
   ------------------------------------------------------------
   Rellena estos dos valores con los de tu proyecto:
     Supabase > Project Settings > Data API

   La clave "anon" es PUBLICA por diseño y se puede subir a GitHub sin
   problema: no da acceso a nada por si sola, quien manda son las reglas
   de seguridad del archivo sql/schema.sql.

   NUNCA pongas aqui la clave "service_role". Esa se salta todas las
   reglas y daria acceso total a la base a cualquiera que vea el codigo.
   ============================================================ */

const SUPABASE_URL = "";      // https://xxxxxxxxxxxx.supabase.co
const SUPABASE_ANON_KEY = ""; // eyJhbGciOi...

const HAY_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
