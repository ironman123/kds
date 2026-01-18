import { useState } from 'react';
import UserSelectScreen from '../features/auth/UserSelectScreen';
// We'll build the password screen next, for now use a placeholder
import PasswordEntryScreen from '../features/auth/PasswordEntryScreen';

export default function LoginPage()
{
    const [selectedUser, setSelectedUser] = useState(null);

    return (
        <>
            {!selectedUser ? (
                <UserSelectScreen onUserSelect={setSelectedUser} />
            ) : (
                <PasswordEntryScreen
                    selectedUser={selectedUser}
                    onBack={() => setSelectedUser(null)}
                />
            )}
        </>
    );
}