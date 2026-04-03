import Link from "next/link";
import { Github, Twitter, Instagram } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

export function Footer() {
  return (
    <footer className="border-t border-[#1E1B16]/80 bg-[#100f0d]/82 backdrop-blur-xl py-14 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <BrandLogo href="/" width={200} className="inline-flex mb-4" />
            <p className="text-[#9E9080] text-sm leading-relaxed max-w-xs mt-1">
              Food delivered with care. Every review answered with AI-powered intelligence.
            </p>
          </div>

          {[
            {
              title: "Company",
              links: [
                { label: "About Us", href: "#" },
                { label: "Careers", href: "#" },
                { label: "Blog", href: "#" },
                { label: "Press", href: "#" },
              ],
            },
            {
              title: "For Customers",
              links: [
                { label: "Browse Restaurants", href: "/restaurants" },
                { label: "My Orders", href: "/orders" },
                { label: "My Profile", href: "/profile" },
                { label: "Help Center", href: "#" },
              ],
            },
            {
              title: "Legal",
              links: [
                { label: "Terms of Service", href: "#" },
                { label: "Privacy Policy", href: "#" },
                { label: "Refund Policy", href: "#" },
                { label: "Cookie Policy", href: "#" },
              ],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-[#F5EDD8] font-semibold text-sm mb-4 tracking-tight">{title}</h4>
              <ul className="space-y-2">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-[#9E9080] text-sm hover:text-[#BFB49A] transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[#1E1B16] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#9E9080] text-xs">
            © {new Date().getFullYear()} CraveCart. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {[Github, Twitter, Instagram].map((Icon, i) => (
              <a key={i} href="#" className="w-8 h-8 rounded-lg bg-[#161410]/85 border border-[#2A2620] flex items-center justify-center text-[#9E9080] hover:text-[#E8A830] hover:border-[#E8A830]/30 transition-all">
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
