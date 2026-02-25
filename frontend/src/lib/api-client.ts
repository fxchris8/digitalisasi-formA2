import axios from "axios"

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
