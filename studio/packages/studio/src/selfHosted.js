// Client for an optional self-hosted, free video-generation backend (see
// studio/self-hosted-server/). Unlike Muapi, this backend has no API key and
// no per-generation billing — it just calls whatever open-source model server
// you point it at (default: http://localhost:8000).

const DEFAULT_BASE_URL = 'http://localhost:8000';
let baseUrl = DEFAULT_BASE_URL;

export function configureFreeServer(url) {
    baseUrl = (url && url.trim()) || DEFAULT_BASE_URL;
}

export function getFreeServerUrl() {
    return baseUrl;
}

export async function checkFreeServerHealth() {
    try {
        const res = await fetch(`${baseUrl}/health`);
        if (!res.ok) return { online: false };
        const data = await res.json();
        return { online: true, ...data };
    } catch {
        return { online: false };
    }
}

function absoluteUrl(url) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

async function pollJob(jobId, { maxAttempts = 600, interval = 3000 } = {}) {
    const url = `${baseUrl}/api/v1/jobs/${jobId}`;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, interval));
        let data;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status >= 500) continue;
                throw new Error(`Free server poll failed: ${response.status}`);
            }
            data = await response.json();
        } catch (error) {
            if (attempt === maxAttempts) throw error;
            continue;
        }
        if (data.status === 'completed') return data;
        if (data.status === 'failed') throw new Error(data.error || 'Free server generation failed');
    }
    throw new Error('Free server generation timed out.');
}

async function submit(payload) {
    let response;
    try {
        response = await fetch(`${baseUrl}/api/v1/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch {
        throw new Error(`Could not reach the free server at ${baseUrl}. Is it running? See studio/self-hosted-server/README.md.`);
    }
    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Free server request failed: ${response.status} ${errText.slice(0, 150)}`);
    }
    const data = await response.json();
    if (!data.job_id) throw new Error('Free server did not return a job_id');
    return data.job_id;
}

export async function generateVideo(params) {
    const jobId = await submit({
        model: params.model,
        prompt: params.prompt || '',
        aspect_ratio: params.aspect_ratio,
        duration: params.duration,
        resolution: params.resolution,
    });
    if (params.onRequestId) params.onRequestId(jobId);
    const result = await pollJob(jobId);
    return { ...result, id: jobId, url: absoluteUrl(result.url) };
}

export async function generateI2V(params) {
    const jobId = await submit({
        model: params.model,
        prompt: params.prompt || '',
        aspect_ratio: params.aspect_ratio,
        duration: params.duration,
        resolution: params.resolution,
        image_url: params.image_url,
    });
    if (params.onRequestId) params.onRequestId(jobId);
    const result = await pollJob(jobId);
    return { ...result, id: jobId, url: absoluteUrl(result.url) };
}

export function uploadFile(file, onProgress) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${baseUrl}/api/v1/upload`);

        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (!data.url) { reject(new Error('No URL returned from free server upload')); return; }
                    resolve(absoluteUrl(data.url));
                } catch {
                    reject(new Error('Failed to parse free server upload response'));
                }
            } else {
                reject(new Error(`Free server upload failed: ${xhr.status}`));
            }
        };
        xhr.onerror = () => reject(new Error(`Could not reach the free server at ${baseUrl}. Is it running?`));
        xhr.send(formData);
    });
}
