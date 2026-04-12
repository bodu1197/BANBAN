interface UserInfoDisplayProps {
  name?: string;
  email?: string;
}

export function UserInfoDisplay({ name, email }: Readonly<UserInfoDisplayProps>): React.ReactElement {
  return (
    <>
      <p className="text-sm font-medium">{name ?? email}</p>
      {name && email && (
        <p className="text-xs text-muted-foreground">{email}</p>
      )}
    </>
  );
}
