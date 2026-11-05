/**
 * HealthSync AI - Healthcare Assistant Service
 *
 * All AI calls go through the HealthSync backend (/api/ai/*), which holds the Gemini
 * credentials. No API keys or model calls exist in the browser.
 *
 * Clinical safeguard: the assistant provides education only. It does not diagnose
 * or prescribe.
 */
import { apiRequest, getAccessToken, refreshAccessToken } from "@/lib/api";

export const SUGGESTED_PROMPTS = [
  { title: "Explain a CBC test", query: "Explain a CBC test." },
  { title: "What is HbA1c?", query: "What is HbA1c?" },
  { title: "Preparing for a blood test", query: "How should I prepare for a blood test?" },
  { title: "Blood test terminology", query: "Explain common blood test terminology." },
  { title: "Understand my report", query: "Help me understand my uploaded report." },
];

export const REPORT_ACCEPT = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

export const REPORT_MAX_MB = 10;

/**
 * Upload a report with progress using XMLHttpRequest (fetch has no upload progress).
 * Retries once after refreshing the access token on 401.
 */
function uploadWithProgress(file, onProgress, isRetry = false) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/ai/reports/summarize");
    xhr.withCredentials = true;
    const token = getAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.upload.onload = () => onProgress?.(100, "processing");

    xhr.onload = async () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }

      if (xhr.status === 401 && !isRetry) {
        const refreshed = await refreshAccessToken();
        if (refreshed?.accessToken) {
          uploadWithProgress(file, onProgress, true).then(resolve, reject);
          return;
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }

      const error = new Error(data?.message || `Upload failed (${xhr.status})`);
      error.status = xhr.status;
      error.code = data?.code;
      reject(error);
    };

    xhr.onerror = () => {
      const error = new Error("Network error while uploading. Please check your connection.");
      error.status = 0;
      reject(error);
    };

    xhr.send(form);
  });
}

export const aiService = {
  // ---- Chat ----
  async sendMessage({ conversationId = null, message }) {
    const res = await apiRequest("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ conversationId, message }),
    });
    return res.data;
  },

  async listConversations({ page = 1, limit = 30 } = {}) {
    const res = await apiRequest(`/ai/conversations?page=${page}&limit=${limit}`);
    return { conversations: res.data || [], pagination: res.pagination };
  },

  async getConversation(id, { page = 1, limit = 100 } = {}) {
    const res = await apiRequest(`/ai/conversations/${id}?page=${page}&limit=${limit}`);
    return res.data;
  },

  async renameConversation(id, title) {
    const res = await apiRequest(`/ai/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
    return res.data;
  },

  async deleteConversation(id) {
    return apiRequest(`/ai/conversations/${id}`, { method: "DELETE" });
  },

  async clearConversation(id) {
    return apiRequest(`/ai/conversations/${id}/messages`, { method: "DELETE" });
  },

  async getMyUsage() {
    const res = await apiRequest("/ai/usage");
    return res.data;
  },

  // ---- Reports ----
  /**
   * Client-side pre-check (the backend re-validates file content).
   * @returns {string|null} error message
   */
  validateReportFile(file) {
    if (!file) return "Please choose a file.";
    const name = file.name.toLowerCase();
    const allowedExt = Object.values(REPORT_ACCEPT).flat();
    if (!allowedExt.some((ext) => name.endsWith(ext)) || (file.type && !REPORT_ACCEPT[file.type])) {
      return "Only PDF, JPG, JPEG and PNG files are supported.";
    }
    if (file.size === 0) return "The selected file is empty.";
    if (file.size > REPORT_MAX_MB * 1024 * 1024) return `File is too large (maximum ${REPORT_MAX_MB} MB).`;
    return null;
  },

  uploadReport(file, onProgress) {
    return uploadWithProgress(file, onProgress);
  },

  async listReports({ page = 1, limit = 20 } = {}) {
    const res = await apiRequest(`/ai/reports?page=${page}&limit=${limit}`);
    return { reports: res.data || [], pagination: res.pagination };
  },

  async getReport(id) {
    const res = await apiRequest(`/ai/reports/${id}`);
    return res.data;
  },

  async deleteReport(id) {
    return apiRequest(`/ai/reports/${id}`, { method: "DELETE" });
  },

  async askReportQuestion(id, question) {
    const res = await apiRequest(`/ai/reports/${id}/questions`, {
      method: "POST",
      body: JSON.stringify({ question }),
    });
    return res.data;
  },

  // ---- Admin knowledge base ----
  async listKnowledge({ page = 1, limit = 20, search = "", status = "" } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res = await apiRequest(`/admin/ai/knowledge?${params.toString()}`);
    return { documents: res.data || [], pagination: res.pagination, retrievalMode: res.retrievalMode };
  },

  async getKnowledge(id) {
    const res = await apiRequest(`/admin/ai/knowledge/${id}`);
    return res.data;
  },

  async createKnowledge(payload) {
    const res = await apiRequest("/admin/ai/knowledge", { method: "POST", body: JSON.stringify(payload) });
    return res.data;
  },

  async updateKnowledge(id, payload) {
    const res = await apiRequest(`/admin/ai/knowledge/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    return res.data;
  },

  async deleteKnowledge(id) {
    return apiRequest(`/admin/ai/knowledge/${id}`, { method: "DELETE" });
  },

  async indexKnowledge(id, force = false) {
    return apiRequest(`/admin/ai/knowledge/${id}/index`, { method: "POST", body: JSON.stringify({ force }) });
  },

  async getUsageOverview(days = 7) {
    const res = await apiRequest(`/admin/ai/usage?days=${days}`);
    return res.data;
  },
};
