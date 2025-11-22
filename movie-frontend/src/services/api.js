import axios from 'axios'
import { toast } from 'react-toastify'
import useAuthStore from '../stores/useAuthStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor for auth
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login/refresh/`, { refresh: refreshToken })
        useAuthStore.getState().setTokens(data.access, refreshToken)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return api(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().logout()
        toast.error('Session expired. Please log in again.')
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export default api