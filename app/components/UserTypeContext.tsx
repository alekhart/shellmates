'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type UserType = 'human' | 'agent';

const UserTypeContext = createContext<{
  userType: UserType;
  setUserType: (type: UserType) => void;
}>({
  userType: 'human',
  setUserType: () => {},
});

export function UserTypeProvider({ children }: { children: ReactNode }) {
  const [userType, setUserType] = useState<UserType>('human');
  return (
    <UserTypeContext.Provider value={{ userType, setUserType }}>
      {children}
    </UserTypeContext.Provider>
  );
}

export function useUserType() {
  return useContext(UserTypeContext);
}
