export type UserRole = "admin" | "member";
export type UserStatus = "active" | "disabled";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  calendarConnected: boolean;
};

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
};

