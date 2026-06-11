import { TrainingCategory } from "@prisma/client";

// Plain (non-"use server") module: constants + types shared by the training
// server actions and client components. Keeping these out of training.ts is
// required because a "use server" file may only export async functions.

export type TrainingMaterialItem = {
  id: string;
  title: string;
  description: string | null;
  category: TrainingCategory;
  contentUrl: string | null;
  content: string | null;
  locationId: string | null;
  locationName: string | null;
  createdByName: string;
  createdAt: Date;
};

export const TRAINING_CATEGORY_LABEL: Record<TrainingCategory, string> = {
  SOP: "SOP",
  SAFETY: "Safety",
  SERVICE: "Service",
  PRODUCT: "Product",
  COMPLIANCE: "Compliance",
  OTHER: "Other",
};

export const TRAINING_CATEGORY_COLOR: Record<TrainingCategory, string> = {
  SOP: "#0073ea",
  SAFETY: "#e2445c",
  SERVICE: "#00c875",
  PRODUCT: "#fdab3d",
  COMPLIANCE: "#a25ddc",
  OTHER: "#676879",
};
