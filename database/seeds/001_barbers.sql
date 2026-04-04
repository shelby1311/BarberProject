INSERT OR IGNORE INTO barbers (id, cpf, email, name, location, slug, bio, cover_url, avatar_url) VALUES
  ('b1', '52998224725', 'joao@barberflow.com', 'João Silva', 'São Paulo, SP', 'joao-silva',
   'Especialista em degradê e barba. 10 anos de experiência no mercado.',
   'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'),
  ('b2', '87748248800', 'carlos@barberflow.com', 'Carlos Mendes', 'Rio de Janeiro, RJ', 'carlos-mendes',
   'Barbeiro premiado, referência em cortes clássicos e modernos.',
   'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200',
   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200');

INSERT OR IGNORE INTO services (id, barber_id, name, price_in_cents, duration_minutes) VALUES
  ('s1', 'b1', 'Corte Degradê',  4500, 40),
  ('s2', 'b1', 'Barba Completa', 3000, 40),
  ('s3', 'b1', 'Corte + Barba',  7000, 80),
  ('s4', 'b2', 'Corte Clássico', 3500, 40),
  ('s5', 'b2', 'Pigmentação',    8000, 40);
