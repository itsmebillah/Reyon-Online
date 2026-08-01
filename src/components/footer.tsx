import Link from "next/link";
import { businessConfig } from "@/config/business";
import { Container } from "./ui";

export function Footer() {
  return (
    <footer className="footer">
      <Container>
        <div className="footer-grid">
          <div>
            <Link className="wordmark wordmark--light" href="/">
              REYON<span>BEAUTY &amp; CARE</span>
            </Link>
            <p>
              Premium beauty and personal care from multiple brands, selected
              with trust, clarity and attention to quality.
            </p>
          </div>
          <div>
            <h2>Explore</h2>
            <Link href="/shop">Shop all</Link>
            <Link href="/categories">Categories</Link>
            <Link href="/about">Our story</Link>
          </div>
          <div>
            <h2>Care</h2>
            <Link href="/contact">Contact</Link>
            <Link href="/shipping">Delivery</Link>
            <Link href="/returns">Returns</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms</Link>
          </div>
          <div>
            <h2>Connect</h2>
            <a href={businessConfig.contact.facebookUrl}>Facebook</a>
            <a href={businessConfig.contact.instagramUrl}>Instagram</a>
            <a href={businessConfig.contact.whatsappUrl}>WhatsApp</a>
          </div>
          <div>
            <h2>Stay close</h2>
            <p>New rituals and considered edits, delivered occasionally.</p>
            <form className="newsletter">
              <label className="sr-only" htmlFor="footer-email">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                placeholder="Email address"
                required
              />
              <button type="submit">Join</button>
            </form>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 REYON</span>
          <span>Dhaka, Bangladesh</span>
          <span>Reyon Online</span>
        </div>
      </Container>
    </footer>
  );
}
