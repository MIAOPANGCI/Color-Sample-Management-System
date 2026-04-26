/* ========================================
   公共工具函数
   ======================================== */

const Utils = {
    formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
            return `${y}-${m}-${day}`;
        } catch { return dateStr; }
    },
    
    formatDateTime(dt) {
        if (!dt) return '-';
        try {
            const d = new Date(dt);
            if (isNaN(d.getTime())) return dt;
            return `${this.formatDate(dt)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
        } catch { return dt; }
    },
    
    calculateDeltaE(baselineL, baselineA, baselineB, currentL, currentA, currentB) {
        try {
            return Math.sqrt(
                Math.pow(currentL - baselineL, 2) +
                Math.pow(currentA - baselineA, 2) +
                Math.pow(currentB - baselineB, 2)
            );
        } catch { return 0; }
    },
    
    getDeltaEStatus(deltaE, thresholds) {
        const t = thresholds || { excellent: 1.0, good: 2.0, warning: 999.0 };
        if (deltaE < t.excellent) return { level: 'excellent', label: '优秀', class: 'delta-e-excellent' };
        if (deltaE < t.good) return { level: 'good', label: '合格', class: 'delta-e-good' };
        return { level: 'warning', label: '需关注', class: 'delta-e-warning' };
    },
    
    getStatusTag(status) {
        const map = {
            normal: { text: '正常', cls: 'tag-success' },
            pending_eval: { text: '待评定', cls: 'tag-warning' },
            expired: { text: '已过期', cls: 'tag-danger' },
            scrapped: { text: '已报废', cls: 'tag-default' }
        };
        return map[status] || { text: status, cls: 'tag-default' };
    },
    
    getExpiryStatus(expiryDate) {
        if (!expiryDate) return 'normal';
        const today = new Date(); today.setHours(0,0,0,0);
        const exp = new Date(expiryDate); exp.setHours(0,0,0,0);
        const daysLeft = Math.floor((exp - today) / (1000*60*60*24));
        if (isNaN(daysLeft)) return 'normal';
        if (daysLeft > 30) return 'normal';
        if (daysLeft > 0) return 'pending_eval';
        return 'expired';
    },
    
    getDaysLeft(expiryDate) {
        if (!expiryDate) return null;
        const today = new Date(); today.setHours(0,0,0,0);
        const exp = new Date(expiryDate); exp.setHours(0,0,0,0);
        return Math.floor((exp - today) / (1000*60*60*24));
    },
    
    generatePagination(total, page, pageSize) {
        const totalPages = Math.ceil(total / pageSize);
        let html = '<div class="pagination">';
        html += `<button ${page<=1?'disabled':''} onclick="goPage(${page-1})">上一页</button>`;
        for(let i=1;i<=totalPages;i++){
            if(totalPages>7){
                if(i===1||i===totalPages||Math.abs(i-page)<=1){
                    html += `<button class="${i===page?'active':''}" onclick="goPage(${i})">${i}</button>`;
                }else if(Math.abs(i-page)===2){
                    html+='<button disabled>...</button>';
                }
            } else {
                html += `<button class="${i===page?'active':''}" onclick="goPage(${i})">${i}</button>`;
            }
        }
        html+=`<button ${page>=totalPages?'disabled':''} onclick="goPage(${page+1})">下一页</button>`;
        html+=`<span class="page-info">共${total}条 第${page}/${totalPages}页</span></div>`;
        return html;
    },
    
    debounce(fn, delay=300) {
        let timer; return function(...args){clearTimeout(timer);timer=setTimeout(()=>fn.apply(this,args),delay);};
    },
    
    escapeHtml(str) {
        const div=document.createElement('div'); div.textContent=str; return div.innerHTML;
    },
    
    copyToClipboard(text) {
        if(navigator.clipboard&&window.isSecureContext){
            navigator.clipboard.writeText(text).then(()=>{
                UI.Toast.success('复制成功: ' + text.substring(0,8)+'...');
            }).catch(()=>{ this._copyFallback(text); });
        } else { this._copyFallback(text); }
    },
    _copyFallback(text){
        const ta=document.createElement('textarea');
        ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';
        document.body.appendChild(ta);
        ta.select();
        try{
            document.execCommand('copy');
            UI.Toast.success('复制成功: ' + text.substring(0,8)+'...');
        }catch(e){UI.Toast?.error('复制失败，请手动复制');}
        finally{document.body.removeChild(ta);}
    },
    
    formatNumber(num) {
        if(num==null)return'0';return Number(num).toLocaleString();
    },

    relativeTime(dtStr) {
        if(!dtStr)return'';
        const diff=(new Date()-new Date(dtStr))/1000;
        if(diff<60)return'刚刚';
        if(diff<3600)return Math.floor(diff/60)+'分钟前';
        if(diff<86400)return Math.floor(diff/3600)+'小时前';
        if(diff<2592000)return Math.floor(diff/86400)+'天前';
        return this.formatDate(dtStr);
    }
};

// 全局导出
window.Utils = Utils;
window.goPage=function(p){if(window._currentPageHandler)_currentPageHandler(p);};
