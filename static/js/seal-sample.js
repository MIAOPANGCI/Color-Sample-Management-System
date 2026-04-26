/* ========================================
   封样件台账 CRUD seal-sample.js
   支持动态筛选 + 列配置
   ======================================== */
var _sealPage=1,_sealPageSize=20;
var _sealColCount=8; // 动态列数(含操作)

async function loadSealSamples(page=1, forcedFilters=null){
    _sealPage=page;
    // 优先使用传入的filters（来自doSearch回调），否则从配置读取
    const filters = forcedFilters || TableConfig.getFilters('seal_sample');
    const params = { page, pageSize: _sealPageSize };
    if(filters && filters.length){
        filters.forEach((f,i)=>{
            params['f_field_'+i]=f.field;
            params['f_op_'+i]=f.op;
            params['f_val_'+i]=f.value;
        });
    }

    const result = await API.get('/seal-samples', params);
    if(!result||!result.success)return;
    renderSealTable(result.data);
}

function renderSealTable(data){
    const tbody=document.getElementById('seal-tbody');
    const thead=document.getElementById('seal-thead');
    if(!tbody)return;

    // 动态表头
    const headInfo = TableConfig.generateThead('seal_sample');
    _sealColCount = headInfo.colCount;
    if(thead) thead.innerHTML=headInfo.html;

    if(!data.items.length){
        tbody.innerHTML=`<tr><td colspan="${_sealColCount}" class="empty-state"><p>暂无数据</p></td></tr>`;
        document.getElementById('seal-pagination').innerHTML='';
        return;
    }

    const columns=headInfo.columns;
    tbody.innerHTML=data.items.map(item=>{
        let cells = '';
        columns.forEach(col => {
            cells += `<td>${TableConfig.renderCell('seal_sample',col,item)}</td>`;
        });
        // 操作列
        cells += `<td class="actions-cell">
            <a href="#" class="btn-link" onclick="viewSeal(${item.id});return false;">查看</a>
            ${item['状态']!=='scrapped'?`
            <a href="#" class="btn-link" onclick="editSeal(${item.id});return false;">编辑</a>`:''}
            ${(item['状态']==='pending_eval'||item['状态']==='expired')?`
            <a href="#" class="btn-link warning" onclick="evalSeal(${item.id});return false;">评定</a>`:''}
            ${item['状态']!=='scrapped'?`
            <a href="#" class="btn-link danger" onclick="deleteSeal(${item.id});return false;">删除</a>`:''}
        </td>`;
        return `<tr>${cells}</tr>`;
    }).join('');
    document.getElementById('seal-pagination').innerHTML=Utils.generatePagination(data.total,data.page,data.page_size);
}

window._currentPageHandler=loadSealSamples;

function openSealForm(id=null){
    let title=id?'编辑封样件':'新增封样件';
    let serialVal=id?'':'GKYJ-'+new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
    let serialReadonly='readonly style="background:var(--bg-lighter);cursor:default;"'; // 新增和编辑均不可修改序号
    // 编辑模式下签署人日期和有效期不可修改
    let dateReadonly=id?'readonly style="background:var(--bg-lighter);cursor:default;"':'';
    let formHtml=`
        <form id="seal-form">
            <div class="form-group"><label class="form-label required">序号</label><input type="text" name="序号" class="form-input" value="${serialVal}" ${serialReadonly} onclick="UI.Toast.info('序号自动生成，不允许修改')"></div>
            <div class="form-group"><label class="form-label required">项目</label><input type="text" name="项目" class="form-input" required></div>
            <div class="form-group"><label class="form-label required">封样件名称</label><input type="text" name="封样件名称" class="form-input" required></div>
            <div class="form-group"><label class="form-label required">签署人</label><input type="text" name="签署人" class="form-input" required></div>
            <div class="form-group"><label class="form-label required">签署人日期</label><input type="date" name="签署人日期" class="form-input" required ${dateReadonly} ${id?'onclick="UI.Toast.info(\'已新增的记录不允许修改签署人日期\')"':''}></div>
            <div class="form-group"><label class="form-label required">有效期</label><input type="date" name="有效期" class="form-input" required ${dateReadonly} ${id?'onclick="UI.Toast.info(\'已新增的记录不允许修改有效期\')"':''}></div>
            <div class="form-group"><label class="form-label required">提醒天数</label><input type="number" name="提醒天数" class="form-input" value="30" min="1" placeholder="到期前N天转为待评定" required>
                <small style="color:var(--text-muted);font-size:12px;">默认30天，到期前此天数将转为待评定状态</small>
            </div>
            <div class="form-group"><label class="form-label">备注</label><textarea name="备注" class="form-textarea" rows="3"></textarea></div>
        </form>`;

    UI.Modal.show({title,content:formHtml,
        footerHtml:`<button class="btn btn-outline" onclick="UI.Modal.close()">取消</button>
                    <button class="btn btn-primary" onclick="saveSeal(${id})">确定</button>`,
        closeOnOverlay:true});

    // 新增时：签署人日期变化 → 自动计算有效期=+1年
    if(!id){
        requestAnimationFrame(()=>{
            const f=document.getElementById('seal-form');
            if(f){const sd=f.querySelector('[name="签署人日期"]'),exp=f.querySelector('[name="有效期"]');
                if(sd&&exp)sd.addEventListener('change',()=>{
                    if(sd.value){const d=new Date(sd.value);d.setFullYear(d.getFullYear()+1);exp.value=d.toISOString().slice(0,10);}
                });}
        });
    }

    if(id){
        API.get(`/seal-samples/${id}`).then(r=>{
            if(r&&r.success){const d=r.data;const f=document.getElementById('seal-form');
                for(const[k,v]of Object.entries(d)){const el=f.querySelector(`[name="${k}"]`);if(el)el.value=v||'';}}
        });
    }
}

window.newSeal=()=>openSealForm();
window.editSeal=(id)=>openSealForm(id);
window.viewSeal=async(id)=>{
    const r=await API.get(`/seal-samples/${id}`);
    if(!r||!r.success)return;
    const d=r.data;const st=Utils.getStatusTag(d['状态']);
    UI.Modal.show({title:'查看封样件',footer:false,
        content:`<div class="desc-list">
            <dt>ID</dt><dd>${d.id}</dd><dt>序号</dt><dd>${d['序号']}</dd><dt>项目</dt><dd>${d['项目']||'-'}</dd>
            <dt>封样件名称</dt><dd>${d['封样件名称']||'-'}</dd><dt>签署人</dt><dd>${d['签署人']||'-'}</dd>
            <dt>签署人日期</dt><dd>${Utils.formatDate(d['签署人日期'])}</dd><dt>有效期</dt><dd>${Utils.formatDate(d['有效期'])}</dd>
            <dt>提醒天数</dt><dd>${d['提醒天数']||30}天</dd>
            <dt>状态</dt><dd><span class="tag ${st.cls}">${st.text}</span></dd><dt>备注</dt><dd>${d['备注']||'-'}</dd></div></div>`});
};

async function saveSeal(id){
    const f=document.getElementById('seal-form');if(!f)return;
    const fd=new FormData(f);const data={};
    fd.forEach((v,k)=>{if(v)data[k]=v.trim();});

    if(!data['序号']||!data['项目']||!data['封样件名称']||!data['签署人']||!data['签署人日期']||!data['有效期']||!data['提醒天数']){
        UI.Toast.warning('请填写必填项');return;
    }
    
    let result;
    if(id) result=await API.put(`/seal-samples/${id}`,data);
    else result=await API.post('/seal-samples',data);

    if(result&&result.success){UI.Modal.close();UI.Toast.success(result.message);loadSealSamples(_sealPage);}
    else if(result)UI.Toast.error(result.message||'操作失败');
}

window.deleteSeal=async(id)=>{
    const ok=await UI.Confirm.show('确定删除此封样件？此操作不可恢复。','确认删除','danger');
    if(ok){const r=await API.delete(`/seal-samples/${id}`);if(r&&r.success){UI.Toast.success('删除成功');loadSealSamples(_sealPage);}else if(r)UI.Toast.error(r.message);}
};

window.evalSeal=async function(id){ if(window.openEvalDialog){ openEvalDialog(id); } else { if(window.loadSubPage)loadSubPage('seal-evaluation.html');else window.location.href='seal-evaluation.html'; } };

// ===== 初始化：构建筛选面板 + 列设置按钮 + 绑定事件 =====
(function initSealSample(){
    const fn=function(){
        // 构建动态筛选面板
        TableConfig.buildFilterToolbar('seal_sample', 'seal-filter-toolbar');

        // 列设置按钮
        const tcBtnsEl=document.getElementById('seal-tc-btns');
        if(tcBtnsEl) tcBtnsEl.innerHTML = TableConfig.buildToolbarButtons('seal_sample');

        // 筛选回调（接收doSearch传来的最新filters）
        TableConfig.onSearch('seal_sample', function(filters){ loadSealSamples(1, filters); });

        // 列变更回调 → 重新加载
        TableConfig.onColumnChange('seal_sample', function(){ loadSealSamples(_sealPage); });

        // 导出/导入绑定
        document.getElementById('seal-export-btn')?.addEventListener('click',async()=>{
            window.open('/api/seal-samples/export?token='+localStorage.getItem('token'));
        });
        document.getElementById('seal-import-btn')?.addEventListener('change',async(e)=>{
            const file=e.target.files[0];if(!file)return;
            const fd=new FormData();fd.append('file',file);
            const r=await API.upload('/seal-samples/import',fd);
            if(r&&r.success){UI.Toast.success(r.message);loadSealSamples(1);}else if(r)UI.Toast.error(r.message||'导入失败');
            e.target.value='';
        });

        // 初始加载
        if(document.getElementById('seal-tbody'))loadSealSamples(1);
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn();
})();
