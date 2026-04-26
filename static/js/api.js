/* ========================================
   API封装 - fetch/JWT拦截器/401处理
   ======================================== */
const API = {
    baseUrl: '/api',
    
    async request(url, options = {}) {
        const defaultHeaders = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(this.baseUrl + url, {
                ...options,
                headers: { ...defaultHeaders, ...options.headers }
            });
            
            // 401自动跳转登录（含账户被停用）
            if (response.status === 401) {
                const data = await response.json().catch(() => ({}));
                if(data.code==='ACCOUNT_DISABLED'){
                    UI.Toast?.error('账户已被管理员停用');
                }
                // 尝试调logout接口清除在线状态（静默失败）
                const t=localStorage.getItem('token');
                if(t){fetch('/api/auth/logout',{method:'POST',headers:{'Authorization':'Bearer '+t}}).catch(()=>{});}
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return null;
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API请求失败:', url, error);
            UI.Toast.error('网络请求失败，请检查连接');
            return null;
        }
    },
    
    get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(url + (queryString ? '?' + queryString : ''));
    },
    
    post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    delete(url) {
        return this.request(url, { method: 'DELETE' });
    },
    
    async upload(url, formData) {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(this.baseUrl + url, {
                method: 'POST',
                headers: { ...(token ? {'Authorization':`Bearer ${token}`} : {})},
                body: formData
            });
            if (response.status === 401) {
                localStorage.removeItem('token'); localStorage.removeItem('user');
                window.location.href = '/login'; return null;
            }
            return await response.json();
        } catch(e) {
            UI.Toast.error('上传失败'); return null;
        }
    }
};

// 全局导出
window.API = API;
