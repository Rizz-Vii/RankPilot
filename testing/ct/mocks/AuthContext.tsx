import React from "react";

export const AuthContext = React.createContext({
  user: null,
  loading: false,
  role: null,
  profile: null,
  activities: [],
});
export const useAuth = () => React.useContext(AuthContext);
export const AuthProvider = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider
    value={{
      user: null,
      loading: false,
      role: null,
      profile: null,
      activities: [],
    }}
  >
    {children}
  </AuthContext.Provider>
);
