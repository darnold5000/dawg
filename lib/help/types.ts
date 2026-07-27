export type FaqItem = {
  id: string;
  question: string;
  answerParagraphs: string[];
  link?: { href: string; label: string };
};

export type AdminGuideBlock = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type AdminGuideSection = {
  id: string;
  label: string;
  intro: string;
  blocks: AdminGuideBlock[];
};
