import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8003'

export function createApi(userId) {
  return axios.create({
    baseURL: API_BASE,
    headers: { 'x-user-id': userId },
  })
}

export async function startGeneration(userId, propertyUrl, brand) {
  const api = createApi(userId)
  const { data } = await api.post('/generate/', { property_url: propertyUrl, brand })
  return data
}

export async function pollJob(userId, jobId) {
  const api = createApi(userId)
  const { data } = await api.get(`/generate/${jobId}`)
  return data
}

export async function getMe(userId) {
  const api = createApi(userId)
  const { data } = await api.get('/users/me')
  return data
}

export async function updateBrand(userId, brand) {
  const api = createApi(userId)
  const { data } = await api.put('/users/brand', brand)
  return data
}

export async function listJobs(userId) {
  const api = createApi(userId)
  const { data } = await api.get('/users/jobs')
  return data
}

export async function createCheckout(userId, plan) {
  const api = createApi(userId)
  const { data } = await api.post(`/billing/checkout?plan=${plan}`)
  return data
}
