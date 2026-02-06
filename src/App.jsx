import { useState } from "react";

function resolveWaitlistEndpoint() {
  const configuredValue = (import.meta.env.VITE_WAITLIST_API_URL || "").trim();
  if (!configuredValue) {
    return "/api/waitlist";
  }

  if (configuredValue.includes("/api/waitlist")) {
    return configuredValue;
  }

  return `${configuredValue.replace(/\/+$/, "")}/api/waitlist`;
}

const waitlistEndpoint = resolveWaitlistEndpoint();

function App() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ message: "", type: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ message: "", type: "" });

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setStatus({ message: "Enter an email address.", type: "error" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(waitlistEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail })
      });
      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const result = isJson ? await response.json().catch(() => ({})) : {};

      if (response.ok) {
        setStatus({ message: "You're on the list. We'll be in touch soon.", type: "success" });
        setEmail("");
        return;
      }

      if (response.status === 409) {
        setStatus({ message: "That email is already on the waitlist.", type: "error" });
        return;
      }

      const fallbackMessage = `Request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ""}).`;
      setStatus({
        message: result.details ? `${result.error || fallbackMessage} ${result.details}` : (result.error || fallbackMessage),
        type: "error"
      });
    } catch (error) {
      setStatus({
        message: `Network error${error?.message ? `: ${error.message}` : "."}`,
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="wrap">
        <header>
          <div className="brand reveal">
            <span className="brand-mark" aria-hidden="true"></span>
            <span>Earned Screen</span>
          </div>
          <div className="pill reveal delay-1">Private beta</div>
        </header>

        <main className="split">
          <section className="mockup-section reveal delay-2" aria-label="Product mockup">
            <div className="mockup-frame">
              <img
                className="mockup-image"
                src={`${import.meta.env.BASE_URL}mockup2.png`}
                alt="Earned Screen app mockup"
              />
            </div>
          </section>

          <section className="signup-card reveal delay-3">
            <div className="signup-copy">
              <span className="eyebrow">Join the waitlist</span>
              <h1>Earn your screen time.</h1>
              <p>Set a calm routine, finish what matters, unlock time for the apps you want.</p>
            </div>
            <form className="signup-form" id="waitlist-form" onSubmit={handleSubmit}>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@email.com"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
              />
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Request access"}
              </button>
            </form>
            <p id="form-status" className={`form-status ${status.type}`.trim()} aria-live="polite">
              {status.message}
            </p>
            <p className="fineprint">We will only email you about the beta and launch.</p>
          </section>
        </main>

        <footer>
          <div>Earned Screen</div>
          <div>hello@earnedscreen.com</div>
        </footer>
      </div>
    </div>
  );
}

export default App;
