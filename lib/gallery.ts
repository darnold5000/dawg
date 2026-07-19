export type GalleryImage = {
  src: string;
  alt: string;
  label: string;
};

/** Approved DAWG gallery assets under public/images/dawg/gallery. */
export const GALLERY_IMAGES: GalleryImage[] = [
  {
    src: "/images/dawg/gallery/speed.svg",
    alt: "Athletes working speed and agility drills at DAWGZ",
    label: "Speed & agility",
  },
  {
    src: "/images/dawg/gallery/strength.svg",
    alt: "Strength training session at DAWGZ Youth Training",
    label: "Strength training",
  },
  {
    src: "/images/dawg/gallery/group.svg",
    alt: "Group class training at the Dawgz House",
    label: "Group class",
  },
  {
    src: "/images/dawg/gallery/private.svg",
    alt: "Private coaching session at DAWGZ",
    label: "Private coaching",
  },
  {
    src: "/images/dawg/gallery/facility.svg",
    alt: "DAWGZ Youth Training facility",
    label: "Facility",
  },
  {
    src: "/images/dawg/gallery/agility.svg",
    alt: "Agility ladder and movement work at DAWGZ",
    label: "Agility work",
  },
];
