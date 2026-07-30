"use client";

/**
 * Last-resort boundary: replaces the whole document when the root layout itself
 * throws, so it has to ship its own <html>/<body> and can't use app styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          color: "#171717",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            Habitual hit an unexpected error. Reloading usually fixes it.
          </p>
          {error.digest && (
            <p style={{ color: "#999", fontSize: "0.75rem", marginBottom: "1rem" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "#7c3aed",
              color: "#fff",
              border: 0,
              borderRadius: "0.5rem",
              padding: "0.65rem 1.25rem",
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
