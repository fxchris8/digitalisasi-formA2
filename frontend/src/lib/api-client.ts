import axios from "axios"

const apiClient = axios.create({
  // In production with nginx proxy, VITE_API_URL can be omitted so requests
  // go to the same origin and nginx proxies /api/* to the backend container.
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      axios.isAxiosError(err) && err.response?.data?.message
        ? (err.response.data.message as string)
        : "Terjadi kesalahan"
    return Promise.reject(new Error(message))
  },
)

export default apiClient
