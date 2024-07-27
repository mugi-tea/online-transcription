import { CollaborativeEditor } from "../components/CollaborativeEditor";
import { Room } from "../components/Room";
import { LiveblocksProvider } from "@liveblocks/react";

export default function Home() {
  return (
    <LiveblocksProvider authEndpoint={"api/auth"}>
      <main>
        <Room>
          <CollaborativeEditor />
        </Room>
      </main>
    </LiveblocksProvider>
  );
}
