import { SWRProvider } from "@/lib/swr/provider";
import { VideoGenerationClient } from "./components/video-generation-client";

export default function VideoPage() {
  return (
    <SWRProvider fallback={{}}>
      <VideoGenerationClient />
    </SWRProvider>
  );
}
