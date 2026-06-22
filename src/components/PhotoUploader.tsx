"use client";

import { FileDropzone } from "./FileDropzone";

// Thin wrapper kept for existing callers (task proof, maintenance photos).
// The real UI lives in FileDropzone so every upload looks/behaves the same.
type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

export function PhotoUploader({ value, onChange, disabled }: Props) {
  return (
    <FileDropzone
      value={value}
      onChange={onChange}
      disabled={disabled}
      kind="image"
      folder="photos"
    />
  );
}
