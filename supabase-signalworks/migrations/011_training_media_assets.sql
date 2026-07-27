-- Migration 011: Client photos and coach bio (static paths under /public).

update public.training_coaches c
set
  photo_url = '/images/dawg/trainers/coach-avery.png',
  name = 'Avery Thompson Sr.',
  title = 'Owner & Founder · DAWG Youth Sports Performance',
  bio = $bio$My name is Avery Thompson Sr. I'm the owner and founder of Dawgs Youth Sports Performance. Dawg was founded in 2018 on the Westside of Indianapolis until moving to Mooresville in 2024. I was a 4 sport athlete in football, basketball, baseball, and track. I was blessed to be a high jumper on the state runner up Track & Field team at Ben Davis High School in 2002. I also won state twice in football as player in 2001 & 2002. I won another state title as coach for Ben Davis in 2017 on the undefeated national ranked football team. I have over a decade of experience in coaching youth sports and I'm on year 13 of coaching high school football. I won 2 National Titles in 2008 & 2017 with the Indianapolis Tornados. Since retiring I have dedicated my time to multiple communities in helping young athletes reach their fitness goals and build their confidence through mental toughness. I just really enjoy being apart of athlete's journey to success by creating a fun atmosphere with incredible work ethic. Be. A. Dawg🐾🦴🖤$bio$,
  updated_at = now()
from public.tenants t
where c.tenant_id = t.id
  and t.slug = 'dawg-youth-training'
  and c.name ilike '%Avery%';

update public.training_programs p
set
  image_url = '/images/dawg/programs/little-dawgs.png',
  updated_at = now()
from public.tenants t
where p.tenant_id = t.id
  and t.slug = 'dawg-youth-training'
  and p.slug = 'little-dawgs';

update public.training_programs p
set
  image_url = '/images/dawg/programs/big-dawgs.png',
  updated_at = now()
from public.tenants t
where p.tenant_id = t.id
  and t.slug = 'dawg-youth-training'
  and p.slug = 'big-dawgs';
