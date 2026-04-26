/* ========================================
   色板评定核心页面 color-evaluation.js
   ΔE实时计算 + 颜色标识 + 报废流程
   ======================================== */
var _cevalPage=1,_cevalPageSize=20,_currentCEvalTab='all',_allColorItems=[];
var _deltaThresholds={excellent:1.0,good:2.0,warning:999.0};

// 加载阈值设置
async function loadDeltaThresholds(){
    const r=await API.get('/admin/settings');
    if(r&&r.success&&r.data){
        try{
            if(r.data.delta_e_excellent) _deltaThresholds.excellent=parseFloat(r.data.delta_e_excellent.value)||1.0;
            if(r.data.delta_e_good) _deltaThresholds.good=parseFloat(r.data.delta_e_good.value)||2.0;
            if(r.data.delta_e_warning) _deltaThresholds.warning=parseFloat(r.data.delta_e_warning.value)||999.0;
        }catch{}
    }
}

async function loadColorEvalList(page=1,tab=_currentCEvalTab){
    _cevalPage=page;_currentCEvalTab=tab;
    await loadDeltaThresholds();

    // 评定页面加载全部色板（不分页），确保所有待评定/已过期/已报废记录都能显示
    const result=await API.get('/color-samples',{_t:Date.now()});
    if(!result||!result.success)return;

    _allColorItems=result.data.items; // 缓存全量

    let items=_allColorItems;

    // 按tab前端筛选
    if(tab==='all'){
        items=items.filter(i=>i['状态']==='pending_eval'||i['状态']==='expired'||i['状态']==='scrapped');
    } else if(tab==='pending_eval'){
        items=items.filter(i=>i['状态']==='pending_eval');
    } else if(tab==='expired'){
        items=items.filter(i=>i['状态']==='expired');
    } else if(tab==='scrapped'){
        items=items.filter(i=>i['状态']==='scrapped');
    }

    // 更新tab徽章数字
    updateCEvalBadges(_allColorItems);

    renderCEvalTable(items,items.length);
}

// 更新各tab的徽章数字
function updateCEvalBadges(allItems){
    document.getElementById('ceval-badge-pending').textContent=allItems.filter(i=>i['状态']==='pending_eval').length;
    document.getElementById('ceval-badge-expired').textContent=allItems.filter(i=>i['状态']==='expired').length;
    document.getElementById('ceval-badge-scrapped').textContent=allItems.filter(i=>i['状态']==='scrapped').length;
}

function renderCEvalTable(items,total){
    const tb=document.getElementById('ceval-tbody');
    if(!tb)return;
    if(!items.length){
        tb.innerHTML='<tr><td colspan="9" class="empty-state"><p>暂无数据</p></td></tr>';
        return;
    }

    tb.innerHTML=items.map(item=>{
        const daysLeft=Utils.getDaysLeft(item['有效期']);
        const de=item['ΔE值'];
        let deDisplay='-';
        if(de!=null){
            const deInfo=Utils.getDeltaEStatus(parseFloat(de),_deltaThresholds);
            deDisplay=`<span style="display:inline-flex;align-items:center;gap:4px;">
                <span style="width:10px;height:10px;border-radius:50%;background:${deInfo.level==='excellent'?'#00A870':deInfo.level==='good'?'#E74600':'#E34D59'}"></span>
                <span style="${deInfo.level==='warning'?'font-weight:bold;color:var(--danger)':''}">${parseFloat(de).toFixed(2)}</span></span>`;
        }
        const st=Utils.getStatusTag(item['状态']);
        return`<tr data-id="${item.id}">
            <td>${Utils.escapeHtml(item['序号']||'-')}</td><td>${Utils.escapeHtml(item['客户']||'-')}</td><td><strong>${Utils.escapeHtml(item['颜色名称']||'-')}</strong></td>
            <td>${Utils.escapeHtml(item['样板供应商']||'-')}</td>
            <td>${Utils.formatDate(item['有效期'])}</td>
            <td class="${daysLeft!==null&&(daysLeft<=7?'days-critical':daysLeft<=30?'days-warning':'')}">${daysLeft===null?'-':daysLeft<0?`过期${Math.abs(daysLeft)}天`:`${daysLeft}天`}</td>
            <td>${deDisplay}</td>
            <td><span class="tag ${st.cls}">${st.text}</span></td>
            <td>${(item['状态']==='pending_eval'||item['状态']==='expired')?`<button class="btn btn-sm btn-outline animate-pulse" style="border-color:${item['状态']==='expired'?'#E34D59':'#E74600'};color:${item['状态']==='expired'?'#E34D59':'#E74600'};" onclick="openColorEvalDialog(${item.id})">发起评定</button>`:'-'}</td>
        </tr>`;
    }).join('');
    document.getElementById('ceval-pagination').innerHTML=Utils.generatePagination(total,_cevalPage,_cevalPageSize);
}
window._currentPageHandler=(p)=>loadColorEvalList(p,_currentCEvalTab);

// 打开评定Dialog - 核心功能
window.openColorEvalDialog=async function(id){
    const r=await API.get(`/color-samples/${id}`);
    if(!r||!r.success)return;
    const item=r.data;

    await loadDeltaThresholds();
    
    const headerHtml=`<div class="eval-header-info">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
            <div><div class="info-row">
                <div class="info-item"><div class="info-label">客户</div><div class="info-value">${item['客户']||'-'}</div></div>
                <div class="info-item"><div class="info-label">适用车型</div><div class="info-value">${item['适用车型']||'-'}</div></div>
                <div class="info-item"><div class="info-label">颜色名称</div><div class="info-value" style="font-size:16px;font-weight:700;color:var(--primary);">${item['颜色名称']||'-'}</div></div>
                <div class="info-item"><div class="info-label">样板供应商</div><div class="info-value">${item['样板供应商']||'-'}</div></div>
            </div></div>
            <div class="eval-baseline-lab">
                <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;text-align:center;">台账基准Lab值</div>
                <div class="baseline-lab-values">
                    <div><div class="baseline-lab-val">L = ${(item['L值']||0).toFixed(2)}</div><div class="baseline-lab-label">基准L</div></div>
                    <div><div class="baseline-lab-val">a = ${(item['a值']||0).toFixed(2)}</div><div class="baseline-lab-label">基准a</div></div>
                    <div><div class="baseline-lab-val">b = ${(item['b值']||0).toFixed(2)}</div><div class="baseline-lab-label">基准b</div></div>
                </div>
            </div>
        </div>
    </div>`;

    const bodyHtml=`
        ${headerHtml}
        <div class="radio-group" id="ceval-radio-group">
            <div class="radio-card selected" data-val="pass" onclick="selectCEvalResult(this,'pass')">
                <div class="radio-card-left-bar"></div>
                <div class="radio-card-title">✓ 合格 - 不需重新签样</div>
                <div class="radio-card-desc">ΔE在允许范围内，续期后继续使用</div>
            </div>
            <div class="radio-card" data-val="fail" onclick="selectCEvalResult(this,'fail')">
                <div class="radio-card-left-bar"></div>
                <div class="radio-card-title">✗ 不合格 - 需重新签样(将报废)</div>
                <div class="radio-card-desc">ΔE超标或质量异常，执行报废流程</div>
            </div>
        </div>

        <!-- 合格路径 -->
        <div id="ceval-pass-area" class="eval-condition-area show eval-pass-area">
            <div style="margin-bottom:4px;font-size:13px;font-weight:500;color:var(--text-primary);">当前实测Lab值</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;">输入当前测量得到的L/a/b值，系统将自动计算与基准值的色差ΔE</div>
            <div class="lab-input-grid">
                <div class="lab-input-column">
                    <div class="lab-baseline-value"><div class="lab-baseline-label">基准 L 值</div><div class="lab-baseline-number">${(item['L值']||0).toFixed(2)}</div></div>
                    <input type="number" id="cl-L" class="form-input current-lab-input" placeholder="输入当前L值" step="0.01" oninput="updateDeltaEPreview(${item['L值']||0},${item['a值']||0},${item['b值']||0})">
                    <div style="font-size:11px;color:var(--text-muted);text-align:center;" id="diff-L"></div>
                </div>
                <div class="lab-input-column">
                    <div class="lab-baseline-value"><div class="lab-baseline-label">基准 a 值</div><div class="lab-baseline-number">${(item['a值']||0).toFixed(2)}</div></div>
                    <input type="number" id="cl-a" class="form-input current-lab-input" placeholder="输入当前a值" step="0.01" oninput="updateDeltaEPreview(${item['L值']||0},${item['a值']||0},${item['b值']||0})">
                    <div style="font-size:11px;color:var(--text-muted);text-align:center;" id="diff-a"></div>
                </div>
                <div class="lab-input-column">
                    <div class="lab-baseline-value"><div class="lab-baseline-label">基准 b 值</div><div class="lab-baseline-number">${(item['b值']||0).toFixed(2)}</div></div>
                    <input type="number" id="cl-b" class="form-input current-lab-input" placeholder="输入当前b值" step="0.01" oninput="updateDeltaEPreview(${item['L值']||0},${item['a值']||0},${item['b值']||0})">
                    <div style="font-size:11px;color:var(--text-muted);text-align:center;" id="diff-b"></div>
                </div>
            </div>
            
            <!-- ΔE实时结果展示区 -->
            <div class="delta-e-display" id="delta-e-display-area">
                <div style="font-size:14px;font-weight:500;color:var(--text-secondary);margin-bottom:8px;">综合色差 ΔE 值</div>
                <div class="delta-e-value" id="de-result-val" style="color:var(--text-muted)">--</div>
                <div class="delta-e-level tag-default" id="de-result-level" style="display:inline-block;padding:6px 18px;border-radius:20px;font-size:14px;font-weight:600;margin-top:6px;">请输入LAB值</div>
                <div class="delta-e-thresholds" id="de-thresholds-text">阈值: 优秀&lt;${_deltaThresholds.excellent} / 合格${_deltaThresholds.excellent}-${_deltaThresholds.good} / 关注&gt;=${_deltaThresholds.good}</div>
            </div>
            
            <div style="margin-top:16px;display:flex;gap:12px;align-items:flex-start;">
                <div class="form-group" style="flex:1;"><label class="form-label required">新有效期截止日</label><input type="date" name="cNewExpiry" class="form-input" min="${new Date().toISOString().split('T')[0]}" required></div>
                <div class="form-group" style="flex:2;"><label class="form-label">评定说明</label><textarea name="cPassNote" class="form-textarea" rows="2" placeholder="可选填写"></textarea></div>
            </div>
        </div>

        <!-- 不合格路径 -->
        <div id="ceval-fail-area" class="eval-condition-area eval-fail-area">
            <div class="form-group"><label class="form-label required">报废原因</label><textarea name="cScrapReason" class="form-textarea" rows="3" placeholder="详细说明不合格原因" required></textarea></div>
            <div class="form-group"><label class="form-label required">报废类型</label>
                <select name="cScrapType" class="form-select" required>
                    <option value="">请选择</option>
                    <option value="自然老化">自然老化</option>
                    <option value="变色超标(ΔE超标)">变色超标(ΔE超标)</option>
                    <option value="物理损坏">物理损坏</option>
                    <option value="规格变更">规格变更</option>
                    <option value="其他">其他</option>
                </select>
            </div>
            <div class="alert alert-error" style="margin-top:12px;">⚠️ 警告：报废后此色板将被锁定，无法进行任何后续操作！</div>
        </div>`;

    UI.Modal.show({title:'色板内部评定 - ΔE计算',content:bodyHtml,width:'wide',
        footerHtml:`<button class="btn btn-outline" onclick="UI.Modal.close()">取消</button>
                    <button class="btn btn-primary btn-lg" id="ceval-submit-btn" onclick="submitColorEvaluation(${id})">提交评定</button>`});

    window._selectedCEvalResult='pass';
};

// 选择评定结果
window.selectCEvalResult=(el,val)=>{
    window._selectedCEvalResult=val;
    document.querySelectorAll('#ceval-radio-group .radio-card').forEach(c=>{c.classList.remove('selected','selected-danger');c.querySelector('.radio-card-left-bar').style.background='transparent';});
    el.classList.add(val==='pass'?'selected':'selected-danger');
    el.querySelector('.radio-card-left-bar').style.background=val==='pass'?'var(--success)':'var(--danger)';
    
    document.getElementById('ceval-pass-area').classList.toggle('show',val==='pass');
    document.getElementById('ceval-fail-area').classList.toggle('show',val==='fail');

    const btn=document.getElementById('ceval-submit-btn');
    btn.className=`btn btn-lg ${val==='pass'?'btn-primary':'btn-danger'}`;
    btn.textContent=val==='pass'?'提交（合格续期）':'提交（不合格报废）';
};

// 实时ΔE计算预览
window.updateDeltaEPreview=function(baseL,baseA,baseB){
    const cL=parseFloat(document.getElementById('cl-L')?.value);
    const cA=parseFloat(document.getElementById('cl-a')?.value);
    const cB=parseFloat(document.getElementById('cl-b')?.value);

    // 显示差值
    if(document.getElementById('diff-L'))document.getElementById('diff-L').textContent=!isNaN(cL)?`ΔL = ${((cL||0)-baseL).toFixed(3)}`:'';
    if(document.getElementById('diff-a'))document.getElementById('diff-a').textContent=!isNaN(cA)?`Δa = ${((cA||0)-baseA).toFixed(3)}`:'';
    if(document.getElementById('diff-b'))document.getElementById('diff-b').textContent=!isNaN(cB)?`Δb = ${((cB||0)-baseB).toFixed(3)}`:'';

    const valEl=document.getElementById('de-result-val');
    const levelEl=document.getElementById('de-result-level');

    if(isNaN(cL)||isNaN(cA)||isNaN(cB)){
        valEl.className='delta-e-value';valEl.style.color='var(--text-muted)';valEl.textContent='--';
        levelEl.className='delta-e-level tag-default';levelEl.textContent='请输入完整LAB值';return;
    }

    const de=Utils.calculateDeltaE(baseL,baseA,baseB,cL,cA,cB);
    const status=Utils.getDeltaEStatus(de,_deltaThresholds);

    valEl.className=`delta-e-value ${status.class}`;
    valEl.textContent=de.toFixed(4);
    levelEl.className=`delta-e-level tag ${status.level==='excellent'?'tag-success':status.level==='good'?'tag-warning':'tag-danger'}`;
    levelEl.textContent=status.label;

    // 更新阈值文本
    document.getElementById('de-thresholds-text').textContent=
        `阈值: 优秀<${_deltaThresholds.excellent} / 合格${_deltaThresholds.excellent}-${_deltaThresholds.good} / 关注≥${_deltaThresholds.good}`;
};

// 提交色板评定
window.submitColorEvaluation=async(id)=>{
    const resultType=window._selectedCEvalResult;
    if(resultType==='pass'){
        const cL=document.getElementById('cl-L')?.value;
        const cA=document.getElementById('cl-a')?.value;
        const cB=document.getElementById('cl-b')?.value;
        const newExp=document.querySelector('[name=cNewExpiry]')?.value;

        if(cL===''||cA===''||cB===''){UI.Toast?.warning('请输入完整的当前LAB值');return;}
        if(!newExp){UI.Toast?.warning('请选择新有效期');return;}

        const r=await API.post('/evaluations',{
            item_type:'color',item_id:id,result:'pass',
            当前L值:cL,当前a值:cA,当前b值:cB,
            新有效期截止日:newExp,
            评定说明:document.querySelector('[name=cPassNote]')?.value||''
        });

        if(r&&r.success){UI.Modal.close();UI.Toast.success(`评定成功！ΔE=${(r.data.deltaE||0).toFixed(4)} - 已续期`);loadColorEvalList(1,_currentCEvalTab);if(window.loadColorSamples)window.loadColorSamples(window._colorPage||1);}
        else if(r)UI.Toast.error(r.message);
    } else {
        const reason=document.querySelector('[name=cScrapReason]')?.value;
        const typeVal=document.querySelector('[name=cScrapType]')?.value;
        if(!reason||!typeVal){UI.Toast?.warning('请完整填写报废信息');return;}
        const ok=await UI.Confirm.show('确定执行报废操作？不可逆。','二次确认 - 色板报废','danger');
        if(!ok)return;
        const sr=await API.post('/scrap',{item_type:'color',item_id:id,报废原因:reason,报废类型:typeVal});
        if(sr&&sr.success){UI.Modal.close();UI.Toast.success('已报废');loadColorEvalList(1,_currentCEvalTab);if(window.loadColorSamples)window.loadColorSamples(window._colorPage||1);}
        else if(sr)UI.Toast.error(sr.message);}
};

// Tab切换
function switchCEvalTab(tabName){
    _currentCEvalTab=tabName;
    document.querySelectorAll('#ceval-tabs .tab-item').forEach(t=>{
        t.classList.toggle('active', t.dataset.tab===tabName);
    });
    loadColorEvalList(1,tabName);
}

(function initCEval(){
    const fn=function(){
        // 手动绑定tab点击（学习封样件评定的写法）
        const tabs=document.querySelectorAll('#ceval-tabs .tab-item');
        tabs.forEach(t=>{
            t.onclick=function(e){e.preventDefault();switchCEvalTab(this.dataset.tab||'all');};
        });
        if(document.getElementById('ceval-tbody'))loadColorEvalList(1,'all');
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn();
})();
