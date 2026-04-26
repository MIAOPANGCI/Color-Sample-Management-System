/* ========================================
   报废记录查看 scrap-management.js
   支持动态筛选 + 列配置
   ======================================== */
var _scrapPage=1,_scrapPageSize=20;
var _isAdmin=(JSON.parse(localStorage.getItem('user')||'{}')||{}).is_admin;
var _scrapColCount=8;

async function loadScrapList(page=1, forcedFilters=null){
    _scrapPage=page;
    const filters = forcedFilters || TableConfig.getFilters('scrap_list');
    // 报废API使用特殊参数名
    const params = {};

    if(filters && filters.length){
        filters.forEach((f,i)=>{
            params['f_field_'+i]=f.field; params['f_op_'+i]=f.op; params['f_val_'+i]=f.value;
        });
        // 映射到旧参数
        filters.forEach(f => {
            if(f.field === 'item_type') params.type = f.value;
            else if(f.field === '报废原因' || f.field === '报废类型' || f.field === '名称') params.keyword = f.value;
        });
    }

    const r=await API.get('/scrap',params);
    if(!r||!r.success)return;

    let items=r.data||[];
    // 客户端分页
    const total=items.length;const start=(page-1)*_scrapPageSize;const pagedItems=items.slice(start,start+_scrapPageSize);
    renderScrapTable(pagedItems,total);
}

function renderScrapTable(items,total){
    const tb=document.getElementById('scrap-tbody');
    const thead=document.getElementById('scrap-thead');
    if(!tb)return;

    const headInfo = TableConfig.generateThead('scrap_list');
    _scrapColCount = headInfo.colCount;
    if(thead) thead.innerHTML=headInfo.html;

    if(!items.length){
        tb.innerHTML=`<tr><td colspan="${_scrapColCount}" class="empty-state"><p>暂无报废记录</p></td></tr>`;
        document.getElementById('scrap-pagination').innerHTML='';return;
    }

    const columns=headInfo.columns;
    tb.innerHTML=items.map(item=>{
        let cells='';
        columns.forEach(col => { cells += `<td>${TableConfig.renderCell('scrap_list',col,item)}</td>`; });
        
        return`<tr>${cells}
        <td>
                <a href="#" class="btn-link" onclick="viewScrapDetail(${item.id});return false;">查看详情</a>
                ${_isAdmin?`<a href="#" class="btn-link warning" onclick="deleteScrapRecord(${item.id});return false;">删除恢复</a>`:''}
                ${_isAdmin?`<a href="#" class="btn-link danger" onclick="permanentDeleteScrap(${item.id});return false;">永久删除</a>`:''}
            </td>
        </tr>`;
    }).join('');
    document.getElementById('scrap-pagination').innerHTML=Utils.generatePagination(total,_scrapPage,_scrapPageSize);
}
window._currentPageHandler=loadScrapList;

window.viewScrapDetail=async(id)=>{
    const r=await API.get('/scrap');if(!r)return;
    const item=(r.data||[]).find(s=>s.id==id);if(!item){UI.Toast.error('未找到记录');return;}

    const typeTag=item['item_type']==='seal'?'封样件':'色板';

    UI.Drawer.show({
        title:'报废详情',width:420,
        content:`<dl class="desc-list">
            <dt>类型</dt><dd><span class="tag ${item['item_type']==='seal'?'tag-info':'tag-success'}">${typeTag}</span></dd>
            <dt>名称/编号</dt><dd>${Utils.escapeHtml(item['名称']||'-')}</dd>
            <dt>报废原因</dt><dd style="white-space:pre-wrap;line-height:1.6;">${Utils.escapeHtml(item['报废原因']||'-')}</dd>
            <dt>报废类型</dt><dd><span class="tag tag-warning">${Utils.escapeHtml(item['报废类型']||'-')}</span></dd>
            <dt>报废日期</dt><dd>${Utils.formatDate(item['报废日期'])}</dd>
            <dt>审批人</dt><dd>${Utils.escapeHtml(item['报废审批人']||'-')}</dd>
            <dt>备注</dt><dd>${Utils.escapeHtml(item['备注']||'-')}</dd>
            <dt>创建时间</dt><dd>${Utils.formatDateTime(item['created_at'])}</dd>
        </dl>`
    });
};

window.deleteScrapRecord=async(id)=>{
    const ok=await UI.Confirm.show('确定删除此报废记录？对应记录将恢复正常状态。','确认删除恢复','danger');
    if(ok){
        const r=await API.delete(`/scrap/${id}?restore=1`);
        if(r&&r.success){UI.Toast.success('已恢复');loadScrapList(_scrapPage);}
        else if(r)UI.Toast.error(r.message);}
};

window.permanentDeleteScrap=async(id)=>{
    const ok=await UI.Confirm.show('永久删除此报废记录？不可恢复！删除报废记录、寄出记录、原记录。','永久删除 - 不可逆操作','danger');
    if(ok){
        const r=await API.delete(`/scrap/${id}?permanent=1`);
        if(r&&r.success){UI.Toast.success('已永久删除');loadScrapList(_scrapPage);}
        else if(r)UI.Toast.error(r.message);}
};

// ===== 初始化 =====
(function initScrap(){
    const fn=function(){
        TableConfig.buildFilterToolbar('scrap_list', 'scrap-filter-toolbar');

        const tcBtnsEl=document.getElementById('scrap-tc-btns');
        if(tcBtnsEl) tcBtnsEl.innerHTML = TableConfig.buildToolbarButtons('scrap_list');

        TableConfig.onSearch('scrap_list', function(filters){ loadScrapList(1, filters); });
        TableConfig.onColumnChange('scrap_list', function(){ loadScrapList(_scrapPage); });

        if(document.getElementById('scrap-tbody'))loadScrapList(1);
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn();
})();
