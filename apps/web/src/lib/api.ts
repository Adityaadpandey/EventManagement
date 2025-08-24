import axios from "axios";

const api = axios.create({
	baseURL: "https://alphaevents.sevalla.app/api/v1",
	headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
	if (typeof window !== "undefined") {
		const token = localStorage.getItem("token");
		if (token) config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export default api;
