"use client";
import { FormEvent, useState } from "react";
import { Container, Button } from "@/components/ui";
export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };
  return (
    <Container className="page contact">
      <div>
        <p className="eyebrow">We’re here</p>
        <h1>How can we care for you?</h1>
        <p className="lead">
          Our customer care foundation is ready for your questions. Backend
          delivery will be connected when approved.
        </p>
        <address>
          Dhaka, Bangladesh
          <br />
          care@reyon.example
          <br />
          Saturday–Thursday, 10:00–18:00
        </address>
      </div>
      {sent ? (
        <div className="form-success" role="status">
          <span>✓</span>
          <h2>Message saved</h2>
          <p>
            This interface is ready. Message delivery will be activated with the
            approved backend.
          </p>
          <Button variant="secondary" onClick={() => setSent(false)}>
            Send another
          </Button>
        </div>
      ) : (
        <form className="contact-form" onSubmit={submit}>
          <label>
            Name
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            How can we help?
            <select name="topic">
              <option>Product guidance</option>
              <option>Order support</option>
              <option>General question</option>
            </select>
          </label>
          <label>
            Message
            <textarea name="message" rows={6} required />
          </label>
          <Button type="submit">Save message</Button>
        </form>
      )}
    </Container>
  );
}
