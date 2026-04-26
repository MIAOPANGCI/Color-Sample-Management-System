/* ========================================
   色板台账 CRUD color-sample.js (28字段)
   支持动态筛选 + 列配置
   ======================================== */
var _colorPage=1,_colorPageSize=20;
var _colorColCount=13;

async function loadColorSamples(page=1, forcedFilters=null){
    _colorPage=page;
    // 优先使用传入的filters（来自doSearch回调），否则从配置读取
    const filters = forcedFilters || TableConfig.getFilters('color_sample');
    const params = { page, pageSize: _colorPageSize };
    
    // 兼容旧API: 将动态筛选转为原有参数格式（同时保留旧参数兼容）
    if(filters && filters.length){
        filters.forEach((f,i)=>{
            params['f_field_'+i]=f.field; params['f_op_'+i]=f.op; params['f_val_'+i]=f.value;
        });
        // 同时映射到旧参数以保持后端兼容
        filters.forEach(f => {
            if(f.field === '客户') params.customer = f.value;
            else if(f.field === '适用车型') params.model = f.value;
            else if(f.field === '颜色名称') params.colorName = f.value;
            else if(f.field === '样板供应商') params.supplier = f.value;
        });
    }

    const result = await API.get('/color-samples', params);
    if(!result||!result.success)return;
    renderColorTable(result.data);
}

function renderColorTable(data){
    const tb=document.getElementById('color-tbody');
    const thead=document.getElementById('color-thead');
    if(!tb)return;

    // 动态表头(含操作列)
    const headInfo = TableConfig.generateThead('color_sample'); // 默认 extraCol=undefined → 包含操作
    _colorColCount = headInfo.colCount;
    if(thead) thead.innerHTML = headInfo.html;

    if(!data.items.length){
        tb.innerHTML=`<tr><td colspan="${_colorColCount}" class="empty-state"><p>暂无数据</p></td></tr>`;
        document.getElementById('color-pagination').innerHTML='';return;
    }

    const columns=headInfo.columns; // 不含操作列
    tb.innerHTML=data.items.map(item=>{
        const st=Utils.getStatusTag(item['状态']);
        const qty=item['当前持有数量']||0;
        const qtyClass=qty<=5?'qty-low':'';
        const de=item['ΔE值'];
        let deDisplay='-';
        if(de!=null){
            const deInfo=Utils.getDeltaEStatus(parseFloat(de));
            deDisplay=`<span style="display:inline-flex;align-items:center;gap:4px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${deInfo.level==='excellent'?'var(--success)':deInfo.level==='good'?'var(--warning)':'var(--danger)'}"></span>
                ${parseFloat(de).toFixed(2)}</span>`;
        }

        let cells='';
        columns.forEach(col => { cells += `<td>${TableConfig.renderCell('color_sample',col,item)}</td>`; });
        
        return `<tr data-id="${item.id}">
            ${cells}
            <td class="actions-cell">
                <a href="#" class="btn-link" onclick="toggleExpandRow(this,${item.id});return false;">展开 ▾</a>
                ${item['状态']!=='scrapped'?`
                <a href="#" class="btn-link" onclick="editColorSample(${item.id});return false;">编辑</a>
                ${item['状态']!=='normal'?`<a href="#" class="btn-link warning" onclick="goToColorEval(${item.id});return false;">评定</a>`:''}
                <a href="#" class="btn-link success" onclick="openColorSendForm(${item.id},'${Utils.escapeHtml(item['颜色名称']||'')}',${item['当前持有数量']||0});return false;">寄出</a>
                <a href="#" class="btn-link danger" onclick="deleteColorSample(${item.id});return false;">删除</a>`:''}
            </td>
        </tr>
        <!-- 展开行 -->
        <tr class="expand-row hidden" id="expand-${item.id}">
            <td colspan="${_colorColCount}"><div class="expand-content">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                    <div><strong style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;display:block;">Lab色彩空间基准值</strong>
                        <dl class="desc-list"><dt>L值</dt><dd>${item['L值']??'-'}<br><small style="color:var(--text-muted)">基准L值</small></dd>
                        <dt>a值</dt><dd>${item['a值']??'-'}<br><small style="color:var(--text-muted)">基准a值</small></dd>
                        <dt>b值</dt><dd>${item['b值']??'-'}<br><small style="color:var(--text-muted)">基准b值</small></dd>
                        <dt>c值</dt><dd>${item['c值']??'-'}</dd><dt>h值</dt><dd>${item['h值']??'-'}</dd></dl></div>
                    <div><strong style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;display:block;">色差参数</strong>
                        <dl class="desc-list"><dt>ΔL值</dt><dd>${item['ΔL值']??'-'}</dd><dt>Δa值</dt><dd>${item['Δa值']??'-'}</dd>
                        <dt>Δb值</dt><dd>${item['Δb值']??'-'}</dd><dt>Δc值</dt><dd>${item['Δc值']??'-'}</dd>
                        <dt>Δh值</dt><dd>${item['Δh值']??'-'}</dd><dt>ΔE值</dt><dd>${item['ΔE值']??'-'}</dd></dl></div>
                </div>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-light);">
                    <strong style="font-size:12px;color:var(--text-muted);">其他信息：</strong>
                    颜色色值转化码:${item['颜色色值转化码']||'-'} | 纹理代码:${item['纹理代码']||'-'} | 光泽度:${item['光泽度']||'-'}
                    | 供应商代码:${item['供应商代码']||'-'} | 制作信息:${item['制作信息']||'-'} | 使用光源角度:${item['使用的光源角度']||'-'}
                </div>
            </div></td>
        </tr>`;
    }).join('');
    document.getElementById('color-pagination').innerHTML=Utils.generatePagination(data.total,data.page,data.page_size);
}
window._currentPageHandler=loadColorSamples;

window.toggleExpandRow=function(el,id){
    const expandRow=document.getElementById(`expand-${id}`);
    if(expandRow){const isHidden=expandRow.classList.contains('hidden');expandRow.classList.toggle('hidden');el.textContent=isHidden?'收起 ▴':'展开 ▾';}
};

// 单页完整表单 (保持不变)
window.openColorForm=function(id=null){
    const isEdit=!!id;const title=isEdit?'编辑色板':'新增色板';
    const bodyHtml=`<form id="color-form" style="--fg-mb:4px;"><style>#color-form .form-group{margin-bottom:var(--fg-mb)}</style>
        <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:8px;">
            <div style="display:flex;flex-direction:column;gap:6px;">
                <fieldset style="border:1px solid var(--border-light);border-radius:8px;padding:10px;margin:0;">
                    <legend style="font-weight:600;color:var(--text-primary);padding:0 8px;">基础信息</legend>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                        <div class="form-group"><label class="form-label required">序号</label><input type="text" name="序号" id="cf-序号" class="form-input" readonly style="background:var(--bg-lighter);cursor:default;" onclick="UI.Toast.info('序号自动生成，不允许修改')" required></div>
                        <div class="form-group"><label class="form-label required">客户</label><input type="text" name="客户" class="form-input" required></div>
                        <div class="form-group"><label class="form-label required">适用车型</label><input type="text" name="适用车型" class="form-input" required></div>
                        <div class="form-group"><label class="form-label required">颜色名称</label><input type="text" name="颜色名称" class="form-input" required></div>
                        <div class="form-group"><label class="form-label">样板供应商</label><input type="text" name="样板供应商" class="form-input"></div>
                        <div class="form-group"><label class="form-label">颜色色值转化码</label><input type="text" name="颜色色值转化码" class="form-input"></div>
                        <div class="form-group"><label class="form-label">纹理代码</label><input type="text" name="纹理代码" class="form-input"></div>
                        <div class="form-group"><label class="form-label">光泽度</label><input type="text" name="光泽度" class="form-input"></div>
                        <div class="form-group"><label class="form-label">供应商代码</label><input type="text" name="供应商代码" class="form-input"></div>
                        <div class="form-group"><label class="form-label">制作信息</label><input type="text" name="制作信息" class="form-input"></div>
                    </div>
                </fieldset>
                <fieldset style="border:1px solid var(--border-light);border-radius:8px;padding:10px;margin:0;">
                    <legend style="font-weight:600;color:var(--text-primary);padding:0 8px;">数量与日期</legend>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                        <div class="form-group"><label class="form-label required">接收数量</label><input type="number" name="接收数量" id="cf-接收数量" class="form-input" required min="0"></div>
                        <div class="form-group"><label class="form-label">当前持有数量</label><input type="number" name="当前持有数量" id="cf-持有数量" class="form-input" value="0" min="0" readonly style="background:var(--bg-lighter);cursor:default;" onclick="UI.Toast.info('当前持有量由系统根据寄出记录自动计算，不允许修改')"></div>
                        <div class="form-group"><label class="form-label required">接收日期</label><input type="date" name="接收日期" id="cf-接收日期" class="form-input" required ${isEdit?'readonly style="background:var(--bg-lighter);cursor:default;" onclick="UI.Toast.info(\'已新增的记录不允许修改接收日期\')"':''}></div>
                        <div class="form-group"><label class="form-label required">有效期</label><input type="date" name="有效期" id="cf-有效期" class="form-input" required ${isEdit?'readonly style="background:var(--bg-lighter);cursor:default;" onclick="UI.Toast.info(\'已新增的记录不允许修改有效期\')"':''}></div>
                        <div class="form-group"><label class="form-label required">提醒天数</label><input type="number" name="提醒天数" id="cf-提醒天数" class="form-input" value="30" min="1" placeholder="到期前N天转为待评定" required></div>
                    </div>
                </fieldset>
            </div>
            <fieldset style="border:1px solid var(--border-light);border-radius:8px;padding:10px;margin:0;">
                <legend style="font-weight:600;color:var(--text-primary);padding:0 8px;">Lab色彩空间基准值 & 色差参数</legend>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                    <div class="form-group" style="grid-column:1/-1;"><label class="form-label">使用的光源角度</label><input type="text" name="使用的光源角度" class="form-input" placeholder="如 D65/10°"></div>
                    <div class="form-group"><label class="form-label">L值(基准)</label><input type="number" name="L值" class="form-input" step="0.01"></div>
                    <div class="form-group"><label class="form-label">a值(基准)</label><input type="number" name="a值" class="form-input" step="0.01"></div>
                    <div class="form-group"><label class="form-label">b值(基准)</label><input type="number" name="b值" class="form-input" step="0.01"></div>
                    <div class="form-group"><label class="form-label">c值</label><input type="number" name="c值" class="form-input" step="0.01"></div>
                    <div class="form-group"><label class="form-label">h值</label><input type="number" name="h值" class="form-input" step="0.01"></div>
                        <div class="form-group"><label class="form-label">ΔL值</label><input type="number" name="ΔL值" id="cf-ΔL" class="form-input" step="0.0001"></div>
                    <div class="form-group"><label class="form-label">Δa值</label><input type="number" name="Δa值" id="cf-Δa" class="form-input" step="0.0001"></div>
                    <div class="form-group"><label class="form-label">Δb值</label><input type="number" name="Δb值" id="cf-Δb" class="form-input" step="0.0001"></div>
                    <div class="form-group"><label class="form-label">Δc值</label><input type="number" name="Δc值" class="form-input" step="0.0001"></div>
                    <div class="form-group"><label class="form-label">Δh值</label><input type="number" name="Δh值" class="form-input" step="0.0001"></div>
                    <div class="form-group"><label class="form-label">ΔE值</label><input type="number" name="ΔE值" id="cf-ΔE" class="form-input" step="0.0001" readonly style="background:var(--bg-lighter);cursor:default;" onclick="UI.Toast.info('ΔE值为系统根据色差参数自动计算，不允许修改')" title="自动计算：√(ΔL²+Δa²+Δb²)"></div>
                    <div></div>
                    <div class="form-group" style="grid-column:1/-1;"><label class="form-label">备注</label><textarea name="备注" class="form-textarea" rows="2"></textarea></div>
                </div>
            </fieldset>
        </div></form>`;

    UI.Modal.show({title,content:bodyHtml,width:'1200px',
        footerHtml:`<button class="btn btn-outline" onclick="UI.Modal.close()">取消</button>
                    <button class="btn btn-primary" onclick="saveColorSample(${id||'null'})">${isEdit?'保存':'提交'}</button>`});

    requestAnimationFrame(()=>{
        const f=document.getElementById('color-form');if(!f)return;
        const qtyEl=f.querySelector('#cf-接收数量');const holdEl=f.querySelector('#cf-持有数量');
        if(qtyEl&&holdEl){
            if(!isEdit) qtyEl.addEventListener('input',()=>{holdEl.value=qtyEl.value||'0';});
            else{qtyEl.addEventListener('input',()=>{const initQty=qtyEl._initQty||0,initHold=holdEl._initHold||0;let newQty=parseFloat(qtyEl.value)||0;if(newQty<initQty){newQty=initQty;qtyEl.value=initQty;UI.Toast.warning('编辑模式下不允许减少接收数量');} holdEl.value=Math.max(0,initHold+(newQty-initQty));});
        }}
        if(!isEdit){const recvDateEl=f.querySelector('#cf-接收日期');const expDateEl=f.querySelector('#cf-有效期');
            if(recvDateEl&&expDateEl){recvDateEl.addEventListener('change',()=>{if(recvDateEl.value){const d=new Date(recvDateEl.value);d.setFullYear(d.getFullYear()+1);expDateEl.value=d.toISOString().slice(0,10);}});}}
        const dL=f.querySelector('#cf-ΔL'),dA=f.querySelector('#cf-Δa'),dB=f.querySelector('#cf-Δb'),dE=f.querySelector('#cf-ΔE');
        const calcDE=()=>{const l=parseFloat(dL?.value),a=parseFloat(dA?.value),b=parseFloat(dB?.value);
            if(!isNaN(l)&&!isNaN(a)&&!isNaN(b)){dE.value=Math.sqrt(l*l+a*a+b*b).toFixed(4);}else{dE.value='';}};
        [dL,dA,dB].forEach(el=>{if(el)el.addEventListener('input',calcDE);});
    });

    if(isEdit){API.get(`/color-samples/${id}`).then(r=>{if(r&&r.success){const d=r.data;const f=document.getElementById('color-form');
        for(const[k,v]of Object.entries(d)){const el=f.querySelector(`[name="${k}"]`);if(el&&v!=null)el.value=v;}
        const q=f.querySelector('#cf-接收数量'),h=f.querySelector('#cf-持有数量');
        if(q&&h){q._initQty=parseFloat(q.value)||0;h._initHold=parseFloat(h.value)||0;}}});
    }else{API.get('/color-samples',{pageSize:1,page:1}).then(r=>{if(r&&r.success&&r.data){const el=document.getElementById('cf-序号');if(el&&!el.value)el.value='GKSB-'+new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);}});
    }
};

window.newColorSample=()=>openColorForm();
window.editColorSample=(id)=>openColorForm(id);

async function saveColorSample(id){
    const f=document.getElementById('color-form');if(!f)return;
    const data={};new FormData(f).forEach((v,k)=>{data[k]=v;});
    if(!data['客户']||!data['适用车型']||!data['颜色名称']||!data['接收数量']||!data['有效期']||!data['提醒天数']){
        UI.Toast.warning('请填写必填项');return;
    }
    const r=id?await API.put(`/color-samples/${id}`,data):await API.post('/color-samples',data);
    if(r&&r.success){UI.Modal.close();UI.Toast.success(r.message);loadColorSamples(_colorPage);}
    else if(r)UI.Toast.error(r.message);
}

window.deleteColorSample=async(id)=>{
    const ok=await UI.Confirm.show('确定删除此色板记录？','确认删除','danger');
    if(ok){const r=await API.delete(`/color-samples/${id}`);if(r&&r.success){UI.Toast.success('删除成功');loadColorSamples(_colorPage);}else if(r)UI.Toast.error(r.message);}
};
window.goToColorEval=async function(id){ if(window.openColorEvalDialog){ openColorEvalDialog(id); } else { if(window.loadSubPage)loadSubPage('color-evaluation.html');else location.href='color-evaluation.html'; } };

// 从色板台账直接寄出 (保持不变)
window.openColorSendForm=(id,colorName,holdQty)=>{
    const bodyHtml=`<form id="color-send-form">
        <div style="margin-bottom:12px;padding:10px;background:var(--primary-light);border-radius:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span>关联色板：<strong>${colorName}</strong>（ID: ${id}）</span>
                <span>当前持有数量：<span class="tag tag-primary" style="font-size:13px;">${holdQty}</span></span>
            </div>
        </div>
        <div class="form-group"><label class="form-label required">对方单位</label><input type="text" name="对方单位" class="form-input" required></div>
        <div class="form-group"><label class="form-label required">寄出数量</label>
            <input type="number" name="寄出数量" id="cs-send-qty" class="form-input" min="1" max="${holdQty}" required>
            <small style="color:var(--text-muted)">最大可寄: ${holdQty}</small>
        </div>
        <div class="form-group"><label class="form-label required">寄出日期</label><input type="date" name="寄出日期" class="form-input" value="${new Date().toISOString().split('T')[0]}" required></div>
        <div class="form-group"><label class="form-label">经手人</label><input type="text" name="经手人" class="form-input"></div>
        <div class="form-group"><label class="form-label">备注</label><textarea name="备注" class="form-textarea" rows="2"></textarea></div>
    </form>
    <div class="alert alert-info">ℹ️ 寄出后将自动从当前持有数量中扣除对应数量</div>`;

    UI.Modal.show({title:`寄出色板 - ${colorName}`,width:'wide',content:bodyHtml,
        footerHtml:`<button class="btn btn-outline" onclick="UI.Modal.close()">取消</button>
                    <button class="btn btn-primary" onclick="saveColorSend(${id},${holdQty})">确认寄出</button>`});

    const qtyEl=document.getElementById('cs-send-qty');
    if(qtyEl)qtyEl.addEventListener('input',()=>{const v=parseInt(qtyEl.value)||0;if(v>holdQty){qtyEl.style.borderColor='var(--danger)';qtyEl.title='超出持有量!';}else{qtyEl.style.borderColor='';qtyEl.title='';}});
};

window.saveColorSend=async(sampleId,maxQty)=>{
    const f=document.getElementById('color-send-form');if(!f)return;
    const data={};new FormData(f).forEach((v,k)=>{data[k]=v;});
    data.sample_id=sampleId;
    if(!data['对方单位']||!data['寄出数量']){UI.Toast.warning('请填写必填项');return;}
    data['寄出数量']=parseInt(data['寄出数量']);
    if(data['寄出数量']>maxQty){UI.Toast.error(`寄出数量超出持有数量(${maxQty})`);return;}
    const r=await API.post('/send-records',data);
    if(r&&r.success){UI.Modal.close();UI.Toast.success('寄出成功，库存已扣减');loadColorSamples(_colorPage);}
    else if(r)UI.Toast.error(r.message);
};

// ===== 初始化 =====
(function initColorSample(){
    const fn=function(){
        TableConfig.buildFilterToolbar('color_sample', 'color-filter-toolbar');

        const tcBtnsEl=document.getElementById('color-tc-btns');
        if(tcBtnsEl) tcBtnsEl.innerHTML = TableConfig.buildToolbarButtons('color_sample');

        TableConfig.onSearch('color_sample', function(filters){ loadColorSamples(1, filters); });
        TableConfig.onColumnChange('color_sample', function(){ loadColorSamples(_colorPage); });

        document.getElementById('color-export-btn')?.addEventListener('click',()=>{window.open('/api/color-samples/export?token='+localStorage.getItem('token'));});
        document.getElementById('color-import-btn')?.addEventListener('change',async(e)=>{const file=e.target.files[0];if(!file)return;
            const fd=new FormData();fd.append('file',file);const r=await API.upload('/color-samples/import',fd);
            if(r&&r.success){UI.Toast.success(r.message);loadColorSamples(1);}else if(r)UI.Toast.error(r.message||'导入失败');e.target.value='';
        });
        if(document.getElementById('color-tbody'))loadColorSamples(1);
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn();
})();
