-- Supabase, public şemadaki tabloları anon/authenticated rolleriyle Data API'den (PostgREST) de açar.
-- Pusula bu API'yi kullanmaz; sunucu veritabanına tablo sahibi rolle doğrudan bağlanır ve RLS'ten etkilenmez.
-- Politikası olmayan RLS = Data API'den hiçbir satır okunamaz/yazılamaz. Yeni tabloya da eklenmeli.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '__drizzle_migrations' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
