import { Heart, MapPin } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ArtistCardInfoProps {
  name: string;
  region: string;
  likesCount: number;
  genres: string[];
}

export function ArtistCardInfo({
  name,
  region,
  likesCount,
  genres,
}: Readonly<ArtistCardInfoProps>): React.ReactElement {
  return (
    <CardContent className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{name}</h3>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{region}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Heart className="h-3 w-3" />
          <span>{likesCount}</span>
        </div>
      </div>

      {genres.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {genres.slice(0, 2).map((genre) => (
            <Badge key={genre} variant="outline" className="text-xs">
              {genre}
            </Badge>
          ))}
          {genres.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{genres.length - 2}
            </Badge>
          )}
        </div>
      )}
    </CardContent>
  );
}
