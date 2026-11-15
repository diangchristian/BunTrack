export const roles = [
  { id: "Administrator", description: "The owner. Everything, including accounts and settings." },
  { id: "Family member", description: "Every page except Users & Roles and Settings. All changes are recorded in Activity Logs." },
] as const;

export type Role = (typeof roles)[number]["id"];

/** What each role can do. The server enforces this; the Users page shows it. */
export const permissions: { module: string; roles: Role[] }[] = [
  ...["Point of Sale", "Dashboard", "Products & pricing", "Inventory & stock", "Costing & recipes", "Expenses", "Sales reports", "Activity logs"].map(
    (module) => ({ module, roles: ["Administrator", "Family member"] as Role[] }),
  ),
  { module: "Users & roles", roles: ["Administrator"] },
  { module: "Settings", roles: ["Administrator"] },
];

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};
