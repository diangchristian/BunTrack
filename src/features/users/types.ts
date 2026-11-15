export const roles = [
  { id: "Administrator", description: "The owner. Everything, including users and settings." },
  { id: "Manager", description: "Menu, prices, recipes, stock, expenses and reports." },
  { id: "Cashier", description: "The POS only: take orders and payments." },
] as const;

export type Role = (typeof roles)[number]["id"];

/** What each role can do. The server enforces this; the Users page shows it. */
export const permissions: { module: string; roles: Role[] }[] = [
  { module: "Point of Sale", roles: ["Administrator", "Manager", "Cashier"] },
  { module: "Dashboard", roles: ["Administrator", "Manager"] },
  { module: "Products & pricing", roles: ["Administrator", "Manager"] },
  { module: "Inventory & stock", roles: ["Administrator", "Manager"] },
  { module: "Costing & recipes", roles: ["Administrator", "Manager"] },
  { module: "Expenses", roles: ["Administrator", "Manager"] },
  { module: "Sales reports", roles: ["Administrator", "Manager"] },
  { module: "Activity logs", roles: ["Administrator", "Manager"] },
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
