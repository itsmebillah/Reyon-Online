import Link from "next/link";
import { businessConfig } from "@/config/business";
import { Container } from "./ui";
import { ReyonLogo } from "./reyon-logo";
export function Footer() {
  return (
    <footer className="footer">
      <Container>
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" aria-label="REYON home">
              <ReyonLogo />
            </Link>
            <p>
              Time, on your terms.
              <br />
              Watches for every day.
            </p>
          </div>
          <div className="footer-group">
            <h2>Explore</h2>
            <Link href="/shop">All watches</Link>
            <Link href="/shop?gender=men">Menâ€™s watches</Link>
            <Link href="/shop?gender=women">Womenâ€™s watches</Link>
            <Link href="/shop?offers=true">Offers</Link>
          </div>
          <div className="footer-group">
            <h2>Customer care</h2>
            <Link href="/account">My orders</Link>
            <Link href="/shipping">Delivery</Link>
            <Link href="/returns">Returns & warranty</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
          <div className="footer-group">
            <h2>Letâ€™s talk watches</h2>
            <p>Questions about a watch or an order?</p>
            <a href={businessConfig.contact.whatsappUrl}>WhatsApp â†—</a>
            <a href={"mailto:" + businessConfig.contact.email}>Email REYON â†—</a>
            <Link href="/about">About us</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Â© {new Date().getFullYear()} REYON Â· Reyon Online</span>
          <span>Prices in BDT / ? · Cash on Delivery available</span>
        </div>
      </Container>
    </footer>
  );
}
