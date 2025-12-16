"use client";

import { useApiGet, useApiPost, useApiPut, useApiDelete } from "./hooks";
import { swrFetcher } from "./fetcher";
import type {
  CreateUserProbeTaskRequest,
  UpdateUserProbeTaskRequest,
  UserProbeRun,
  UserProbeTask,
} from "@/http/provider";

interface UseUserProbeTasksOptions {
  userId: string | null;
  providerId: string | null;
}

export const useUserProbeTasks = (options: UseUserProbeTasksOptions) => {
  const { userId, providerId } = options;
  const baseUrl =
    userId && providerId
      ? `/users/${userId}/private-providers/${providerId}/probe-tasks`
      : null;

  const { data, error, loading, validating, refresh } = useApiGet<UserProbeTask[]>(
    baseUrl,
    { strategy: "frequent" }
  );

  const createMutation = useApiPost<UserProbeTask, CreateUserProbeTaskRequest>(baseUrl ?? "");
  const updateMutation = useApiPut<
    UserProbeTask,
    { id: string; data: UpdateUserProbeTaskRequest }
  >(baseUrl ?? "");
  const deleteMutation = useApiDelete<void>(baseUrl ?? "");

  const createTask = async (payload: CreateUserProbeTaskRequest) => {
    if (!baseUrl) throw new Error("userId/providerId is required");
    const created = await createMutation.trigger(payload);
    await refresh();
    return created;
  };

  const updateTask = async (taskId: string, data: UpdateUserProbeTaskRequest) => {
    if (!baseUrl) throw new Error("userId/providerId is required");
    const updated = await updateMutation.trigger({ id: taskId, data });
    await refresh();
    return updated;
  };

  const deleteTask = async (taskId: string) => {
    if (!baseUrl) throw new Error("userId/providerId is required");
    await deleteMutation.trigger(`${baseUrl}/${taskId}`);
    await refresh();
  };

  const runNow = async (taskId: string) => {
    if (!baseUrl) throw new Error("userId/providerId is required");
    const run = await swrFetcher.post(`${baseUrl}/${taskId}/run`, {});
    await refresh();
    return run as UserProbeRun;
  };

  const listRuns = async (taskId: string, limit: number = 20) => {
    if (!baseUrl) throw new Error("userId/providerId is required");
    const params = new URLSearchParams({ limit: String(limit) });
    const runs = await swrFetcher.get(`${baseUrl}/${taskId}/runs?${params.toString()}`);
    return runs as UserProbeRun[];
  };

  return {
    tasks: data ?? [],
    loading,
    validating,
    error,
    refresh,
    createTask,
    updateTask,
    deleteTask,
    runNow,
    listRuns,
    creating: createMutation.submitting,
    updating: updateMutation.submitting,
    deleting: deleteMutation.submitting,
  };
};

