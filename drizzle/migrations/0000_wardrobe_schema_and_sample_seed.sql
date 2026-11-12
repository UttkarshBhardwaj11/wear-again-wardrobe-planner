-- Enums
CREATE TYPE public.garment_category AS ENUM ('TOPS', 'BOTTOMS', 'FOOTWEAR', 'ETHNIC', 'OUTERWEAR');
CREATE TYPE public.occasion AS ENUM ('CASUAL', 'FORMAL', 'PARTY', 'WEDDING');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  onboarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Garments
CREATE TABLE public.garments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  category public.garment_category NOT NULL,
  name text NOT NULL,
  color text NOT NULL,
  image_url text NOT NULL,
  source_url text,
  brand text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX garments_user_idx ON public.garments(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.garments TO authenticated;
GRANT ALL ON public.garments TO service_role;
ALTER TABLE public.garments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own garments" ON public.garments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users add own garments" ON public.garments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own garments" ON public.garments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own garments" ON public.garments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Garment occasions
CREATE TABLE public.garment_occasions (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  garment_id uuid NOT NULL REFERENCES public.garments(id) ON DELETE CASCADE,
  occasion public.occasion NOT NULL,
  PRIMARY KEY (garment_id, occasion)
);
CREATE INDEX garment_occasions_user_idx ON public.garment_occasions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.garment_occasions TO authenticated;
GRANT ALL ON public.garment_occasions TO service_role;
ALTER TABLE public.garment_occasions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own garment occasions" ON public.garment_occasions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users add own garment occasions" ON public.garment_occasions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.garments g WHERE g.id = garment_id AND g.user_id = auth.uid()));
CREATE POLICY "Users delete own garment occasions" ON public.garment_occasions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Outfits
CREATE TABLE public.outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  occasion public.occasion NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outfits_user_idx ON public.outfits(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outfits TO authenticated;
GRANT ALL ON public.outfits TO service_role;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own outfits" ON public.outfits FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users add own outfits" ON public.outfits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own outfits" ON public.outfits FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own outfits" ON public.outfits FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Outfit garments
CREATE TABLE public.outfit_garments (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  outfit_id uuid NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  garment_id uuid NOT NULL REFERENCES public.garments(id) ON DELETE CASCADE,
  PRIMARY KEY (outfit_id, garment_id)
);
CREATE INDEX outfit_garments_user_idx ON public.outfit_garments(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outfit_garments TO authenticated;
GRANT ALL ON public.outfit_garments TO service_role;
ALTER TABLE public.outfit_garments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own outfit garments" ON public.outfit_garments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users add own outfit garments" ON public.outfit_garments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.outfits o WHERE o.id = outfit_id AND o.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.garments g WHERE g.id = garment_id AND g.user_id = auth.uid())
  );
CREATE POLICY "Users delete own outfit garments" ON public.outfit_garments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Calendar plans
CREATE TABLE public.calendar_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  outfit_id uuid NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  plan_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX calendar_plans_user_date_idx ON public.calendar_plans(user_id, plan_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_plans TO authenticated;
GRANT ALL ON public.calendar_plans TO service_role;
ALTER TABLE public.calendar_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plans" ON public.calendar_plans FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users add own plans" ON public.calendar_plans FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.outfits o WHERE o.id = outfit_id AND o.user_id = auth.uid()));
CREATE POLICY "Users update own plans" ON public.calendar_plans FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.outfits o WHERE o.id = outfit_id AND o.user_id = auth.uid()));
CREATE POLICY "Users delete own plans" ON public.calendar_plans FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Sample wardrobe: template pieces, combos and calendar entries hung on every new rail.
-- IDs are derived from the user id so seeded links stay consistent.
CREATE OR REPLACE FUNCTION public.seed_sample_wardrobe(_user uuid, _today date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _now timestamptz := now();
BEGIN
  INSERT INTO public.garments (id, user_id, category, name, color, image_url, brand, created_at)
  SELECT md5(_user::text || ':' || t.k)::uuid, _user, t.category::public.garment_category, t.name, t.color, t.image, t.brand,
         _now - make_interval(days => t.days_ago)
  FROM (VALUES
    ('g01', 'OUTERWEAR', 'Structured Camel Coat', 'Camel', 'seed:camel-coat', 'Studio Nicholson', 90),
    ('g02', 'OUTERWEAR', 'Cream Belted Trench', 'Cream', 'seed:cream-trench', 'Arket', 84),
    ('g03', 'OUTERWEAR', 'Tailored Black Blazer', 'Black', 'seed:black-blazer', 'Massimo Dutti', 80),
    ('g04', 'TOPS', 'Poplin Button-Down', 'White', 'seed:white-poplin-shirt', 'COS', 78),
    ('g05', 'TOPS', 'Merino Turtleneck', 'Black', 'seed:black-turtleneck', 'Uniqlo', 75),
    ('g06', 'TOPS', 'Cable Knit Sweater', 'Cream', 'seed:cream-cable-knit', 'Arket', 70),
    ('g07', 'TOPS', 'Silk Slip Camisole', 'Terracotta', 'seed:terracotta-silk-cami', 'Reformation', 66),
    ('g08', 'TOPS', 'Breton Stripe Tee', 'Navy', 'seed:breton-tee', 'Saint James', 62),
    ('g22', 'TOPS', 'Silk Bow Blouse', 'Ivory', 'seed:ivory-silk-blouse', '& Other Stories', 20),
    ('g09', 'BOTTOMS', 'Pleated Wool Trousers', 'Charcoal', 'seed:charcoal-trousers', 'The Row', 88),
    ('g10', 'BOTTOMS', 'Straight Ecru Denim', 'Ecru', 'seed:ecru-denim', 'Agolde', 72),
    ('g11', 'BOTTOMS', 'Indigo Straight Jeans', 'Indigo', 'seed:indigo-jeans', 'Levi''s', 68),
    ('g12', 'BOTTOMS', 'Wide-Leg Trousers', 'Chocolate', 'seed:chocolate-wide-leg', 'Totême', 40),
    ('g13', 'BOTTOMS', 'Satin Midi Skirt', 'Black', 'seed:black-satin-skirt', 'Zara', 36),
    ('g14', 'FOOTWEAR', 'Leather Chelsea Boots', 'Tan', 'seed:tan-chelsea-boots', 'Grenson', 86),
    ('g15', 'FOOTWEAR', 'Heeled Ankle Boots', 'Black', 'seed:black-ankle-boots', 'Aeyde', 60),
    ('g16', 'FOOTWEAR', 'Leather Court Sneakers', 'White', 'seed:white-sneakers', 'Veja', 82),
    ('g23', 'FOOTWEAR', 'Penny Loafers', 'Black', 'seed:black-loafers', 'G.H. Bass', 30),
    ('g17', 'FOOTWEAR', 'Zari Embroidered Juttis', 'Gold', 'seed:gold-juttis', 'Fizzy Goblet', 50),
    ('g18', 'ETHNIC', 'Block-Print Cotton Kurta', 'Rust', 'seed:rust-kurta', 'Fabindia', 58),
    ('g19', 'ETHNIC', 'Emerald Silk Lehenga', 'Emerald', 'seed:emerald-lehenga', 'Anita Dongre', 25),
    ('g20', 'ETHNIC', 'Chikankari Kurta Set', 'Ivory', 'seed:ivory-chikankari', 'House of Kari', 45),
    ('g21', 'ETHNIC', 'Banarasi Silk Saree', 'Maroon', 'seed:maroon-saree', 'Ekaya', 22)
  ) AS t(k, category, name, color, image, brand, days_ago);

  INSERT INTO public.garment_occasions (user_id, garment_id, occasion)
  SELECT _user, md5(_user::text || ':' || t.k)::uuid, t.occ::public.occasion
  FROM (VALUES ('g01', 'FORMAL'), ('g01', 'CASUAL'), ('g02', 'CASUAL'), ('g02', 'FORMAL'), ('g03', 'FORMAL'), ('g03', 'PARTY'), ('g04', 'FORMAL'), ('g04', 'CASUAL'), ('g05', 'FORMAL'), ('g05', 'CASUAL'), ('g05', 'PARTY'), ('g06', 'CASUAL'), ('g07', 'PARTY'), ('g07', 'CASUAL'), ('g08', 'CASUAL'), ('g22', 'FORMAL'), ('g22', 'PARTY'), ('g09', 'FORMAL'), ('g10', 'CASUAL'), ('g11', 'CASUAL'), ('g11', 'PARTY'), ('g12', 'FORMAL'), ('g12', 'PARTY'), ('g13', 'PARTY'), ('g13', 'FORMAL'), ('g14', 'CASUAL'), ('g14', 'FORMAL'), ('g15', 'FORMAL'), ('g15', 'PARTY'), ('g16', 'CASUAL'), ('g23', 'FORMAL'), ('g23', 'CASUAL'), ('g17', 'WEDDING'), ('g17', 'PARTY'), ('g17', 'CASUAL'), ('g18', 'CASUAL'), ('g18', 'WEDDING'), ('g19', 'WEDDING'), ('g20', 'WEDDING'), ('g20', 'CASUAL'), ('g21', 'WEDDING'), ('g21', 'PARTY')) AS t(k, occ);

  INSERT INTO public.outfits (id, user_id, occasion, name, created_at)
  SELECT md5(_user::text || ':' || t.k)::uuid, _user, t.occ::public.occasion, t.name, _now - make_interval(days => t.days_ago)
  FROM (VALUES
    ('o01', 'FORMAL', 'Tailored Minimalist', 40),
    ('o02', 'CASUAL', 'Weekend Ease', 39),
    ('o03', 'FORMAL', 'Crisp Classic', 38),
    ('o04', 'PARTY', 'Satin Hour', 37),
    ('o05', 'CASUAL', 'Off-Duty Classic', 36),
    ('o06', 'CASUAL', 'Easy Ethnic', 35),
    ('o07', 'FORMAL', 'Studio Neutrals', 34),
    ('o08', 'FORMAL', 'Evening Sharp', 33),
    ('o09', 'WEDDING', 'Festive Heirloom', 32),
    ('o10', 'WEDDING', 'Gilded Celebration', 31),
    ('o11', 'WEDDING', 'Mehendi Morning', 30)
  ) AS t(k, occ, name, days_ago);

  INSERT INTO public.outfit_garments (user_id, outfit_id, garment_id)
  SELECT _user, md5(_user::text || ':' || t.o)::uuid, md5(_user::text || ':' || t.g)::uuid
  FROM (VALUES ('o01', 'g01'), ('o01', 'g05'), ('o01', 'g09'), ('o01', 'g15'), ('o02', 'g02'), ('o02', 'g06'), ('o02', 'g10'), ('o02', 'g16'), ('o03', 'g02'), ('o03', 'g04'), ('o03', 'g09'), ('o03', 'g14'), ('o04', 'g03'), ('o04', 'g07'), ('o04', 'g13'), ('o04', 'g15'), ('o05', 'g08'), ('o05', 'g11'), ('o05', 'g16'), ('o06', 'g18'), ('o06', 'g17'), ('o07', 'g01'), ('o07', 'g04'), ('o07', 'g12'), ('o07', 'g23'), ('o08', 'g03'), ('o08', 'g22'), ('o08', 'g12'), ('o08', 'g15'), ('o09', 'g19'), ('o09', 'g17'), ('o10', 'g21'), ('o10', 'g17'), ('o11', 'g20'), ('o11', 'g17')) AS t(o, g);

  INSERT INTO public.calendar_plans (id, user_id, outfit_id, event_name, plan_date)
  SELECT md5(_user::text || ':' || t.k)::uuid, _user, md5(_user::text || ':' || t.o)::uuid, t.event_name, _today + t.day_offset
  FROM (VALUES
    ('p01', 'o07', 'Design review', -27),
    ('p02', 'o01', 'Board meeting', -20),
    ('p03', 'o06', 'Lunch with Nani', -16),
    ('p04', 'o04', 'Birthday drinks', -12),
    ('p05', 'o03', 'Client pitch', -9),
    ('p06', 'o01', 'Quarterly review', -5),
    ('p07', 'o02', 'Farmers market brunch', -3),
    ('p08', 'o05', 'Gallery afternoon', -1),
    ('p09', 'o08', 'Client dinner @ Cecconi''s', 3),
    ('p10', 'o09', 'Ananya''s wedding', 9),
    ('p11', 'o11', 'Mehendi morning', 16),
    ('p12', 'o10', 'Rohan''s reception', 23)
  ) AS t(k, o, event_name, day_offset);
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.seed_sample_wardrobe(uuid, date) FROM PUBLIC, anon, authenticated;

-- Empty the signed-in user's wardrobe (pieces, outfits, plans).
CREATE OR REPLACE FUNCTION public.clear_my_wardrobe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _user uuid := auth.uid();
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  DELETE FROM public.calendar_plans WHERE user_id = _user;
  DELETE FROM public.outfit_garments WHERE user_id = _user;
  DELETE FROM public.outfits WHERE user_id = _user;
  DELETE FROM public.garment_occasions WHERE user_id = _user;
  DELETE FROM public.garments WHERE user_id = _user;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.clear_my_wardrobe() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_my_wardrobe() TO authenticated;

-- Replace the signed-in user's wardrobe with the sample capsule.
CREATE OR REPLACE FUNCTION public.restore_sample_wardrobe(_today date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _user uuid := auth.uid();
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  PERFORM public.clear_my_wardrobe();
  PERFORM public.seed_sample_wardrobe(_user, _today);
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.restore_sample_wardrobe(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_sample_wardrobe(date) TO authenticated;

-- New accounts get a profile and the sample wardrobe.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    left(coalesce(
      nullif(split_part(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), ' ', 1), ''),
      ''
    ), 30)
  )
  ON CONFLICT (id) DO NOTHING;
  PERFORM public.seed_sample_wardrobe(NEW.id, current_date);
  RETURN NEW;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Private garment photos: each user reads and writes only inside their own folder.
CREATE POLICY "Users read own garment photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'garment-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload own garment photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'garment-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own garment photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'garment-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own garment photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'garment-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
