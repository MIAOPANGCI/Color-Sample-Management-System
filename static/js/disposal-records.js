/* ========================================
   处置记录管理 disposal-records.js
   评定记录 + 报废记录统一视图（含软删除/恢复/永久删除）
   ======================================== */
var _drPage=1, _drPageSize=20, _allRecords=[], _showDeleted=false;
var _drColCount=9;
var _isAdmin = false;  // 从登录信息读取

async function loadDisposalRecords(page=1, forcedFilters=null){
    _drPage=page;
    const filters = forcedFilters || TableConfig.getFilters('disposal_records');
    const params = { page, pageSize: _drPageSize };
    if(_showDeleted) params.includeDeleted = '1';

    if(filters && filters.length){
        filters.forEach((f,i)=>{
            params['f_field_'+i]=f.field; params['f_op_'+i]=f.op; params['f_val_'+i]=f.value;
        });
    }

    const r = await API.get('/disposal-records', params);
    if(!r || !r.success) return;

    _allRecords = r.data.items;
    renderDisposalTable(r.data);
}

function renderDisposalTable(data){
    const tb = document.getElementById('dr-tbody');
    const thead = document.getElementById('dr-thead');
    if(!tb) return;

    // 使用 table-config 动态表头
    const headInfo = TableConfig.generateThead('disposal_records');
    _drColCount = headInfo.colCount;
    if(thead) thead.innerHTML = headInfo.html;

    if(!data.items.length){
        tb.innerHTML = `<tr><td colspan="${_drColCount}" class="empty-state"><p>暂无处置记录</p></td></tr>`;
        document.getElementById('dr-pagination').innerHTML = '';
        return;
    }

    const columns = headInfo.columns;
    tb.innerHTML = data.items.map(item => {
        let cells = '';
        columns.forEach(col => {
            cells += `<td>${renderDisposalCell(col, item)}</td>`;
        });

        // 操作列
        const isEval = item.record_type === 'evaluation';
        let actionsHtml = `<a href="#" class="btn-link" onclick="viewDisposalDetail(${item.id},'${item.record_type}');return false;">查看详情</a>`;
        if(_isAdmin){
            if(!_showDeleted){
                actionsHtml += ` <a href="#" class="btn-link btn-link-danger" onclick="softDeleteRecord(${item.id},'${item.record_type}');return false;">删除</a>`;
            } else {
                actionsHtml += ` <a href="#" class="btn-link" style="color:var(--success);" onclick="restoreRecord(${item.id},'${item.record_type}');return false;">恢复</a>`;
                actionsHtml += ` <a href="#" class="btn-link btn-link-danger" onclick="permanentDeleteRecord(${item.id},'${item.record_type}','${Utils.escapeHtml(item.item_name||'')}');return false;">永久删除</a>`;
            }
        }
        cells += `<td class="actions-cell">${actionsHtml}</td>`;
        return `<tr>${cells}</tr>`;
    }).join('');

    document.getElementById('dr-pagination').innerHTML = Utils.generatePagination(data.total, data.page, data.page_size);
}
window._currentPageHandler = (p) => loadDisposalRecords(p);

// 自定义单元格渲染
function renderDisposalCell(colName, item){
    const isEval = item.record_type === 'evaluation';

    switch(colName){
        case '记录类型':
            return isEval
                ? '<span class="tag tag-success">评定</span>'
                : '<span class="tag tag-danger">报废</span>';

        case '对象类型':
            return item.item_type === 'seal'
                ? '<span class="tag tag-info">封样件</span>'
                : '<span class="tag tag-primary">色板</span>';

        case '编号':
            return Utils.escapeHtml(item.item_serial || '-');

        case '名称':
            return Utils.escapeHtml(item.item_name || '-');

        case '结果/原因':
            if(isEval){
                const resultTag = item.评定结果 === 'pass'
                    ? '<span class="tag tag-success">合格续期</span>'
                    : '<span class="tag tag-danger">不合格</span>';
                return resultTag;
            } else {
                return `<span style="max-width:200px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${Utils.escapeHtml(item.报废原因||'')}">${Utils.escapeHtml(item.报废原因||'-')}</span>`;
            }

        case '操作人':
            return Utils.escapeHtml(isEval ? (item.评定人 || '-') : (item.报废审批人 || '-'));

        case '日期':
            return Utils.formatDate(isEval ? item.评定日期 : item.报废日期);

        case '详情':
            if(isEval){
                const de = item.计算ΔE值;
                let deStr = '-';
                if(de != null){
                    deStr = `<span style="color:var(--primary);font-weight:600;">ΔE=${parseFloat(de).toFixed(2)}</span>`;
                }
                const newExp = item.新有效期截止日
                    ? `<br><small style="color:var(--success);">新有效期: ${Utils.formatDate(item.新有效期截止日)}</small>`
                    : '';
                const note = item.评定说明 ? `<br><small style="color:var(--text-muted);">${Utils.escapeHtml(item.评定说明)}</small>` : '';
                return `${deStr}${newExp}${note}`;
            } else {
                const stype = item.报废类型
                    ? `<span class="tag tag-warning">${Utils.escapeHtml(item.报废类型)}</span>`
                    : '-';
                const note = item.备注 ? `<br><small>${Utils.escapeHtml(item.备注)}</small>` : '';
                return `${stype}${note}`;
            }

        default:
            var val = item[colName];
            if(val === null || val === undefined) return '-';
            return Utils.escapeHtml(String(val));
    }
}

// 查看处置记录详情
window.viewDisposalDetail = async(id, recordType)=>{
    if(recordType === 'evaluation'){
        // 从全量缓存中找，或单独请求
        const r = await API.get('/evaluations', { itemId: '' }); // 获取全部评定记录
        if(!r || !r.success) return;
        const item = (r.data || []).find(e => e.id === id);
        if(!item){ UI.Toast.error('未找到该评定记录'); return; }
        showEvaluationDetail(item);
    } else {
        // 报废记录 - 请求scrap列表
        const r = await API.get('/scrap');
        if(!r || !r.success) return;
        const item = (r.data || []).find(s => s.id === id);
        if(!item){ UI.Toast.error('未找到该报废记录'); return; }
        showScrapDetail(item);
    }
};

function showEvaluationDetail(item){
    const resultTag = item.评定结果 === 'pass'
        ? '<span class="tag tag-success">合格 - 续期</span>'
        : '<span class="tag tag-danger">不合格 - 报废</span>';
    const typeTag = item.item_type === 'seal'
        ? '<span class="tag tag-info">封样件</span>'
        : '<span class="tag tag-primary">色板</span>';

    let labHtml = '';
    if(item.item_type === 'color' && item.评定结果 === 'pass'){
        labHtml = `
            <div style="margin-top:12px;padding:12px;background:var(--bg-lighter);border-radius:8px;">
                <div style="font-size:13px;font-weight:600;margin-bottom:8px;">Lab色差测量数据</div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">
                    <div><div style="font-size:11px;color:var(--text-muted);">当前L值</div><div style="font-weight:600;">${item.当前L值||'-'}</div></div>
                    <div><div style="font-size:11px;color:var(--text-muted);">当前a值</div><div style="font-weight:600;">${item.当前a值||'-'}</div></div>
                    <div><div style="font-size:11px;color:var(--text-muted);">当前b值</div><div style="font-weight:600;">${item.当前b值||'-'}</div></div>
                </div>
                <div style="text-align:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--border-light);">
                    <span style="font-size:18px;font-weight:700;color:var(--primary);">ΔE = ${item.计算ΔEValue?parseFloat(item.计算ΔE值).toFixed(4):'-'}</span>
                </div>
            </div>`;
    }

    UI.Drawer.show({
        title: '评定记录详情',
        width: 480,
        content: `<dl class="desc-list">
            <dt>记录ID</dt><dd>#${item.id}</dd>
            <dt>对象类型</dt><dd>${typeTag}</dd>
            <dt>关联ID</dt><dd>${item.item_id}</dd>
            <dt>评定结果</dt><dd>${resultTag}</dd>
            <dt>评定人</dt><dd>${Utils.escapeHtml(item.评定人||'-')}</dd>
            <dt>评定日期</dt><dd>${Utils.formatDate(item.评定日期)}</dd>
            ${item.新有效期截止日?`<dt>新有效期截止日</dt><dd><span style="color:var(--success);font-weight:600;">${Utils.formatDate(item.新有效期截止日)}</span></dd>`:''}
            ${item.评定说明?`<dt>评定说明</dt><dd style="white-space:pre-wrap;">${Utils.escapeHtml(item.评定说明)}</dd>`:''}
            <dt>创建时间</dt><dd>${Utils.formatDateTime(item.created_at)}</dd>
        </dl>${labHtml}`
    });
}

function showScrapDetail(item){
    const typeTag = item.item_type === 'seal'
        ? '<span class="tag tag-info">封样件</span>'
        : '<span class="tag tag-primary">色板</span>';

    UI.Drawer.show({
        title: '报废记录详情',
        width: 420,
        content: `<dl class="desc-list">
            <dt>记录ID</dt><dd>#${item.id}</dd>
            <dt>对象类型</dt><dd>${typeTag}</dd>
            <dt>编号</dt><dd>${Utils.escapeHtml(item.序号||item.item_serial||'-')}</dd>
            <dt>名称</dt><dd>${Utils.escapeHtml(item.名称||item.item_name||'-')}</dd>
            <dt>报废原因</dt><dd style="white-space:pre-wrap;line-height:1.6;color:var(--danger);">${Utils.escapeHtml(item.报废原因||'-')}</dd>
            <dt>报废类型</dt><dd><span class="tag tag-warning">${Utils.escapeHtml(item.报废类型||'-')}</span></dd>
            <dt>报废日期</dt><dd>${Utils.formatDate(item.报废日期)}</dd>
            <dt>审批人</dt><dd>${Utils.escapeHtml(item.报废审批人||'-')}</dd>
            ${item.备注?`<dt>备注</dt><dd>${Utils.escapeHtml(item.备注)}</dd>`:''}
            <dt>创建时间</dt><dd>${Utils.formatDateTime(item.created_at)}</dd>
        </dl>`
    });
}

// 导出处置记录
window.exportDisposalRecords = () => {
    window.open('/api/disposal-records/export?token=' + localStorage.getItem('token'));
};

// ===== 管理员操作 =====

window.softDeleteRecord = async(id, recordType) => {
    const label = recordType === 'evaluation' ? '评定记录' : '报废记录';
    const ok = await UI.Confirm.show(`确认删除`, `确定要将该${label}移至回收站吗？<br><small style="color:var(--text-muted);">可在回收站中恢复或永久删除</small>`);
    if(!ok) return;
    try {
        const r = await API.post(`/disposal-records/${recordType}/${id}/delete`);
        if(r && r.success){
            UI.Toast.success(`${label}已移至回收站`);
            loadDisposalRecords(1);
        } else { UI.Toast.error(r?.message || '操作失败'); }
    } catch(e){ UI.Toast.error('网络错误'); }
};

window.restoreRecord = async(id, recordType) => {
    const label = recordType === 'evaluation' ? '评定记录' : '报废记录';
    const ok = await UI.Confirm.show(`确认恢复`, `确定要恢复该${label}吗？`);
    if(!ok) return;
    try {
        const r = await API.post(`/disposal-records/${recordType}/${id}/restore`);
        if(r && r.success){
            UI.Toast.success(`${label}已恢复`);
            loadDeletedRecords();
        } else { UI.Toast.error(r?.message || '操作失败'); }
    } catch(e){ UI.Toast.error('网络错误'); }
};

window.permanentDeleteRecord = async(id, recordType, itemName) => {
    const label = recordType === 'evaluation' ? '评定记录' : '报废记录';
    const ok = await UI.Confirm.show(
        `⚠️ 永久删除`,
        `<div style="color:var(--danger);font-weight:600;margin-bottom:8px;">此操作不可恢复！</div>
         将永久删除该${label}<b>${Utils.escapeHtml(itemName)}</b><br>
         <small>同时会删除关联的寄出记录</small>`
    );
    if(!ok) return;
    try {
        const r = await API.post(`/disposal-records/${recordType}/${id}/permanent-delete`);
        if(r && r.success){
            UI.Toast.success('已永久删除');
            loadDeletedRecords();
        } else { UI.Toast.error(r?.message || '操作失败'); }
    } catch(e){ UI.Toast.error('网络错误'); }
};

// 加载回收站（已删除记录）
async function loadDeletedRecords(){
    _showDeleted = true;
    updateRecycleBinUI(true);
    try {
        const r = await API.get('/disposal-records/deleted-list');
        if(!r || !r.success) return;
        renderDisposalTable({items: r.data.items, total: r.data.total, page: 1, page_size: 999});
    } catch(e){ UI.Toast.error('加载失败'); }
}

// 返回正常列表
function backToNormalList(){
    _showDeleted = false;
    updateRecycleBinUI(false);
    loadDisposalRecords(1);
}

// 更新回收站模式 UI 状态
function updateRecycleBinUI(isRecycleMode){
    const titleEl = document.querySelector('#disposal-records-page .page-title');
    if(titleEl) titleEl.textContent = isRecycleMode ? '回收站' : '处置记录';

    // 更新 header-actions 区域
    const headerActions = document.querySelector('#disposal-records-page .header-actions');
    if(headerActions && _isAdmin){
        if(isRecycleMode){
            headerActions.innerHTML = `
                <button class="btn btn-outline btn-sm" onclick="backToNormalList()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="15,18 9,12 15,6"/></svg>
                    返回列表
                </button>`;
        } else {
            headerActions.innerHTML = `
                <button class="btn btn-outline btn-sm" onclick="loadDeletedRecords()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    回收站
                </button>
                <button class="btn btn-outline btn-sm" onclick="exportDisposalRecords()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    导出
                </button>`;
        }
    }

    // 回收站模式下隐藏筛选和列设置
    const filterBar = document.getElementById('dr-filter-toolbar');
    if(filterBar) filterBar.style.display = isRecycleMode ? 'none' : '';
    const toolbar = document.querySelector('#disposal-records-page .toolbar');
    if(toolbar) toolbar.style.display = isRecycleMode ? 'none' : '';
}

// ===== 初始化 =====
(function initDisposalRecords(){
    const fn = function(){
        // 读取管理员身份
        try{
            const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
            _isAdmin = !!userInfo.is_admin;
        } catch(e){ _isAdmin = false; }

        TableConfig.buildFilterToolbar('disposal_records', 'dr-filter-toolbar');

        const tcBtnsEl = document.getElementById('dr-tc-btns');
        if(tcBtnsEl) tcBtnsEl.innerHTML = TableConfig.buildToolbarButtons('disposal_records');

        TableConfig.onSearch('disposal_records', function(filters){ loadDisposalRecords(1, filters); });
        TableConfig.onColumnChange('disposal_records', function(){ loadDisposalRecords(_drPage); });

        // 管理员：更新头部按钮（添加回收站入口）
        if(_isAdmin) updateRecycleBinUI(false);

        if(document.getElementById('dr-tbody')) loadDisposalRecords(1);
    };
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn();
})();
