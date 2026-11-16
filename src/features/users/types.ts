export const roles = [
  { id: "Administrator", description: "The owner. Everything, including accounts and settings." },
  { id: "Family member", description: "Every page except the Admin pages: Users & Roles, Activity Logs and Settings. Their changes are still recorded in Activity Logs." },
] as const;

export type Role = (typeof roles)[number]["id"];

/** What each role can do. The server enforces this; the Users page shows it. */
export const permissions: { module: string; roles: Role[] }[] = [
  ...["Point of Sale", "Dashboard", "Products & pricing", "Inventory & stock", "Costing & recipes", "Expenses", "Sales reports"].map(
    (module) => ({ module, roles: ["Administrator", "Family member"] as Role[] }),
  ),
  { module: "Users & roles", roles: ["Administrator"] },
  { module: "Activity logs", roles: ["Administrator"] },
  { module: "Settings", roles: ["Administrator"] },
];

export type User = {
  id: string;
  name: string;
  email: string;
  /** Optional sign-in name, as typed (displayUsername); sign-in ignores capitals. */
  username: string | null;
  role: Role;
  active: boolean;
};
