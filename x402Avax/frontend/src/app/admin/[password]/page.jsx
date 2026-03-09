import { notFound } from "next/navigation";
import Navbar from "../../../../components/navbar";
import AdminTester from "./AdminTester";

export const dynamic = "force-dynamic";

export default async function AdminPage({ params }) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const { password } = await params;

  if (!adminPassword || !password || password !== adminPassword) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <AdminTester />
      </main>
    </div>
  );
}
