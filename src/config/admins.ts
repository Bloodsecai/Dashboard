export const ADMIN_ALLOWLIST = [
  'testadmin@gmail.com',  // ← Change this line
  'admin@whitekeymarketing.com',
  'sales@whitekeymarketing.com',
  // Add more admin emails here
];

export function isAdminEmail(email: string): boolean {
  return ADMIN_ALLOWLIST.includes(email.toLowerCase());
}