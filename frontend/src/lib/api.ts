// 统一的 API 请求封装:非 2xx 抛 ApiError,错误信息来自后端 {"error": "..."} 响应体。

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    let message = `请求失败(${response.status})`;
    try {
      const body: unknown = await response.json();
      if (
        body !== null &&
        typeof body === 'object' &&
        'error' in body &&
        typeof (body as { error: unknown }).error === 'string'
      ) {
        message = (body as { error: string }).error;
      }
    } catch {
      // 响应体不是 JSON 时使用默认消息
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}
