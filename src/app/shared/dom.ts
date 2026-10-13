/** Lê o valor de um <input>/<textarea>/<select> a partir do evento. */
export function inputValue(e: Event): string {
  return (e.target as HTMLInputElement).value;
}
