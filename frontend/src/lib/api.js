import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8003'

export function createApi(userId) {
  return axios.create({
    baseURL: API_BASE,
    headers: { 'x-user-id': userId },
  })
}

export async function scrapePreview(userId, propertyUrl) {
  const api = createApi(userId)
  const { data } = await api.get('/generate/preview', { params: { url: propertyUrl } })
  return data
}

export async function startGeneration(userId, propertyUrl, brand, creativeSlots = [{ type: 'destacado', custom_text: '' }], fmtName = 'feed_1x1', selectedPhotos = null) {
  const api = createApi(userId)
  const { data } = await api.post('/generate/', {
    property_url: propertyUrl,
    brand,
    creative_slots: creativeSlots,
    fmt_name: fmtName,
    selected_photos: selectedPhotos,
  })
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

export async function listJobs(userId, page = 1, perPage = 10) {
  const api = createApi(userId)
  const { data } = await api.get('/users/jobs', { params: { page, per_page: perPage } })
  return data
}

export async function deleteJob(userId, jobId) {
  const api = createApi(userId)
  await api.delete(`/users/jobs/${jobId}`)
}

export async function deleteAllJobs(userId) {
  const api = createApi(userId)
  await api.delete('/users/jobs')
}

export async function regenerateSlot(userId, jobId, slotIndex, creativeType, customText, fmtName) {
  const api = createApi(userId)
  const { data } = await api.post(`/generate/${jobId}/regenerate`, {
    slot_index: slotIndex,
    creative_type: creativeType,
    custom_text: customText,
    fmt_name: fmtName,
  })
  return data
}

export async function createCheckout(userId, plan) {
  const api = createApi(userId)
  const { data } = await api.post(`/billing/checkout?plan=${plan}`)
  return data
}

export async function createPackCheckout(userId, pack) {
  const api = createApi(userId)
  const { data } = await api.post(`/billing/checkout-pack?pack=${pack}`)
  return data
}

export async function getReferralInfo(userId) {
  const api = createApi(userId)
  const { data } = await api.get('/users/referral')
  return data
}

export async function getPublicJob(jobId) {
  const { data } = await axios.get(`${API_BASE}/generate/${jobId}/share`)
  return data
}

export async function submitLead(jobId, lead) {
  const { data } = await axios.post(`${API_BASE}/leads/${jobId}`, lead)
  return data
}
