INSERT INTO "User" ("email", "name") VALUES (
  'serviceaccount@bchatsign.com',
  'Service Account'
) ON CONFLICT DO NOTHING;
