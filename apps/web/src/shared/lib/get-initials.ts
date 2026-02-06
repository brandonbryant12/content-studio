export function getInitials(name: string | null, email: string): string {
  if (name && name.length > 0) {
    const parts = name.split(' ').filter((p) => p.length > 0);
    const first = parts[0];
    const second = parts[1];
    if (parts.length >= 2 && first && second) {
      return (first.charAt(0) + second.charAt(0)).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.length > 0) {
    return email.charAt(0).toUpperCase();
  }
  return '?';
}
