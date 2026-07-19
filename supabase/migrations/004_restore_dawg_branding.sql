-- Restore public DAWG business contact/location after portfolio anonymization.
-- Safe to re-run.

update public.dawg_business_settings set
  business_name = 'DAWG Youth Training',
  phone = '(317) 835-1076',
  email = 'coachavery1287@gmail.com',
  address_line_1 = '477 Town Center St',
  address_line_2 = null,
  city = 'Mooresville',
  state = 'IN',
  postal_code = '46158',
  facebook_url = 'https://www.facebook.com/DawgYouthTraining',
  business_hours = 'Hours TBD — contact DAWG for current training times',
  map_embed_url = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3080.5!2d-86.37!3d39.61!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s477%20Town%20Center%20St%2C%20Mooresville%2C%20IN!5e0!3m2!1sen!2sus!4v1',
  updated_at = now();

-- Fix session locations that were rewritten to the demo Plainfield address
update public.dawg_sessions set
  location_name = 'DAWG Youth Training',
  location_address = '477 Town Center St, Mooresville, IN 46158',
  updated_at = now()
where location_address ilike '%Plainfield%'
   or location_address ilike '%920 Training Center%'
   or location_name ilike '%DAWGZ%';

update public.dawg_programs set
  name = replace(name, 'Dawgz', 'Dawgs'),
  short_description = replace(short_description, 'Dawgz', 'Dawgs'),
  full_description = replace(full_description, 'Dawgz', 'Dawgs'),
  updated_at = now()
where name ilike '%Dawgz%'
   or short_description ilike '%Dawgz%'
   or full_description ilike '%Dawgz%';
