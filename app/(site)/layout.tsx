import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AgeGate from "@/components/layout/AgeGate";
import ChatWidget from "@/components/chat/ChatWidget";
import WhatsAppButton from "@/components/chat/WhatsAppButton";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AgeGate />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <ChatWidget />
    </>
  );
}
