import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ArtistNotFound(): React.ReactElement {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Artist not found
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Go back home</Link>
      </Button>
    </main>
  );
}
