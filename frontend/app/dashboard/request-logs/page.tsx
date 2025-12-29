import type { Metadata } from "next";
import { SWRProvider } from "@/lib/swr/provider";
import { serverFetch } from "@/lib/swr/server-fetch";
import type { RequestLogsResponse } from "@/lib/api-types";
import { RequestLogsPageClient } from "./components/request-logs-page-client";

export const metadata: Metadata = {
  title: "Dashboard - 请求日志",
  description: "查看最近的网关请求记录与 Provider 重试链路",
};

export default async function RequestLogsPage() {
  const limit = 50;
  const offset = 0;
  const key = `/v1/request-logs?limit=${limit}&offset=${offset}`;
  const data = await serverFetch<RequestLogsResponse>(key);

  return (
    <SWRProvider
      fallback={{
        [key]: data,
      }}
    >
      <div className="container mx-auto p-6">
        <RequestLogsPageClient initialLimit={limit} initialOffset={offset} />
      </div>
    </SWRProvider>
  );
}

