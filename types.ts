
export interface User {
  username: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string) => void;
  logout: () => void;
}
