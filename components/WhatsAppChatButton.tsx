export default function WhatsAppChatButton() {
  const phoneNumber = "254718528131";
  const message = encodeURIComponent(
    "Hello, I need help with Digital School Hub."
  );

  return (
    <a
      href={`https://wa.me/${phoneNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Digital School Hub support on WhatsApp"
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: 1000,
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "13px 18px",
        borderRadius: "999px",
        backgroundColor: "#25D366",
        color: "#ffffff",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: 600,
        boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
      }}
    >
      <svg
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
      </svg>
      Chat with us
    </a>
  );
}
