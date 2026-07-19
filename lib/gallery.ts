export type GalleryImage = {
  src: string;
  alt: string;
  label: string;
};

/** Approved DAWG gallery assets under public/images/dawg/gallery. */
export const GALLERY_IMAGES: GalleryImage[] = [
  {
    src: "/images/dawg/gallery/01.jpg",
    alt: "Athletes working speed and agility drills at DAWG",
    label: "Speed & agility",
  },
  {
    src: "/images/dawg/gallery/02.jpg",
    alt: "Strength training session at DAWG Youth Training",
    label: "Strength training",
  },
  {
    src: "/images/dawg/gallery/03.jpg",
    alt: "Group class training at the Dawg House",
    label: "Group class",
  },
  {
    src: "/images/dawg/gallery/04.jpg",
    alt: "Private coaching session at DAWG",
    label: "Private coaching",
  },
  {
    src: "/images/dawg/gallery/05.jpg",
    alt: "DAWG Youth Training facility",
    label: "Facility",
  },
  {
    src: "/images/dawg/gallery/06.jpg",
    alt: "Agility ladder and movement work at DAWG",
    label: "Agility work",
  },
];
