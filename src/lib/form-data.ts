export function readText(formData: FormData, key: string): string {
  const value = formData.get(key)

  return typeof value === "string" ? value : ""
}

/** An unchecked checkbox is not submitted at all, so absence means false. */
export function readCheckbox(formData: FormData, key: string): boolean {
  return formData.getAll(key).some((value) => value === "true")
}
