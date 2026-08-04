import {
  PROFILE_AVATAR_IDS,
  type ProfileAvatarId,
  type ProfileAvatarInfo,
} from "@/lib/types";

/**
 * One primary reference-country flag is used for the compact profile UI.
 * The culture names and locations remain available to accessible labels.
 */
export const PROFILE_AVATARS = [
  {
    id: "maori-female",
    culture: "Māori",
    location: "Aotearoa New Zealand",
    flagCode: "NZ",
    src: "/avatars/maori-female.webp",
  },
  {
    id: "sami-male",
    culture: "Sámi",
    location: "Norway",
    flagCode: "NO",
    src: "/avatars/sami-male.webp",
  },
  {
    id: "ainu-female",
    culture: "Ainu",
    location: "Japan",
    flagCode: "JP",
    src: "/avatars/ainu-female.webp",
  },
  {
    id: "korean-male",
    culture: "Korean",
    location: "South Korea",
    flagCode: "KR",
    src: "/avatars/korean-male.webp",
  },
  {
    id: "hmong-female",
    culture: "Flower Hmong",
    location: "Vietnam",
    flagCode: "VN",
    src: "/avatars/hmong-female.webp",
  },
  {
    id: "mongolian-male",
    culture: "Mongolian",
    location: "Mongolia",
    flagCode: "MN",
    src: "/avatars/mongolian-male.webp",
  },
  {
    id: "kazakh-female",
    culture: "Kazakh",
    location: "Kazakhstan",
    flagCode: "KZ",
    src: "/avatars/kazakh-female.webp",
  },
  {
    id: "punjabi-sikh-male",
    culture: "Punjabi Sikh",
    location: "India",
    flagCode: "IN",
    src: "/avatars/punjabi-sikh-male.webp",
  },
  {
    id: "uzbek-female",
    culture: "Uzbek",
    location: "Uzbekistan",
    flagCode: "UZ",
    src: "/avatars/uzbek-female.webp",
  },
  {
    id: "amazigh-male",
    culture: "Amazigh",
    location: "Morocco",
    flagCode: "MA",
    src: "/avatars/amazigh-male.webp",
  },
  {
    id: "tuareg-male",
    culture: "Tuareg",
    location: "Niger",
    flagCode: "NE",
    src: "/avatars/tuareg-male.webp",
  },
  {
    id: "yoruba-male",
    culture: "Yoruba",
    location: "Nigeria",
    flagCode: "NG",
    src: "/avatars/yoruba-male.webp",
  },
  {
    id: "maasai-female",
    culture: "Maasai",
    location: "Kenya",
    flagCode: "KE",
    src: "/avatars/maasai-female.webp",
  },
  {
    id: "xhosa-male",
    culture: "Xhosa",
    location: "South Africa",
    flagCode: "ZA",
    src: "/avatars/xhosa-male.webp",
  },
  {
    id: "inuit-female",
    culture: "Inuit",
    location: "Canada",
    flagCode: "CA",
    src: "/avatars/inuit-female.webp",
  },
  {
    id: "quechua-female",
    culture: "Quechua",
    location: "Peru",
    flagCode: "PE",
    src: "/avatars/quechua-female.webp",
  },
  {
    id: "mapuche-male",
    culture: "Mapuche",
    location: "Chile",
    flagCode: "CL",
    src: "/avatars/mapuche-male.webp",
  },
  {
    id: "samoan-female",
    culture: "Samoan",
    location: "Samoa",
    flagCode: "WS",
    src: "/avatars/samoan-female.webp",
  },
  {
    id: "javanese-female",
    culture: "Javanese",
    location: "Indonesia",
    flagCode: "ID",
    src: "/avatars/javanese-female.webp",
  },
  {
    id: "georgian-male",
    culture: "Georgian",
    location: "Georgia",
    flagCode: "GE",
    src: "/avatars/georgian-male.webp",
  },
] as const satisfies readonly ProfileAvatarInfo[];

const PROFILE_AVATAR_BY_ID = new Map<string, ProfileAvatarInfo>(
  PROFILE_AVATARS.map((avatar) => [avatar.id, avatar]),
);

export function isProfileAvatarId(value: unknown): value is ProfileAvatarId {
  return (
    typeof value === "string" &&
    PROFILE_AVATAR_IDS.includes(value as ProfileAvatarId)
  );
}

export function getProfileAvatar(avatarId: string | undefined): ProfileAvatarInfo | undefined {
  return avatarId ? PROFILE_AVATAR_BY_ID.get(avatarId) : undefined;
}
