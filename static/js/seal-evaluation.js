/* ========================================
   封样件评定 seal-evaluation.js
   ======================================== */
var _evalPage=1,_evalPageSize=20,_currentEvalTab='all',_allItems=[];

async function loadEvaluations(page=1,tab=_currentEvalTab){
    _evalPage=page;_currentEvalTab=tab;
    // 评定页面加载全部封样件（不分页），确保所有待评定/已过期/已报废记录都能显示
    const result=await API.get('/seal-samples',{_t:Date.now()});
    if(!result||!result.success)return;

    _allItems=result.data.items; // 缓存全量数据
    
    let items=_allItems;
    
    // 按tab筛选
    if(tab==='all'){
        // 全部 = 待评定 + 已过期 + 已报废（正常的不需要评定）
        items=items.filter(i=>i['状态']==='pending_eval'||i['状态']==='expired'||i['状态']==='scrapped');
    } else if(tab==='pending_eval'){
        items=items.filter(i=>i['状态']==='pending_eval');
    } else if(tab==='expired'){
        items=items.filter(i=>i['状态']==='expired');
    } else if(tab==='scrapped'){
        items=items.filter(i=>i['状态']==='scrapped');
    }
    
    // 更新tab徽章数字
    updateEvalBadges(_allItems);
    
    renderEvalTable(items,items.length);
}

function switchEvalTab(tabName){
    _currentEvalTab=tabName;
    
    // 更新tab激活态
    document.querySelectorAll('#eval-tabs .tab-item').forEach(t=>{
        t.classList.toggle('active', t.dataset.tab===tabName);
    });
    
    loadEvaluations(1,tabName);
}

// 更新各tab的徽章数字
function updateEvalBadges(allItems){
    const pendingEl=document.getElementById('badge-pending');
    const expiredEl=document.getElementById('badge-expired');
    const scrappedEl=document.getElementById('badge-scrapped');
    
    if(pendingEl)pendingEl.textContent=allItems.filter(i=>i['状态']==='pending_eval').length;
    if(expiredEl)expiredEl.textContent=allItems.filter(i=>i['状态']==='expired').length;
    if(scrappedEl)scrappedEl.textContent=allItems.filter(i=>i['状态']==='scrapped').length;
}




function renderEvalTable(items,total){
    const tb=document.getElementById('eval-tbody');
    if(!tb)return;
    if(!items.length){
        tb.innerHTML='<tr><td colspan="8" class="empty-state"><p>暂无数据</p></td></tr>';
        document.getElementById('eval-pagination').innerHTML='';return;
    }

    tb.innerHTML=items.map(item=>{
        const daysLeft=Utils.getDaysLeft(item['有效期']);
        const daysCls=daysLeft!==null?(daysLeft<=7||daysLeft<0?'days-critical':daysLeft<=30?'days-warning':''):''; // 过期也标红
        const daysText=daysLeft===null?'-':(daysLeft<0?`已过期${Math.abs(daysLeft)}天`:`${daysLeft}天`);
        
        const st=Utils.getStatusTag(item['状态']);
        // 评定状态标签
        let evalTag='';
        let canEvaluate=false;
        if(st.text==='待评定'){evalTag=`<span class="tag tag-warning animate-pulse">待评定</span>`;canEvaluate=true;}
        else if(st.text==='已过期'){evalTag=`<span class="tag tag-danger animate-pulse">已过期</span>`;canEvaluate=true;}
        else if(st.text==='已报废'){evalTag='<span class="tag tag-default">已报废</span>';}
        else{evalTag='<span class="tag tag-default">-</none>';}

        return`<tr data-id="${item.id}" data-name="${item['封样件名称']}">
            <td>${Utils.escapeHtml(item['序号']||'-')}</td><td>${Utils.escapeHtml(item['项目']||'-')}</td>
            <td><strong>${Utils.escapeHtml(item['封样件名称']||'-')}</strong></td>
            <td>${Utils.formatDate(item['有效期'])}</td>
            <td class="${daysCls}">${daysText}</td>
            <td>${evalTag}</td>
            <td>${canEvaluate?`<button class="btn btn-sm btn-outline" style="border-color:${st.text==='已过期'?'var(--danger)':'#E74600'};color:${st.text==='已过期'?'var(--danger)':'#E74600'};" onclick="openEvalDialog(${item.id},'${escapeAttr(item['封样件名称'])}')">发起评定</button>`:'-'}</td>
        </tr>`;
    }).join('');
    document.getElementById('eval-pagination').innerHTML=Utils.generatePagination(total,_evalPage,_evalPageSize);
}

function escapeAttr(s){return(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');}

window.openEvalDialog=async(id,name)=>{
    const r=await API.get(`/seal-samples/${id}`);
    if(!r||!r.success)return;
    const item=r.data;
    const infoHtml=`<div class="info-display-box">
        <div class="info-row">
            <div class="info-item"><div class="info-label">项目</div><div class="info-value">${Utils.escapeHtml(item['项目']||'-')}</div></div>
            <div class="info-item"><div class="info-label">封样件名称</div><div class="info-value">${Utils.escapeHtml(item['封样件名称']||'-')}</div></div>
            <div class="info-item"><div class="info-label">签署人</div><div class="info-value">${item['签署人']||'-'}</div></div>
        </div>
        <div class="info-row">
            <div class="info-item"><div class="info-label">有效期至</div><div class="info-value">${Utils.formatDate(item['有效期'])}</div></div>
            <div class="info-item"><div class="info-label">当前状态</div><div class="info-value"><span class="tag ${Utils.getStatusTag(item['状态']).cls}">${Utils.getStatusTag(item['状态']).text}</span></div></div>
        </div>
    </div>`;
    
    const bodyHtml=`
        ${infoHtml}
        <div class="radio-group" id="eval-radio-group">
            <div class="radio-card selected" data-val="pass" onclick="selectEvalResult(this,'pass')">
                <div class="radio-card-left-bar"></div>
                <div class="radio-card-title">✓ 合格 - 续期</div>
                <div class="radio-card-desc">填写新有效期后继续使用</div>
            </div>
            <div class="radio-card" data-val="fail" onclick="selectEvalResult(this,'fail')">
                <div class="radio-card-left-bar"></div>
                <div class="radio-card-title">✗ 不合格 - 报废</div>
                <div class="radio-card-desc">填写报废原因后锁定该记录</div>
            </div>
        </div>
        <div id="eval-pass-area" class="eval-condition-area show eval-pass-area">
            <div class="form-group"><label class="form-label required">新有效期截止日</label><input type="date" name="newExpiry" class="form-input" required min="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label class="form-label">评定说明</label><textarea name="passNote" class="form-textarea" rows="2" placeholder="可选填写"></textarea></div>
        </div>
        <div id="eval-fail-area" class="eval-condition-area eval-fail-area">
            <div class="form-group"><label class="form-label required">报废原因</label><textarea name="scrapReason" class="form-textarea" rows="3" placeholder="详细说明不合格原因" required></textarea></div>
            <div class="form-group"><label class="form-label required">报废类型</label>
                <select name="scrapType" class="form-select" required>
                    <option value="">请选择</option>
                    <option value="自然老化">自然老化</option>
                    <option value="质量异常">质量异常</option>
                    <option value="损坏丢失">损坏丢失</option>
                    <option value="其他">其他</option>
                </select>
            </div>
            <div class="alert alert-error">⚠️ 警告：报废后此封样件将被锁定，无法进行任何后续操作！</div>
        </div>`;

    UI.Modal.show({
        title:'封样件内部评定',content:bodyHtml,width:'wide',
        footerHtml:`<span id="eval-hint" style="color:var(--text-secondary);font-size:12px;"></span>
                   <button class="btn btn-outline" onclick="UI.Modal.close()">取消</button>
                   <button class="btn btn-primary" id="eval-submit-btn" onclick="submitEvaluation(${id},'seal')">提交评定</button>`
    });

    // 默认选中合格
    window._selectedEvalResult='pass';
};

window.selectEvalResult=(el,val)=>{
    window._selectedEvalResult=val;
    document.querySelectorAll('#eval-radio-group .radio-card').forEach(c=>{c.classList.remove('selected','selected-danger');});
    el.classList.add(val==='pass'?'selected':'selected-danger');
    document.querySelectorAll('#eval-radio-group .radio-card .radio-card-left-bar').forEach(b=>b.style.background='transparent');
    el.querySelector('.radio-card-left-bar').style.background=val==='pass'?'var(--success)':'var(--danger)';
    
    const passArea=document.getElementById('eval-pass-area');
    const failArea=document.getElementById('eval-fail-area');
    if(val==='pass'){passArea.classList.add('show');failArea.classList.remove('show');}
    else{passArea.classList.remove('show');failArea.classList.add('show');}
    
    // 更新按钮颜色
    const submitBtn=document.getElementById('eval-submit-btn');
    if(submitBtn){
        submitBtn.className=`btn btn-lg ${val==='pass'?'btn-primary':'btn-danger'}`;
        submitBtn.textContent=val==='pass'?'提交（合格续期）':'提交（不合格报废）';
    }
};

window.submitEvaluation=async(id,itemType)=>{
    const resultType=window._selectedEvalResult;
    
    if(resultType==='pass'){
        const newExp=document.querySelector('[name=newExpiry]')?.value;
        if(!newExp){UI.Toast?.warning('请选择新有效期');return;}

        const r=await API.post('/evaluations',{
            item_type:itemType,item_id:id,result:'pass',
            新有效期截止日:newExp, 评定说明:document.querySelector('[name=passNote]')?.value||''
        });
        if(r&&r.success){UI.Modal.close();UI.Toast.success('评定成功：已续期');loadEvaluations(1,_currentEvalTab);if(window.loadSealSamples)window.loadSealSamples(window._sealPage||1);}
        else if(r)UI.Toast.error(r.message);
    } else {
        const reason=document.querySelector('[name=scrapReason]')?.value;
        const typeVal=document.querySelector('[name=scrapType]')?.value;
        if(!reason||!typeVal){UI.Toast?.warning('请完整填写报废信息');return;}
        
        const ok=await UI.Confirm.show('确定执行报废操作？此操作不可逆。','二次确认','danger');
        if(!ok)return;
        
        const scrapR=await API.post('/scrap',{item_type:itemType,item_id:id,报废原因:reason,报废类型:typeVal});
        if(scrapR&&scrapR.success){UI.Modal.close();UI.Toast.success('已报废');loadEvaluations(1,_currentEvalTab);if(window.loadSealSamples)window.loadSealSamples(window._sealPage||1);}
        else if(scrapR)UI.Toast.error(scrapR.message);
    }
};

// Tab切换 — 手动绑定确保动态加载下可靠
(function initSealEval(){
    const fn=function(){
        // 手动绑定tab点击事件
        const tabs=document.querySelectorAll('#eval-tabs .tab-item');
        tabs.forEach(t=>{
            t.onclick=function(e){e.preventDefault();switchEvalTab(this.dataset.tab||'all');};
        });
        
        if(document.getElementById('eval-tbody'))loadEvaluations(1,'all');
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn();
})();
