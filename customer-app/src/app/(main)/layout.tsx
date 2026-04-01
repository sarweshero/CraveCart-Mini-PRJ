import { Navbar } from "@/components/layout/navbar";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Footer } from "@/components/layout/footer";
import { CartConflictListener } from "@/components/cart/CartConflictDialog";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Global conflict dialog — listens to cart store conflictPending state */}
      <CartConflictListener />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <CartDrawer />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </>
  );
}
