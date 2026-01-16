import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Ensure path is correct
import prisma from "@/lib/prisma";
import NavbarContent from "./NavbarContent";

export default async function Navbar() {
  const session = await getServerSession(authOptions);

  // Fetch User Data & Currency on the Server
  let user = null;
  if (session?.user?.email) {
    user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        name: true,
        email: true,
        image: true,
        currency: true, // Fetching the currency here!
      },
    });
  }

  // Pass the fetched user data to the Client Component
  return <NavbarContent user={user} />;
}