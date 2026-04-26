/* ========================================
   仪表盘 dashboard.js
   ======================================== */

async function loadDashboard() {
    const [statsResult, warningsResult] = await Promise.all([
        API.get('/dashboard/stats'),
        API.get('/dashboard/warnings')
    ]);

    if (statsResult && statsResult.success) renderStatsCards(statsResult.data);
    if (warningsResult && warningsResult.success) renderWarnings(warningsResult.data);
}

function renderStatsCards(data) {
    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    const cards = [
        { label: '封样件总数', value: data.sealTotal || 0, color: 'blue', icon: 'clipboard' },
        { label: '色板总数', value: data.colorTotal || 0, color: 'green', icon: 'package' },
        { label: '待评定数', value: data.pendingEval || 0, color: 'orange', icon: 'alert', pulse: data.pendingEval > 0 },
        { label: '已报废数', value: data.scrappedTotal || 0, color: 'red', icon: 'trash' }
    ];

    grid.innerHTML = cards.map(c => `
        <div class="stat-card ${c.color}">
            <div class="stat-icon ${c.color}">
                ${getStatIcon(c.icon)}
            </div>
            <div class="stat-info">
                <div class="stat-number ${c.color}" data-target="${c.value}">0</div>
                <div class="stat-label">${c.label}${c.pulse ? ' ⚠' : ''}</div>
            </div>
        </div>
    `).join('');

    grid.querySelectorAll('.stat-number[data-target]').forEach(el => {
        animateNumber(el, parseInt(el.dataset.target));
    });
}

function getStatIcon(type) {
    const icons = {
        clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg>',
        package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
        alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'
    };
    return icons[type] || '';
}

function animateNumber(el, target) {
    const duration = 800;
    const start = performance.now();
    function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function renderWarnings(warnings) {
    const tableBody = document.getElementById('warnings-tbody');
    const timelineEl = document.getElementById('timeline-list');
    if (!tableBody) return;

    if (!warnings || warnings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>暂无到期预警</p></td></tr>';
        if(timelineEl)timelineEl.innerHTML='<p style="color:var(--text-muted);padding-left:24px;">暂无近期操作</p>';
        return;
    }

    tableBody.innerHTML = warnings.map(w => {
        const typeTag = w.type === 'seal' ? '<span class="tag tag-info">封样件</span>' : '<span class="tag tag-success">色板</span>';
        const isExpired = w.status === 'expired';
        const daysCls = isExpired || w.daysLeft <= 7 ? 'days-critical' : (w.daysLeft <= 30 ? 'days-warning' : '');
        const daysText = isExpired ? `已过期${Math.abs(w.daysLeft)}天` : `${w.daysLeft}天`;
        const statusInfo = Utils.getStatusTag(Utils.getExpiryStatus(w.expiry));
        return `<tr>
            <td>${Utils.escapeHtml(w['序号']||w.id)}</td>
            <td>${typeTag}</td>
            <td><strong>${Utils.escapeHtml(w.name)}</strong></td>
            <td class="${daysCls}">${daysText}</td>
            <td><span class="tag ${statusInfo.cls}">${statusInfo.text}</span></td>
            <td><a href="#" class="btn btn-sm btn-outline" onclick="goEvaluate('${w.type}',${w.id});return false;">去评定</a></td>
        </tr>`;
    }).join('');

    if (timelineEl) {
        timelineEl.innerHTML = warnings.slice(0, 5).map((w,i) => `
            <div class="timeline-item">
                <div class="timeline-dot ${i%3===0?'add':i%3===1?'eval':'send'}"></div>
                <div class="time-text">${Utils.relativeTime(new Date(Date.now()-i*7200000).toISOString())}</div>
                <div class="time-action">${['新增','评定','寄出'][i%3]}</div>
                <div class="time-target">${w.name}</div>
            </div>
        `).join('');
    }
}

function goEvaluate(type, id) {
    const pageMap = { seal: 'seal-evaluation.html', color: 'color-evaluation.html' };
    if (window.loadSubPage) {
        loadSubPage(pageMap[type]);
    } else {
        window.location.href = pageMap[type];
    }
}

// 兼容直接加载和动态加载两种场景
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadDashboard);
else loadDashboard();
