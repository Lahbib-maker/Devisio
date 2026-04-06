-- ============================================================
-- DEVIOS — SQL COMPLET (copie-colle tout dans Supabase SQL Editor)
-- ============================================================

-- ── PROFILS ARTISAN ────────────────────────────────────────
create table if not exists profils (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  raison_sociale text,
  forme_juridique text,
  siret text,
  adresse text,
  tel text,
  email text,
  site_web text,
  tva_intra text,
  assurance_nom text,
  assurance_police text,
  assurance_zone text,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'gratuit',
  subscription_status text default 'inactive',
  onboarding_complete boolean default false,
  couleur_principale text default '#1B2D4F',
  logo_url text,
  created_at timestamp with time zone default now()
);
alter table profils enable row level security;
drop policy if exists "Profil personnel" on profils;
create policy "Profil personnel" on profils for all using (auth.uid() = user_id);

-- ── DEVIS ──────────────────────────────────────────────────
create table if not exists devis (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  titre text,
  description text,
  total_ttc numeric,
  lignes jsonb,
  statut text default 'brouillon',
  metier text default 'Artisan',
  taux_tva numeric default 10,
  ouvert_le timestamp with time zone,
  nb_ouvertures integer default 0,
  numero text,
  client_nom text,
  client_adresse text,
  client_email text,
  conditions_particulieres text,
  est_modele boolean default false,
  date_validite integer default 30,
  created_at timestamp with time zone default now()
);
alter table devis enable row level security;
drop policy if exists "Devis personnel" on devis;
create policy "Devis personnel" on devis for all using (auth.uid() = user_id);

-- ── FACTURES ───────────────────────────────────────────────
create table if not exists factures (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  devis_id uuid references devis(id),
  numero text unique,
  titre text,
  lignes jsonb,
  total_ttc numeric,
  taux_tva numeric default 10,
  metier text,
  statut text default 'emise',
  type text default 'standard',
  date_emission timestamp with time zone default now(),
  date_echeance timestamp with time zone,
  created_at timestamp with time zone default now()
);
alter table factures enable row level security;
drop policy if exists "Factures personnelles" on factures;
create policy "Factures personnelles" on factures for all using (auth.uid() = user_id);

-- ── BIBLIOTHÈQUE DE PRIX ───────────────────────────────────
create table if not exists bibliotheque_prix (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  description text not null,
  unite text default 'forfait',
  prix numeric not null,
  metier text default 'Général',
  usage_count integer default 0,
  created_at timestamp with time zone default now()
);
alter table bibliotheque_prix enable row level security;
drop policy if exists "Bibliothèque personnelle" on bibliotheque_prix;
create policy "Bibliothèque personnelle" on bibliotheque_prix for all using (auth.uid() = user_id);

-- ── NOTIFICATIONS PUSH ─────────────────────────────────────
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  subscription text,
  updated_at timestamp with time zone default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "Push personnel" on push_subscriptions;
create policy "Push personnel" on push_subscriptions for all using (auth.uid() = user_id);

-- ============================================================
-- FIN — Toutes les tables sont créées et sécurisées
-- ============================================================

-- ── CLIENTS ────────────────────────────────────────────────
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  nom text not null,
  email text,
  telephone text,
  adresse text,
  notes text,
  created_at timestamp with time zone default now()
);
alter table clients enable row level security;
drop policy if exists "Clients personnels" on clients;
create policy "Clients personnels" on clients for all using (auth.uid() = user_id);

-- ── SIGNATURES ─────────────────────────────────────────────
create table if not exists signatures (
  id uuid default gen_random_uuid() primary key,
  devis_id uuid references devis(id) on delete cascade,
  signe_le timestamp with time zone default now(),
  signature_data text, -- base64 SVG
  ip_client text,
  nom_signataire text
);
alter table signatures enable row level security;
drop policy if exists "Signatures publiques en lecture" on signatures;
create policy "Signatures publiques en lecture" on signatures for select using (true);
create policy "Signatures insert public" on signatures for insert with check (true);

-- ── CHANTIERS ──────────────────────────────────────────────
create table if not exists chantiers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  devis_id uuid references devis(id),
  client_nom text,
  adresse text,
  statut text default 'planifie', -- planifie | en_cours | termine | annule
  date_debut date,
  date_fin_prevue date,
  date_fin_reelle date,
  notes text,
  created_at timestamp with time zone default now()
);
alter table chantiers enable row level security;
drop policy if exists "Chantiers personnels" on chantiers;
create policy "Chantiers personnels" on chantiers for all using (auth.uid() = user_id);
