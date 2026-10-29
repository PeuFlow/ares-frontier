/** Presentation-only entry screen, not a security or authentication boundary. */
export function shouldShowEntry(hasUser: boolean, path: string) {
  return !hasUser && !["/login", "/cadastro", "/esqueci-senha"].includes(path);
}