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
  async (err) => {
    // Request dengan responseType "blob" (mis. download PDF) bikin body error
    // JSON dari backend ikut dikembalikan sebagai Blob, bukan object biasa —
    // perlu di-parse manual supaya pesan error aslinya tetap muncul.
    if (
      axios.isAxiosError(err) &&
      err.response?.data instanceof Blob &&
      err.response.data.type.includes("json")
    ) {
      try {
        const parsed = JSON.parse(await err.response.data.text())
        return Promise.reject(
          new Error((parsed?.message as string) ?? "Terjadi kesalahan"),
        )
      } catch {
        // jatuh ke penanganan generik di bawah kalau body-nya ternyata bukan JSON valid
      }
    }
    const message =
      axios.isAxiosError(err) && err.response?.data?.message
        ? (err.response.data.message as string)
        : "Terjadi kesalahan"
    return Promise.reject(new Error(message))
  },
)

export default apiClient
