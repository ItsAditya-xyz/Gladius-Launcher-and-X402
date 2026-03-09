export function generateMetadata() {
  const title = "ArenaX402";
  const description = "Payment required";
  const image = "/icons/banner.png";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function IdLayout({ children }) {
  return children;
}
