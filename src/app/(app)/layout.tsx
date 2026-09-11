import { RequireAuthorizedUser } from "@/components";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RequireAuthorizedUser>{children}</RequireAuthorizedUser>;
}
