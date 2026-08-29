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

const SUPABASE_URL = "https://lrceqjxvewaesnaipfuq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyY2Vxanh2ZXdhZXNuYWlwZnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NjMxMTQsImV4cCI6MjEwMzUzOTExNH0" +
  ".28MM9n6hdY2y-jHksHhb0-b-CZ9zdbDFS-ismEDfq0k";

const HAY_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
