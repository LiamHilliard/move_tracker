import { Nav } from "@/components/Nav";
import { getCurrentUser } from "@/lib/current-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <>
      <Nav user={user ? { username: user.username, isAdmin: user.isAdmin } : null} />
      {children}
    </>
  );
}
