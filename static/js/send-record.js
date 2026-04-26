/* ========================================
   寄出台账管理 send-record.js (库存联动)
   支持动态筛选 + 列配置
   ======================================== */
var _sendPage=1,_sendPageSize=20;
var _sendColCount=9;

async function loadSendRecords(page=1, forcedFilters=null){
    _sendPage=page;
    const filters = forcedFilters || TableConfig.getFilters('send_record');
    const params = { page, pageSize: _sendPageSize };

    if(filters && filters.length){
        filters.forEach((f,i)=>{
            params['f_field_'+i]=f.field; params['f_op_'+i]=f.op; params['f_val_'+i]=f.value;
        });
        // 映射到旧参数
        filters.forEach(f => {
            if(f.field === '客户') params.customer = f.value;
            else if(f.field === '对方单位') params.recipient = f.value;
        });
    }

    const result=await API.get('/send-records',params);
    if(!result||!result.success)return;
    renderSendTable(result.data);
}

function renderSendTable(data){
    const tb=document.getElementById('send-tbody');
    const thead=document.getElementById('send-thead');
    if(!tb)return;

    const headInfo = TableConfig.generateThead('send_record');
    _sendColCount = headInfo.colCount;
    if(thead) thead.innerHTML=headInfo.html;

    if(!data.items.length){
        tb.innerHTML=`<tr><td colspan="${_sendColCount}" class="empty-state"><p>暂无寄出记录</p></td></tr>`;
        document.getElementById('send-pagination').innerHTML='';return;
    }
    
    const columns=headInfo.columns;
    tb.innerHTML=data.items.map(item=>{
        let cells='';
        columns.forEach(col => { cells += `<td>${TableConfig.renderCell('send_record',col,item)}</td>`; });
        
        return `<tr>${cells}
        <td><a href="#" class="btn-link danger" onclick="deleteSendRecord(${item.id});return false;">删除(恢复)</a></td>
    </tr>`}).join('');
    document.getElementById('send-pagination').innerHTML=Utils.generatePagination(data.total,data.page,data.page_size);
}
window._currentPageHandler=loadSendRecords;

window.openSendForm=()=>{
    UI.Modal.show({title:'新增寄出记录',width:'wide',
        content:`<form id="send-form">
            <div class="form-group">
                <label class="form-label required">关联色板</label>
                <select id="send-sample-select" name="sample_id" class="form-select" required onchange="onSampleSelected(this.value)">
                    <option value="">搜索色板序号/名称/客户...</option>
                </select>
            </div>
            <div id="send-sample-info" style="display:none;margin-bottom:16px;padding:10px;background:var(--primary-light);border-radius:8px;">
                颜色名称：<strong id="send-sample-colorname"></strong> |
                当前持有数量：<span id="send-sample-holdqty" class="tag tag-primary">0</span>
            </div>
            <div class="form-group"><label class="form-label required">对方单位</label><input type="text" name="对方单位" class="form-input" required></div>
            <div class="form-group"><label class="form-label required">寄出数量</label>
                <input type="number" name="寄出数量" id="send-qty-input" class="form-input" min="1" required>
                <small id="send-qty-hint" class="text-muted"></small>
            </div>
            <div class="form-group"><label class="form-label required">寄出日期</label><input type="date" name="寄出日期" class="form-input" value="${new Date().toISOString().split('T')[0]}" required></div>
            <div class="form-group"><label class="form-label">经手人</label><input type="text" name="经手人" class="form-input"></div>
            <div class="form-group"><label class="form-label">备注</label><textarea name="备注" class="form-textarea" rows="2"></textarea></div>
        </form>
        <div class="alert alert-info">ℹ️ 寄出后将自动从当前持有数量中扣除对应数量</div>`,
        footerHtml:`<button class="btn btn-outline" onclick="UI.Modal.close()">取消</button>
                    <button class="btn btn-primary" onclick="saveSendRecord()">确认寄出</button>`});
    
    loadColorOptions();
};

var _allColorSamples=[];
async function loadColorOptions(){
    const r=await API.get('/color-samples',{page:1,pageSize:999});
    if(r&&r.success){_allColorSamples=r.data.items;
        const sel=document.getElementById('send-sample-select');
        if(sel)_allColorSamples.forEach(s=>{
            const opt=document.createElement('option');opt.value=s.id;
            opt.textContent=`#${s['序号']||s.id} ${s['颜色名称']||''} (${s['客户']||''}) 持有:${s['当前持有数量']||0}`;
            sel.appendChild(opt);
        });
    }
}

window.onSampleSelected=function(sampleId){
    if(!sampleId)return;
    const sample=_allColorSamples.find(s=>s.id==sampleId);
    if(sample){
        const infoEl=document.getElementById('send-sample-info');
        infoEl.style.display='';
        document.getElementById('send-sample-colorname').textContent=sample['颜色名称']||'-';
        document.getElementById('send-sample-holdqty').textContent=sample['当前持有数量']||0;
        
        const qtyInput=document.getElementById('send-qty-input');
        qtyInput.max=sample['当前持有数量']||0;
        document.getElementById('send-qty-hint').textContent=`最大可寄: ${sample['当前持有数量']||0}`;
        
        qtyInput.addEventListener('input',()=>{
            const v=parseInt(qtyInput.value)||0;const max=parseInt(qtyInput.max);
            if(v>max){qtyInput.style.borderColor='var(--danger)';qtyInput.title='超出持有量!';}
            else{qtyInput.style.borderColor='';qtyInput.title='';}
        });
    }
};

async function saveSendRecord(){
    const f=document.getElementById('send-form');if(!f)return;
    const data={};new FormData(f).forEach((v,k)=>{data[k]=v;});
    if(!data.sample_id||!data['对方单位']||!data['寄出数量']){UI.Toast.warning('请填写必填项');return;}
    
    data['寄出数量']=parseInt(data['寄出数量']);
    const sample=_allColorSamples.find(s=>s.id==data.sample_id);
    if(sample&&(data['寄出数量']>(sample['当前持有数量']||0))){UI.Toast.error(`寄出数量(${data['寄出数量']})超出持有数量(${sample['当前持有数量']||0})`);return;}

    const r=await API.post('/send-records',data);
    if(r&&r.success){UI.Modal.close();UI.Toast.success('寄出成功，库存已扣减');loadSendRecords(_sendPage);}
    else if(r)UI.Toast.error(r.message);
}

window.deleteSendRecord=async(id)=>{
    const ok=await UI.Confirm.show('确定删除此寄出记录？将恢复对应数量的持有库存。','确认删除');
    if(ok){
        const r=await API.delete(`/send-records/${id}`);
        if(r&&r.success){UI.Toast.success('已删除，库存已恢复');loadSendRecords(_sendPage);}
        else if(r)UI.Toast.error(r.message);}
};

// ===== 初始化 =====
(function initSendRecord(){
    const fn=function(){
        TableConfig.buildFilterToolbar('send_record', 'send-filter-toolbar');

        const tcBtnsEl=document.getElementById('send-tc-btns');
        if(tcBtnsEl) tcBtnsEl.innerHTML = TableConfig.buildToolbarButtons('send_record');

        TableConfig.onSearch('send_record', function(filters){ loadSendRecords(1, filters); });
        TableConfig.onColumnChange('send_record', function(){ loadSendRecords(_sendPage); });

        document.getElementById('send-export-btn')?.addEventListener('click',()=>{window.open('/api/send-records/export?token='+localStorage.getItem('token'));});
        if(document.getElementById('send-tbody'))loadSendRecords(1);
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn();
})();
