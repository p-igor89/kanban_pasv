import { redirect } from 'next/navigation';

export default function Home() {
  // Middleware handles authentication redirects
  // This page is a fallback - redirect to boards
  redirect('/boards');
}
